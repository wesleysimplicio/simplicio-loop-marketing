/**
 * journal.ts — durable attempt memory + stall detector for the loop.
 *
 * Minimal TypeScript port of simplicio-loop's loop_journal.py: every
 * attempt is appended to `.simplicio/loop/journal.hbp` (schema
 * `marketing-loop-state/v1`) with a STABLE fingerprint of the failure —
 * volatile fragments (timestamps, tmp paths, hex ids, line numbers) are
 * normalized away so the SAME failure hashes the SAME across turns.
 *
 * Verdicts: an item is STALLED when its last K attempts share one failure
 * fingerprint — the loop then SKIPS it (switch strategy / hand off to a
 * human) instead of burning tokens re-deriving a known failure.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { runId } from "../observability/events";
import { appendHbp, readHbp } from "../formats/binary";

export const JOURNAL_SCHEMA = "marketing-loop-state/v1";
export const DEFAULT_STALL_K = 3;

export type Gate = "pass" | "fail" | "blocked" | "skipped";

export interface JournalRecord {
  schema: typeof JOURNAL_SCHEMA;
  ts: string;
  run_id: string;
  item_id: string;
  client?: string;
  campaign?: string;
  date?: string;
  attempt: number;
  action: string;
  gate: Gate;
  fingerprint: string | null;
  note?: string;
  stage?: "copy" | "creative" | "critic" | "compliance" | "watcher-gate" | "tech-specs";
  strategy?: string;
  provider?: string;
  cost_estimate?: number;
}

export interface ItemVerdict {
  item_id: string;
  verdict: "PROGRESS" | "STALLED";
  attempts: number;
  distinct_fingerprints: number;
  last_fingerprint: string | null;
  last_gate: Gate | null;
}

export function journalPath(root: string): string {
  return resolve(root, ".simplicio", "loop", "journal.hbp");
}

function engineRoot(root: string): string {
  const nested = resolve(root, ".marketing-engine");
  return existsSync(nested) ? nested : root;
}

export function pieceJournalPath(
  root: string,
  client: string,
  date: string,
  itemId: string,
): string {
  return resolve(engineRoot(root), "outputs", client, date.slice(0, 10), itemId, "journal.hbp");
}

/**
 * Stable failure fingerprint: normalize away line/column numbers, absolute
 * paths, hex ids, timestamps and durations before hashing, so retries of
 * the same failure collide and genuinely different failures do not.
 */
export function fingerprint(failureText: string): string {
  const normalized = failureText
    .toLowerCase()
    .replace(/\d{4}-\d{2}-\d{2}t[\d:.]+z?/g, "<ts>")
    .replace(/(^|[\s("'`])\/[^\s:"'`)]+/g, "$1<path>")
    .replace(/\b[0-9a-f]{8,}\b/g, "<hex>")
    .replace(/:\d+(:\d+)?\b/g, ":<n>")
    .replace(/\b\d+(\.\d+)?(ms|s)\b/g, "<dur>")
    .replace(/\b\d+\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export interface RecordAttemptInput {
  item_id: string;
  client?: string;
  campaign?: string;
  date?: string;
  attempt: number;
  action: string;
  gate: Gate;
  /** Raw failure text — fingerprinted; omit for pass/skipped. */
  failure_text?: string;
  fingerprint_override?: string | null;
  note?: string;
  stage?: JournalRecord["stage"];
  strategy?: string;
  provider?: string;
  cost_estimate?: number;
}

/** Append one attempt. Fail-open: returns null on write trouble. */
export function recordAttempt(
  root: string,
  input: RecordAttemptInput,
): JournalRecord | null {
  const rec: JournalRecord = {
    schema: JOURNAL_SCHEMA,
    ts: new Date().toISOString(),
    run_id: runId(),
    item_id: input.item_id,
    ...(input.client !== undefined && { client: input.client }),
    ...(input.campaign !== undefined && { campaign: input.campaign }),
    ...(input.date !== undefined && { date: input.date.slice(0, 10) }),
    attempt: input.attempt,
    action: input.action,
    gate: input.gate,
    fingerprint: input.fingerprint_override !== undefined
      ? input.fingerprint_override
      : input.failure_text
        ? fingerprint(input.failure_text)
        : null,
    ...(input.note !== undefined && { note: input.note }),
    ...(input.stage !== undefined && { stage: input.stage }),
    ...(input.strategy !== undefined && { strategy: input.strategy }),
    ...(input.provider !== undefined && { provider: input.provider }),
    ...(input.cost_estimate !== undefined && { cost_estimate: input.cost_estimate }),
  };
  try {
    const globalPath = journalPath(root);
    appendHbp(globalPath, rec);
    if (input.client && input.date) {
      const piecePath = pieceJournalPath(root, input.client, input.date, input.item_id);
      appendHbp(piecePath, rec);
    }
    return rec;
  } catch {
    return null;
  }
}

export const STRATEGY_LADDER = ["rewrite-hook", "change-format", "change-provider", "human-review"] as const;
export type Strategy = (typeof STRATEGY_LADDER)[number];

/** Pick a new provider-neutral strategy after a repeated gate failure. */
export function strategyForAttempt(attempt: number): Strategy {
  return STRATEGY_LADDER[Math.min(Math.max(attempt - 1, 0), STRATEGY_LADDER.length - 1)];
}

export function nextStrategy(root: string, itemId: string, k = DEFAULT_STALL_K): Strategy {
  const attempts = readJournal(root).filter((r) => r.item_id === itemId && r.gate !== "skipped");
  const last = attempts.at(-1);
  if (!last || last.gate === "pass") return STRATEGY_LADDER[0];
  const verdict = itemVerdict(root, itemId, k);
  return verdict.verdict === "STALLED" ? STRATEGY_LADDER[Math.min(attempts.length, STRATEGY_LADDER.length - 1)] : strategyForAttempt(attempts.length + 1);
}

export function readJournal(root: string): JournalRecord[] {
  const path = journalPath(root);
  if (!existsSync(path)) return [];
  try { return readHbp<JournalRecord>(path).filter((rec) => rec.schema === JOURNAL_SCHEMA); }
  catch { return []; }
}

/**
 * PROGRESS vs STALLED for one item: STALLED when the last K attempts all
 * failed with the SAME fingerprint. A pass or a fingerprint change resets
 * the streak — the loop is learning, not oscillating.
 */
export function itemVerdict(
  root: string,
  itemId: string,
  k = DEFAULT_STALL_K,
): ItemVerdict {
  const attempts = readJournal(root).filter(
    (r) => r.item_id === itemId && r.gate !== "skipped",
  );
  const verdict: ItemVerdict = {
    item_id: itemId,
    verdict: "PROGRESS",
    attempts: attempts.length,
    distinct_fingerprints: new Set(
      attempts.map((r) => r.fingerprint).filter(Boolean),
    ).size,
    last_fingerprint: attempts.at(-1)?.fingerprint ?? null,
    last_gate: attempts.at(-1)?.gate ?? null,
  };
  if (attempts.length < k) return verdict;
  const window = attempts.slice(-k);
  const allFailed = window.every((r) => r.gate === "fail" || r.gate === "blocked");
  const fps = new Set(window.map((r) => r.fingerprint ?? "none"));
  if (allFailed && fps.size === 1) {
    verdict.verdict = "STALLED";
  }
  return verdict;
}

/** Next attempt number for an item (1-based). */
export function nextAttempt(root: string, itemId: string): number {
  return (
    readJournal(root).filter((r) => r.item_id === itemId && r.gate !== "skipped")
      .length + 1
  );
}

/** Deterministic sample record for the contract fixture (gen-fixtures.mjs). */
export function produceLoopStateFixture(): JournalRecord {
  return {
    schema: JOURNAL_SCHEMA,
    ts: "1970-01-01T00:00:00.000Z",
    run_id: "run-fixture",
    item_id: "PIECE-fixture-001",
    attempt: 1,
    action: "generate",
    gate: "fail",
    fingerprint: fingerprint("provider timeout after 10s at /tmp/x:42"),
    note: "fixture",
  };
}
