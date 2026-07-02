/**
 * campaign.ts — SaaS growth campaign loop (issue #53).
 *
 * Turns a CAMPAIGN.md brief (see .specs/strategy/CAMPAIGN-template.md) into
 * a queue of pieces tagged with channel/language/format metadata, enforces
 * organic-before-paid by default, and produces a campaign review summary
 * from the existing runtime logs (learnings.md, promotions.jsonl,
 * paid-promotion-attempts.jsonl).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getChannel } from "../channels/registry";

// ---------------------------------------------------------------------------
// Brief parsing
// ---------------------------------------------------------------------------

export interface CampaignBudgetPhase {
  name: string;
  weeks?: string;
  paid_amount: number;
  channels?: string[];
}

export interface CampaignDistribution {
  pillar: string;
  pieces: number;
}

export interface CampaignBrief {
  id: string;
  client_id: string;
  title: string;
  status: string;
  channels: { primary: string; secondary: string[]; test: string[] };
  budget: { total?: number; phases: CampaignBudgetPhase[] };
  pieces_per_week: number;
  distribution: CampaignDistribution[];
  organic_before_paid_override?: boolean;
}

function scalarOf(raw: string): string | number | undefined {
  const v = raw.trim();
  if (v === "" || v.startsWith("//")) return undefined;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v.replace(/^['"]|['"]$/g, "");
}

function listOf(raw: string): string[] {
  const v = raw.trim();
  if (!v.startsWith("[") || !v.endsWith("]")) return [];
  const inner = v.slice(1, -1).trim();
  if (!inner) return [];
  return inner
    .split(",")
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter((s) => s && !s.startsWith("//"));
}

/**
 * Extracts every fenced ```yaml block from the brief and parses the
 * flat/nested subset of YAML the campaign template actually uses
 * (scalars, inline lists, one level of nesting, and `- { a: b, c: d }`
 * list-of-maps entries for budget phases / distribution).
 */
export function parseCampaignBrief(text: string): CampaignBrief {
  const blocks = [...text.matchAll(/```yaml\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const flat: Record<string, unknown> = {};
  const phases: CampaignBudgetPhase[] = [];
  const distribution: CampaignDistribution[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    let currentParent: string | null = null;
    for (const rawLine of lines) {
      if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
      const indent = rawLine.length - rawLine.trimStart().length;
      const line = rawLine.trim();

      // list-of-maps entry: "- { name: x, paid_amount: 10 }"
      if (line.startsWith("- {") && line.endsWith("}")) {
        const inner = line.slice(3, -1);
        const entry: Record<string, unknown> = {};
        for (const pair of inner.split(",")) {
          const idx = pair.indexOf(":");
          if (idx === -1) continue;
          const k = pair.slice(0, idx).trim();
          const v = scalarOf(pair.slice(idx + 1));
          if (v !== undefined) entry[k] = v;
        }
        if (currentParent === "phases") {
          phases.push({
            name: String(entry.name ?? "unnamed"),
            weeks: entry.weeks ? String(entry.weeks) : undefined,
            paid_amount: Number(entry.paid_amount ?? 0),
            channels: undefined,
          });
        } else if (currentParent === "distribution") {
          distribution.push({
            pillar: String(entry.pillar ?? "general"),
            pieces: Number(entry.pieces ?? 0),
          });
        }
        continue;
      }

      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const rawVal = line.slice(colonIdx + 1).trim();

      if (rawVal === "") {
        currentParent = key;
        continue;
      }
      if (indent === 0) currentParent = null;

      if (key === "phases" || key === "distribution") {
        currentParent = key;
        continue;
      }

      const list = listOf(rawVal);
      const value = list.length > 0 || rawVal.startsWith("[") ? list : scalarOf(rawVal);
      const target = currentParent ? `${currentParent}.${key}` : key;
      flat[target] = value;
    }
  }

  return {
    id: String(flat.id ?? ""),
    client_id: String(flat.client_id ?? ""),
    title: String(flat.title ?? ""),
    status: String(flat.status ?? "planning"),
    channels: {
      primary: String(flat["channels.primary"] ?? ""),
      secondary: Array.isArray(flat["channels.secondary"]) ? (flat["channels.secondary"] as string[]) : [],
      test: Array.isArray(flat["channels.test"]) ? (flat["channels.test"] as string[]) : [],
    },
    budget: {
      total: flat["budget.total"] !== undefined ? Number(flat["budget.total"]) : undefined,
      phases,
    },
    pieces_per_week: Number(flat.pieces_per_week ?? 0),
    distribution,
  };
}

export function loadCampaignBrief(path: string): CampaignBrief {
  return parseCampaignBrief(readFileSync(path, "utf8"));
}

// ---------------------------------------------------------------------------
// Piece queue
// ---------------------------------------------------------------------------

export interface QueuedPiece {
  campaign_id: string;
  pillar: string;
  channel_id: string;
  language: string;
  format: string;
  phase: "organic" | "paid";
}

function formatForChannel(channelId: string): string {
  const channel = getChannel(channelId);
  if (!channel) return "post";
  return channel.allowed_content_types[0] ?? "post";
}

/**
 * Expands a campaign's pillar distribution across its primary + secondary
 * channels, English-first (primary channel first), tagged organic — paid
 * pieces are only queued once `organicPhaseActive` is false for the brief.
 */
export function planPieceQueue(brief: CampaignBrief): QueuedPiece[] {
  const channelIds = [brief.channels.primary, ...brief.channels.secondary].filter(Boolean);
  const queue: QueuedPiece[] = [];
  for (const dist of brief.distribution) {
    for (const channelId of channelIds) {
      const channel = getChannel(channelId);
      queue.push({
        campaign_id: brief.id,
        pillar: dist.pillar,
        channel_id: channelId,
        language: channel?.language ?? "en",
        format: formatForChannel(channelId),
        phase: "organic",
      });
    }
  }
  return queue;
}

/**
 * Organic phase runs before paid ramp by default. A campaign may only skip
 * straight to paid via an explicit `organic_before_paid_override: true` —
 * mirrors the human-override pattern used by the compliance gates.
 */
export function organicPhaseActive(brief: CampaignBrief): boolean {
  if (brief.organic_before_paid_override) return false;
  const firstPaidPhase = brief.budget.phases.find((p) => p.paid_amount > 0);
  return firstPaidPhase !== undefined;
}

// ---------------------------------------------------------------------------
// Campaign review
// ---------------------------------------------------------------------------

export interface CampaignReviewSummary {
  campaign_id: string;
  winners: number;
  losers: number;
  spend_usd: number;
  lessons: string[];
  next_actions: string[];
}

function engineRoot(root: string): string {
  const nested = resolve(root, ".marketing-engine");
  return existsSync(nested) ? nested : root;
}

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const out: T[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      // skip malformed lines
    }
  }
  return out;
}

export function reviewCampaign(root: string, campaignId: string): CampaignReviewSummary {
  const dataRoot = resolve(engineRoot(root), "data");
  const promotions = readJsonl<{ piece_id: string; campaign_id?: string }>(
    resolve(dataRoot, "promotions.jsonl"),
  );
  const attempts = readJsonl<{ daily_budget_usd?: number; guardrails?: { max_daily_spend_usd: number } }>(
    resolve(dataRoot, "paid-promotion-attempts.jsonl"),
  );
  const learningsPath = resolve(dataRoot, "learnings.md");
  const learnings = existsSync(learningsPath)
    ? readFileSync(learningsPath, "utf8").split("\n").filter((l) => l.trim().startsWith("-"))
    : [];

  const spend = attempts.reduce((sum, a) => sum + (a.daily_budget_usd ?? 0), 0);

  return {
    campaign_id: campaignId,
    winners: promotions.length,
    losers: learnings.length,
    spend_usd: spend,
    lessons: learnings,
    next_actions:
      promotions.length > 0
        ? [`Review ${promotions.length} promoted piece(s) for a paid-ramp candidate`]
        : ["No winners yet — keep the organic phase running before considering paid ramp"],
  };
}
