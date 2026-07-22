import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { MarketingEvent } from "../observability/events";
import type { Tuple, TupleClass, TupleStatus } from "../yool/board";

export interface CoreReceipt {
  schema: "simplicio.loop-receipt/v1"; receipt_id: string; run_id: string; task_id: string;
  revision: number; attempt: number; fence_token: string; stage: string;
  status: "pending" | "running" | "blocked" | "succeeded" | "failed";
  evidence: unknown[]; truth_class: "MEASURED" | "UNVERIFIED"; terminal: boolean;
}

export function eventToReceipt(event: MarketingEvent, previous: CoreReceipt | null = null): CoreReceipt {
  const taskId = event.piece_id ?? String(event.data?.task_id ?? "");
  if (!taskId) throw new Error("CONVERSION_MISSING_TASK_ID");
  const fence = String(event.data?.fence_token ?? previous?.fence_token ?? "");
  if (!fence) throw new Error("CONVERSION_MISSING_FENCE");
  const terminal = event.kind === "loop_complete" || event.kind === "publish_verified" || event.kind === "gate_fail";
  return { schema: "simplicio.loop-receipt/v1", receipt_id: `${event.run_id}:${taskId}:${event.kind}`,
    run_id: event.run_id, task_id: taskId, revision: (previous?.revision ?? 0) + 1,
    attempt: Number(event.data?.attempt ?? previous?.attempt ?? 1), fence_token: fence,
    stage: event.phase ?? event.kind, status: event.kind === "gate_fail" ? "blocked" : terminal ? "succeeded" : "running",
    evidence: Array.isArray(event.data?.evidence) ? event.data.evidence : previous?.evidence ?? [],
    truth_class: event.data?.truth_class === "MEASURED" ? "MEASURED" : "UNVERIFIED", terminal };
}

export function receiptToTuple(receipt: CoreReceipt): Omit<Tuple, "updated_at"> {
  const status: TupleStatus = receipt.status === "blocked" || receipt.status === "failed" ? "blocked" : receipt.terminal ? "done" : receipt.status === "pending" ? "pending" : "in_progress";
  return { id: receipt.task_id, class: "piece.plan" as TupleClass, status,
    evidence_path: typeof receipt.evidence[0] === "string" ? receipt.evidence[0] : undefined,
    payload: { core_receipt_id: receipt.receipt_id, revision: receipt.revision, fence_token: receipt.fence_token, truth_class: receipt.truth_class, authoritative: false } };
}

/** Core receipts always win; projection writes are idempotent by receipt_id. */
export function reconcileReceipts(root: string, receipts: CoreReceipt[]): { applied: number; skipped: number } {
  const path = resolve(root, "data", "yool", "core-projection.jsonl");
  const seen = new Set<string>();
  if (existsSync(path)) for (const line of readFileSync(path, "utf8").split("\n")) try { seen.add(JSON.parse(line).receipt_id); } catch { /* tolerate torn projection tail */ }
  let applied = 0, skipped = 0;
  mkdirSync(dirname(path), { recursive: true });
  for (const receipt of [...receipts].sort((a, b) => a.task_id.localeCompare(b.task_id) || a.revision - b.revision)) {
    if (seen.has(receipt.receipt_id)) { skipped++; continue; }
    appendFileSync(path, `${JSON.stringify({ receipt_id: receipt.receipt_id, tuple: receiptToTuple(receipt) })}\n`);
    seen.add(receipt.receipt_id); applied++;
  }
  return { applied, skipped };
}
