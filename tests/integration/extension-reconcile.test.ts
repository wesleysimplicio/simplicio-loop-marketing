import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eventToReceipt, receiptToTuple, reconcileReceipts, type CoreReceipt } from "../../lib/extension/reconcile.ts";

const receipt: CoreReceipt = { schema: "simplicio.loop-receipt/v1", receipt_id: "r1", run_id: "run1", task_id: "piece1", revision: 4, attempt: 2, fence_token: "f9", stage: "compliance", status: "succeeded", evidence: ["proof.json"], truth_class: "MEASURED", terminal: true };

test("conversions preserve IDs, revision, fence, evidence and truth", () => {
  const tuple = receiptToTuple(receipt);
  assert.deepEqual(tuple.payload, { core_receipt_id: "r1", revision: 4, fence_token: "f9", truth_class: "MEASURED", authoritative: false });
  assert.equal(tuple.status, "done"); assert.equal(tuple.evidence_path, "proof.json");
  const converted = eventToReceipt({ schema: "marketing-event/v1", ts: "x", run_id: "run1", kind: "publish_verified", level: "info", piece_id: "piece1", data: { fence_token: "f9", attempt: 2, evidence: ["proof.json"], truth_class: "MEASURED" } });
  assert.equal(converted.task_id, "piece1"); assert.equal(converted.fence_token, "f9"); assert.equal(converted.truth_class, "MEASURED");
});

test("crash/retry reconciliation converges without duplicate effects", () => {
  const root = mkdtempSync(join(tmpdir(), "extension-reconcile-"));
  assert.deepEqual(reconcileReceipts(root, [receipt]), { applied: 1, skipped: 0 });
  assert.deepEqual(reconcileReceipts(root, [receipt, receipt]), { applied: 0, skipped: 2 });
  assert.equal(readFileSync(join(root, "data/yool/core-projection.jsonl"), "utf8").trim().split("\n").length, 1);
});
