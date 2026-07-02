/**
 * board.ts — Yool tuple-space blackboard for the marketing loop (issue #59).
 *
 * Spec: https://github.com/wesleysimplicio/yool-tuple-hamt (v0.2), and the
 * "yool / tuple / HAMT" + "Universal Long-Running Agent Overlay" sections of
 * CLAUDE.md. Large-scale autonomous work is represented as logical tuples
 * on this board, not as thousands of real OS processes — a small governed
 * pool of workers drains the board by lane.
 *
 * Persistence model: tuples are event-sourced as an append-only JSONL log
 * (data/yool/tuples.jsonl). Appending a small line is effectively
 * serialized at the OS level, which satisfies "writes are serialized";
 * reading/folding the log to current state has no side effects and any
 * number of callers can do it concurrently ("reads/checks/evidence run in
 * parallel").
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type TupleClass =
  | "campaign.root"
  | "piece.plan"
  | "piece.copy"
  | "piece.creative"
  | "piece.compliance"
  | "publish.dry_run"
  | "publish.ready_for_review"
  | "metrics.snapshot"
  | "winner.promote"
  | "loser.learning"
  | "reply.required"
  | "budget.guardrail"
  | "human.approval_required";

export type TupleStatus = "pending" | "in_progress" | "blocked" | "done";

export type WorkerLane =
  | "discovery"
  | "strategy"
  | "copy"
  | "creative"
  | "compliance"
  | "publish"
  | "analytics"
  | "paid-growth"
  | "community-replies"
  | "evidence"
  | "budget-guardian";

export interface Tuple {
  id: string;
  class: TupleClass;
  status: TupleStatus;
  owner?: string;
  lane?: WorkerLane;
  evidence_path?: string;
  next_action?: string;
  payload?: Record<string, unknown>;
  updated_at: string;
}

function boardPath(root: string): string {
  return resolve(root, "data", "yool", "tuples.jsonl");
}

/** Append a tuple event. Last event per id wins when the log is folded. */
export function writeTuple(root: string, tuple: Omit<Tuple, "updated_at">): Tuple {
  const path = boardPath(root);
  if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
  const record: Tuple = { ...tuple, updated_at: new Date().toISOString() };
  appendFileSync(path, `${JSON.stringify(record)}\n`);
  return record;
}

/** Folds the event log into current tuple state, one entry per id. */
export function readBoard(root: string): Tuple[] {
  const path = boardPath(root);
  if (!existsSync(path)) return [];
  const byId = new Map<string, Tuple>();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const t = JSON.parse(line) as Tuple;
      byId.set(t.id, t);
    } catch {
      // skip malformed lines rather than corrupt board state
    }
  }
  return [...byId.values()];
}

export function readTuple(root: string, id: string): Tuple | undefined {
  return readBoard(root).find((t) => t.id === id);
}

export function tuplesByLane(root: string, lane: WorkerLane): Tuple[] {
  return readBoard(root).filter((t) => t.lane === lane);
}

export function tuplesByStatus(root: string, status: TupleStatus): Tuple[] {
  return readBoard(root).filter((t) => t.status === status);
}

// ---------------------------------------------------------------------------
// Agent manifest — mandatory guardrails (CLAUDE.md yool/tuple/HAMT section)
// ---------------------------------------------------------------------------

export interface AgentManifest {
  yool_id: string;
  authority: "dev" | "ops" | "review" | "audit";
  lane: WorkerLane;
  agent_terms: {
    cpu_quota_pct: number;
    disk_quota_mb: number;
    timeout_s: number;
  };
}

export interface ManifestValidation {
  ok: boolean;
  errors: string[];
}

/**
 * Guardrails are MANDATORY per the CLAUDE.md yool section: cpu_quota_pct
 * and disk_quota_mb must be set and positive, or the manifest is rejected
 * — an agent without a guardrail can "frita o processador" / fill the
 * disk, which is exactly what this board exists to prevent at scale.
 */
export function validateAgentManifest(manifest: Partial<AgentManifest>): ManifestValidation {
  const errors: string[] = [];
  if (!manifest.yool_id) errors.push("yool_id is required");
  if (!manifest.authority) errors.push("authority is required");
  if (!manifest.lane) errors.push("lane is required");
  const terms = manifest.agent_terms;
  if (!terms) {
    errors.push("agent_terms is required (cpu_quota_pct, disk_quota_mb, timeout_s)");
  } else {
    if (!(terms.cpu_quota_pct > 0)) errors.push("agent_terms.cpu_quota_pct must be > 0");
    if (!(terms.disk_quota_mb > 0)) errors.push("agent_terms.disk_quota_mb must be > 0");
    if (!(terms.timeout_s > 0)) errors.push("agent_terms.timeout_s must be > 0");
  }
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Worker governor — bounds concurrent workers per lane; the board can hold
// an unbounded number of logical tuples while only a small pool of real
// workers drains them.
// ---------------------------------------------------------------------------

const DEFAULT_LANE_CONCURRENCY: Record<WorkerLane, number> = {
  discovery: 1,
  strategy: 1,
  copy: 2,
  creative: 2,
  compliance: 2,
  publish: 1,
  analytics: 1,
  "paid-growth": 1,
  "community-replies": 1,
  evidence: 1,
  "budget-guardian": 1,
};

export class WorkerGovernor {
  private active = new Map<WorkerLane, number>();
  constructor(private limits: Record<WorkerLane, number> = DEFAULT_LANE_CONCURRENCY) {}

  canDispatch(lane: WorkerLane): boolean {
    return (this.active.get(lane) ?? 0) < (this.limits[lane] ?? 1);
  }

  acquire(lane: WorkerLane): boolean {
    if (!this.canDispatch(lane)) return false;
    this.active.set(lane, (this.active.get(lane) ?? 0) + 1);
    return true;
  }

  release(lane: WorkerLane): void {
    const current = this.active.get(lane) ?? 0;
    this.active.set(lane, Math.max(0, current - 1));
  }

  activeCount(lane: WorkerLane): number {
    return this.active.get(lane) ?? 0;
  }
}
