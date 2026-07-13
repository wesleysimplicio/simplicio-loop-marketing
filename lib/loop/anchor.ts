import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const ANCHOR_SCHEMA = "marketing-campaign-anchor/v1";

export interface Acceptance {
  id: string;
  description: string;
}

export interface AnchorInput {
  client: string;
  campaign: string;
  allowed_channels: string[];
  primary_kpi: string;
  dry_run: boolean;
  piece_acceptance: Acceptance[];
}

export interface Anchor extends AnchorInput {
  schema: typeof ANCHOR_SCHEMA;
  anchor_id: string;
  created_at: string;
  status_events: AnchorEvent[];
}

export interface AnchorEvent {
  at: string;
  kind: "created" | "human_override" | "gate";
  status: "open" | "blocked" | "complete";
  reason?: string;
}

export interface AnchorCheck {
  drift: string[];
  ok: boolean;
}

export interface AnchorGate {
  pass: boolean;
  status: "blocked" | "complete";
  unverified: string[];
  override_logged: boolean;
}

export function anchorPath(root: string, client: string, campaign: string): string {
  return resolve(root, "outputs", client, campaign, "anchor.json");
}

function required(value: string, name: string): string {
  if (!value.trim()) throw new Error(`anchor: ${name} is required`);
  return value.trim();
}

function stableId(client: string, campaign: string): string {
  return `anchor-${createHash("sha256").update(`${client}\0${campaign}`).digest("hex").slice(0, 16)}`;
}

function validateInput(input: AnchorInput): void {
  required(input.client, "client");
  required(input.campaign, "campaign");
  required(input.primary_kpi, "primary_kpi");
  if (!input.allowed_channels.length || input.allowed_channels.some((v) => !v.trim())) {
    throw new Error("anchor: allowed_channels must contain at least one non-empty channel");
  }
  if (!input.piece_acceptance.length || input.piece_acceptance.some((a) => !a.id.trim() || !a.description.trim())) {
    throw new Error("anchor: piece_acceptance must contain id and description");
  }
}

export function createAnchor(root: string, input: AnchorInput, now = new Date().toISOString()): Anchor {
  validateInput(input);
  const path = anchorPath(root, input.client, input.campaign);
  if (existsSync(path)) throw new Error(`anchor: already exists at ${path}`);
  const anchor: Anchor = {
    schema: ANCHOR_SCHEMA,
    ...input,
    client: input.client.trim(),
    campaign: input.campaign.trim(),
    allowed_channels: [...new Set(input.allowed_channels.map((v) => v.trim()))].sort(),
    primary_kpi: input.primary_kpi.trim(),
    piece_acceptance: input.piece_acceptance.map((a) => ({ id: a.id.trim(), description: a.description.trim() })),
    anchor_id: stableId(input.client.trim(), input.campaign.trim()),
    created_at: now,
    status_events: [{ at: now, kind: "created", status: "open" }],
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(anchor, null, 2)}\n`, "utf8");
  return anchor;
}

export function readAnchor(root: string, client: string, campaign: string): Anchor {
  const value = JSON.parse(readFileSync(anchorPath(root, client, campaign), "utf8")) as Anchor;
  if (value.schema !== ANCHOR_SCHEMA) throw new Error("anchor: unsupported schema");
  return value;
}

export function checkAnchor(anchor: Anchor, current: { channels?: string[]; primary_kpi?: string }): AnchorCheck {
  const drift: string[] = [];
  for (const channel of current.channels ?? []) {
    if (!anchor.allowed_channels.includes(channel)) drift.push(`channel-out-of-plan:${channel}`);
  }
  if (current.primary_kpi !== undefined && current.primary_kpi !== anchor.primary_kpi) {
    drift.push(`primary-kpi-changed:${current.primary_kpi}`);
  }
  return { drift, ok: drift.length === 0 };
}

export function gateAnchor(
  root: string,
  client: string,
  campaign: string,
  statuses: Record<string, boolean>,
  override?: { reason: string; at?: string },
): AnchorGate {
  const anchor = readAnchor(root, client, campaign);
  const unverified = anchor.piece_acceptance.filter((a) => statuses[a.id] !== true).map((a) => a.id);
  if (unverified.length && !override) {
    anchor.status_events.push({
      at: new Date().toISOString(),
      kind: "gate",
      status: "blocked",
      reason: `unverified:${unverified.join(",")}`,
    });
    writeFileSync(anchorPath(root, client, campaign), `${JSON.stringify(anchor, null, 2)}\n`, "utf8");
    return { pass: false, status: "blocked", unverified, override_logged: false };
  }
  if (unverified.length && !override?.reason?.trim()) throw new Error("anchor: human override requires a reason");
  const at = override?.at ?? new Date().toISOString();
  if (override && unverified.length) anchor.status_events.push({ at, kind: "human_override", status: "complete", reason: override.reason.trim() });
  anchor.status_events.push({ at, kind: "gate", status: "complete" });
  writeFileSync(anchorPath(root, client, campaign), `${JSON.stringify(anchor, null, 2)}\n`, "utf8");
  return { pass: true, status: "complete", unverified, override_logged: Boolean(override && unverified.length) };
}
