import assert from "node:assert/strict";
import test from "node:test";
import { defineHandler, deterministicCaptionFormat, executeFencedEffect, stageIdentity } from "../../lib/extension/handlers";

const context = { run_id: "r1", task_id: "p1", attempt: 1, fence_token: "f1", tenant_id: "tenant-a", input: { caption: "hello", pillar: "proof" } };

test("deterministic handler is idempotent and spends no model tokens", async () => {
  const first = await deterministicCaptionFormat(context);
  const retry = await deterministicCaptionFormat({ ...context, attempt: 2 });
  assert.equal(first.input_hash, retry.input_hash);
  assert.equal(first.idempotency_key, retry.idempotency_key);
  assert.deepEqual(first.output, retry.output);
  assert.deepEqual(first.metrics, { llm_calls: 0, tokens: 0, cost_usd: 0 });
});

test("tenant isolation changes cache and idempotency identities", () => {
  assert.notDeepEqual(stageIdentity("marketing.copy", context), stageIdentity("marketing.copy", { ...context, tenant_id: "tenant-b" }));
});

test("cancellation is fail-closed and does not invoke a handler", async () => {
  let calls = 0;
  const handler = defineHandler("marketing.copy", () => { calls++; return "copy"; }, { deterministic: false });
  const result = await handler({ ...context, cancelled: true });
  assert.equal(result.verdict, "cancelled");
  assert.equal(calls, 0);
  assert.equal(result.metrics.tokens, null);
  assert.equal(result.metrics.unobserved_reason, "stage not executed");
});

test("fenced effects reject missing authority and deduplicate retries/restarts", async () => {
  const receipts = new Map<string, string>();
  const store = { get: async (key: string) => receipts.get(key), confirm: async (key: string, fence: string, result: string) => { assert.equal(fence, "f1"); receipts.set(key, result); } };
  let submissions = 0;
  const authority = { intent: "publish", authorization: "approved", idempotency_key: "piece:publish", fence_token: "f1" };
  const first = await executeFencedEffect(authority, store, async () => `remote-${++submissions}`);
  const duplicate = await executeFencedEffect(authority, store, async () => `remote-${++submissions}`);
  assert.deepEqual(first, { result: "remote-1", deduplicated: false });
  assert.deepEqual(duplicate, { result: "remote-1", deduplicated: true });
  assert.equal(submissions, 1);
  await assert.rejects(() => executeFencedEffect({ ...authority, fence_token: "" }, store, async () => "bad"), /effect-authority-required/);
});
