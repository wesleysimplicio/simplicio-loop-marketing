import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkAnchor, createAnchor, gateAnchor, readAnchor, type Acceptance } from "../loop/anchor";

interface ParsedArgs {
  client?: string;
  campaign?: string;
  channels: string[];
  primaryKpi?: string;
  dryRun: boolean;
  acceptance: Acceptance[];
  statuses: Record<string, boolean>;
  overrideReason?: string;
  at?: string;
}

function usage(): string {
  return [
    "anchor: usage:",
    "  marketing-engine anchor create --client <slug> --campaign <slug> --channels <csv> --primary-kpi <kpi> [--dry-run] --acceptance <id=description> [--acceptance ...]",
    "  marketing-engine anchor check --client <slug> --campaign <slug> [--channels <csv>] [--primary-kpi <kpi>]",
    "  marketing-engine anchor gate --client <slug> --campaign <slug> --status <id=true|false> [--status ...] [--override-reason <text>] [--at <iso>]",
    "  marketing-engine anchor selftest",
  ].join("\n");
}

function parseBool(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`anchor: invalid boolean '${value}'`);
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAcceptance(value: string): Acceptance {
  const idx = value.indexOf("=");
  if (idx <= 0 || idx === value.length - 1) throw new Error("anchor: acceptance must use id=description");
  return { id: value.slice(0, idx).trim(), description: value.slice(idx + 1).trim() };
}

function parseStatus(value: string): { id: string; ok: boolean } {
  const idx = value.indexOf("=");
  if (idx <= 0 || idx === value.length - 1) throw new Error("anchor: status must use id=true|false");
  return { id: value.slice(0, idx).trim(), ok: parseBool(value.slice(idx + 1)) };
}

function requireValue(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`anchor: missing --${name}`);
  return value.trim();
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { channels: [], dryRun: false, acceptance: [], statuses: {} };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--client" && argv[i + 1]) parsed.client = argv[++i];
    else if (arg === "--campaign" && argv[i + 1]) parsed.campaign = argv[++i];
    else if (arg === "--channels" && argv[i + 1]) parsed.channels.push(...parseList(argv[++i]));
    else if (arg === "--channel" && argv[i + 1]) parsed.channels.push(argv[++i].trim());
    else if (arg === "--primary-kpi" && argv[i + 1]) parsed.primaryKpi = argv[++i];
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg.startsWith("--dry-run=")) parsed.dryRun = parseBool(arg.slice("--dry-run=".length));
    else if (arg === "--acceptance" && argv[i + 1]) parsed.acceptance.push(parseAcceptance(argv[++i]));
    else if (arg === "--status" && argv[i + 1]) {
      const status = parseStatus(argv[++i]);
      parsed.statuses[status.id] = status.ok;
    } else if (arg === "--override-reason" && argv[i + 1]) parsed.overrideReason = argv[++i];
    else if (arg === "--at" && argv[i + 1]) parsed.at = argv[++i];
    else throw new Error(`anchor: unknown arg '${arg}'`);
  }
  parsed.channels = [...new Set(parsed.channels.map((item) => item.trim()).filter(Boolean))];
  return parsed;
}

function runSelftest(): void {
  const root = mkdtempSync(join(tmpdir(), "marketing-anchor-selftest-"));
  const anchor = createAnchor(root, {
    client: "acme",
    campaign: "launch",
    allowed_channels: ["instagram", "linkedin"],
    primary_kpi: "qualified_leads",
    dry_run: true,
    piece_acceptance: [{ id: "piece-1", description: "compliance and evidence pass" }],
  }, "2026-07-13T00:00:00.000Z");
  if (readAnchor(root, "acme", "launch").anchor_id !== anchor.anchor_id) throw new Error("anchor: selftest could not read created anchor");
  const drift = checkAnchor(anchor, { channels: ["reddit"], primary_kpi: "clicks" });
  if (drift.ok || !drift.drift.includes("channel-out-of-plan:reddit")) throw new Error("anchor: selftest drift detection failed");
  const blocked = gateAnchor(root, "acme", "launch", { "piece-1": false });
  if (blocked.pass || blocked.status !== "blocked") throw new Error("anchor: selftest blocked gate failed");
  const completed = gateAnchor(root, "acme", "launch", { "piece-1": false }, { reason: "approved by owner", at: "2026-07-13T00:01:00.000Z" });
  if (!completed.pass || !completed.override_logged) throw new Error("anchor: selftest override logging failed");
  process.stdout.write(`${JSON.stringify({ ok: true, command: "selftest" }, null, 2)}\n`);
}

export async function cliEntry(argv: string[]): Promise<void> {
  const sub = argv[0];
  if (!sub || sub === "help" || sub === "--help" || sub === "-h") {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (sub === "selftest") {
    runSelftest();
    return;
  }

  const args = parseArgs(argv.slice(1));
  const root = process.cwd();
  const client = requireValue(args.client, "client");
  const campaign = requireValue(args.campaign, "campaign");

  if (sub === "create") {
    const anchor = createAnchor(root, {
      client,
      campaign,
      allowed_channels: args.channels,
      primary_kpi: requireValue(args.primaryKpi, "primary-kpi"),
      dry_run: args.dryRun,
      piece_acceptance: args.acceptance,
    });
    process.stdout.write(`${JSON.stringify(anchor, null, 2)}\n`);
    return;
  }

  if (sub === "check") {
    const result = checkAnchor(readAnchor(root, client, campaign), {
      channels: args.channels.length ? args.channels : undefined,
      primary_kpi: args.primaryKpi,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exitCode = 2;
    return;
  }

  if (sub === "gate") {
    const result = gateAnchor(root, client, campaign, args.statuses, args.overrideReason ? { reason: args.overrideReason, at: args.at } : undefined);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.pass) process.exitCode = 2;
    return;
  }

  throw new Error(`anchor: unknown subcommand '${sub}'`);
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`${usage()}\n`);
    process.stderr.write(`anchor failed: ${String(err)}\n`);
    process.exit(1);
  });
}
