/**
 * savings.ts — auditable token-savings ledger for the marketing engine.
 *
 * Port of the simplicio-mapper savings pattern (`simplicio.savings-event/v1`):
 * every time the engine avoids LLM work (manifest reuse, cached artifact,
 * native delegation) it appends a hash-chained JSONL receipt.
 *
 * Honesty discipline (anti-Goodhart, non-negotiable):
 *  - `proof.kind` is always `"estimated"` here — nothing in this module
 *    measures real provider token counts, so it never claims "measured";
 *  - the `estimator` is labeled (`heuristic:chars-div-4`) so numbers from
 *    different estimators are never silently mixed;
 *  - no measured economy → no savings line (callers only append on a real
 *    reuse event, never to inflate totals).
 *
 * The simplicio-cli runtime owns `.simplicio/ledger/savings-events.jsonl`
 * with its own hash chain; this module NEVER appends there. The engine
 * writes its own chain to `.simplicio/ledger/marketing-savings-events.jsonl`
 * so neither producer can corrupt the other's chain.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";

export const SAVINGS_SCHEMA = "simplicio.savings-event/v1";
export const ESTIMATOR = "heuristic:chars-div-4";

export interface SavingsEvent {
  schema: typeof SAVINGS_SCHEMA;
  event_id: string;
  ts: string;
  source: string;
  estimator: typeof ESTIMATOR;
  surfaces: string[];
  tokens: {
    baseline_total: number;
    actual_total: number;
    saved_total: number;
    pct_saved: number;
  };
  proof: {
    kind: "estimated";
    methodology: string;
  };
  piece_id?: string;
  note?: string;
  prev_event_hash: string | null;
  event_hash: string;
}

export interface AppendSavingsInput {
  /** What produced the saving, e.g. "loop:manifest-reuse". */
  source: string;
  /** Capability surfaces involved, e.g. ["generate", "cache"]. */
  surfaces: string[];
  tokens: { baseline_total: number; actual_total: number };
  /** How the baseline was derived — shown verbatim in the receipt. */
  methodology: string;
  piece_id?: string;
  note?: string;
}

export function marketingLedgerPath(root: string): string {
  return resolve(root, ".simplicio", "ledger", "marketing-savings-events.jsonl");
}

/** Estimate tokens for a text with the labeled stdlib heuristic (~4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
  return `{${entries.join(",")}}`;
}

function chainTail(path: string): string | null {
  if (!existsSync(path)) return null;
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  const lines = text.trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const rec = JSON.parse(lines[i]) as SavingsEvent;
      if (typeof rec.event_hash === "string") return rec.event_hash;
    } catch {
      continue;
    }
  }
  return null;
}

function runLogDisabled(): boolean {
  return process.env.SIMPLICIO_DISABLE_RUN_LOG === "1";
}

/**
 * Append a savings receipt to the engine's hash-chained ledger.
 * Fail-open: a write failure returns null and never propagates.
 */
export function appendSavingsEvent(
  root: string,
  input: AppendSavingsInput,
): SavingsEvent | null {
  if (runLogDisabled()) return null;
  const baseline = Math.max(0, Math.round(input.tokens.baseline_total));
  const actual = Math.max(0, Math.round(input.tokens.actual_total));
  const saved = Math.max(0, baseline - actual);
  const pct = baseline > 0 ? Math.round((saved / baseline) * 1000) / 10 : 0;
  try {
    const path = marketingLedgerPath(root);
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const prev = chainTail(path);
    const body = {
      schema: SAVINGS_SCHEMA as typeof SAVINGS_SCHEMA,
      event_id: randomBytes(12).toString("hex"),
      ts: new Date().toISOString(),
      source: input.source,
      estimator: ESTIMATOR as typeof ESTIMATOR,
      surfaces: input.surfaces,
      tokens: {
        baseline_total: baseline,
        actual_total: actual,
        saved_total: saved,
        pct_saved: pct,
      },
      proof: {
        kind: "estimated" as const,
        methodology: input.methodology,
      },
      ...(input.piece_id !== undefined && { piece_id: input.piece_id }),
      ...(input.note !== undefined && { note: input.note }),
      prev_event_hash: prev,
    };
    const event_hash = createHash("sha256")
      .update(canonicalJson(body))
      .digest("hex");
    const event: SavingsEvent = { ...body, event_hash };
    appendFileSync(path, `${JSON.stringify(event)}\n`, "utf8");
    return event;
  } catch {
    return null;
  }
}

export interface ChainVerification {
  ok: boolean;
  count: number;
  broken_at?: number;
  reason?: string;
}

/** Verify the ledger's hash chain (recomputed hashes + prev linkage). */
export function verifyChain(root: string): ChainVerification {
  const path = marketingLedgerPath(root);
  if (!existsSync(path)) return { ok: true, count: 0 };
  const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
  let prev: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    let rec: SavingsEvent;
    try {
      rec = JSON.parse(lines[i]) as SavingsEvent;
    } catch {
      return { ok: false, count: i, broken_at: i, reason: "unparseable line" };
    }
    if (rec.prev_event_hash !== prev) {
      return { ok: false, count: i, broken_at: i, reason: "prev_event_hash mismatch" };
    }
    const { event_hash, ...body } = rec;
    const recomputed = createHash("sha256")
      .update(canonicalJson(body))
      .digest("hex");
    if (recomputed !== event_hash) {
      return { ok: false, count: i, broken_at: i, reason: "event_hash mismatch" };
    }
    prev = event_hash;
  }
  return { ok: true, count: lines.length };
}

export interface SavingsSummary {
  path: string;
  count: number;
  saved_total: number;
  baseline_total: number;
  by_source: Record<string, { count: number; saved: number }>;
  chain: ChainVerification;
}

/** Aggregate the engine ledger for doctor-style reporting. */
export function savingsSummary(root: string): SavingsSummary {
  const path = marketingLedgerPath(root);
  const summary: SavingsSummary = {
    path,
    count: 0,
    saved_total: 0,
    baseline_total: 0,
    by_source: {},
    chain: verifyChain(root),
  };
  if (!existsSync(path)) return summary;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line) as SavingsEvent;
      if (rec.schema !== SAVINGS_SCHEMA) continue;
      summary.count++;
      summary.saved_total += rec.tokens.saved_total;
      summary.baseline_total += rec.tokens.baseline_total;
      const bucket = summary.by_source[rec.source] ?? { count: 0, saved: 0 };
      bucket.count++;
      bucket.saved += rec.tokens.saved_total;
      summary.by_source[rec.source] = bucket;
    } catch {
      continue;
    }
  }
  return summary;
}
