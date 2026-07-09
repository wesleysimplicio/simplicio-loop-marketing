/**
 * events.ts — two-track observability for the marketing engine.
 *
 * Port of the simplicio-dev-cli observability contract
 * (`simplicio.dev-cli-event/v1`) to the marketing domain:
 *
 *  - stdout stays reserved for machine payloads (the command's result);
 *  - every event writes a human line to stderr AND, when a root is given,
 *    a versioned JSONL record to `<root>/.simplicio/events.jsonl`
 *    (schema `marketing-event/v1`) that an orchestrating loop can consume;
 *  - rotation at 10 MB (rename to `.1`), kill-switch
 *    `SIMPLICIO_DISABLE_RUN_LOG=1`, and fail-open: a logging failure never
 *    propagates into the pipeline.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";

export const EVENT_SCHEMA = "marketing-event/v1";

function maxBytes(): number {
  const v = Number(process.env.SIMPLICIO_EVENTS_MAX_BYTES);
  return Number.isFinite(v) && v > 0 ? v : 10 * 1024 * 1024;
}

/** Suggested (not closed) event kinds — mirrors the dev-cli EVENT_TYPES. */
export type EventKind =
  | "loop_start"
  | "loop_iteration"
  | "loop_complete"
  | "piece_start"
  | "piece_advanced"
  | "gate_pass"
  | "gate_fail"
  | "manifest_written"
  | "promote_decision"
  | "publish_attempt"
  | "publish_verified"
  | "stall_detected"
  | "native_delegation"
  | (string & {});

export interface MarketingEvent {
  schema: typeof EVENT_SCHEMA;
  ts: string;
  run_id: string;
  kind: EventKind;
  level: "info" | "warn" | "error";
  piece_id?: string;
  client?: string;
  provider?: string;
  phase?: string;
  verdict?: string;
  data?: Record<string, unknown>;
}

export interface EmitEventInput {
  kind: EventKind;
  level?: "info" | "warn" | "error";
  piece_id?: string;
  client?: string;
  provider?: string;
  phase?: string;
  verdict?: string;
  data?: Record<string, unknown>;
}

/** One run_id per process — lets a consumer group events by invocation. */
const RUN_ID = `run-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;

export function runId(): string {
  return RUN_ID;
}

export function eventsPath(root: string): string {
  return resolve(root, ".simplicio", "events.jsonl");
}

function runLogDisabled(): boolean {
  return process.env.SIMPLICIO_DISABLE_RUN_LOG === "1";
}

function humanLine(ev: MarketingEvent): string {
  const parts = [`[${ev.kind}]`];
  if (ev.piece_id) parts.push(ev.piece_id);
  if (ev.phase) parts.push(`phase=${ev.phase}`);
  if (ev.verdict) parts.push(`verdict=${ev.verdict}`);
  if (ev.provider) parts.push(`provider=${ev.provider}`);
  return parts.join(" ");
}

function rotateIfNeeded(path: string): void {
  try {
    if (existsSync(path) && statSync(path).size >= maxBytes()) {
      renameSync(path, `${path}.1`);
    }
  } catch {
    // fail-open: rotation trouble must not block the event append
  }
}

/**
 * Emit an event: human line on stderr, JSONL record under the root.
 * Never throws — observability failures must not break the pipeline.
 */
export function emitEvent(root: string | undefined, input: EmitEventInput): MarketingEvent {
  const ev: MarketingEvent = {
    schema: EVENT_SCHEMA,
    ts: new Date().toISOString(),
    run_id: RUN_ID,
    kind: input.kind,
    level: input.level ?? "info",
    ...(input.piece_id !== undefined && { piece_id: input.piece_id }),
    ...(input.client !== undefined && { client: input.client }),
    ...(input.provider !== undefined && { provider: input.provider }),
    ...(input.phase !== undefined && { phase: input.phase }),
    ...(input.verdict !== undefined && { verdict: input.verdict }),
    ...(input.data !== undefined && { data: input.data }),
  };
  try {
    process.stderr.write(`${humanLine(ev)}\n`);
  } catch {
    // stderr closed — keep going
  }
  if (root && !runLogDisabled()) {
    try {
      const path = eventsPath(root);
      const dir = dirname(path);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      rotateIfNeeded(path);
      appendFileSync(path, `${JSON.stringify(ev)}\n`, "utf8");
    } catch {
      // fail-open
    }
  }
  return ev;
}

export interface EventsSummary {
  path: string;
  count: number;
  by_kind: Record<string, number>;
  by_level: Record<string, number>;
  last: MarketingEvent[];
}

/** Aggregate the event stream for doctor-style reporting. */
export function eventsSummary(root: string, lastN = 5): EventsSummary {
  const path = eventsPath(root);
  const summary: EventsSummary = {
    path,
    count: 0,
    by_kind: {},
    by_level: {},
    last: [],
  };
  if (!existsSync(path)) return summary;
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return summary;
  }
  const events: MarketingEvent[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line) as MarketingEvent;
      if (ev.schema !== EVENT_SCHEMA) continue;
      events.push(ev);
    } catch {
      continue;
    }
  }
  summary.count = events.length;
  for (const ev of events) {
    summary.by_kind[ev.kind] = (summary.by_kind[ev.kind] ?? 0) + 1;
    summary.by_level[ev.level] = (summary.by_level[ev.level] ?? 0) + 1;
  }
  summary.last = events.slice(-lastN);
  return summary;
}
