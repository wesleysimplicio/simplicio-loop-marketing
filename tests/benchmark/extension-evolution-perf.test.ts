import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { firstVerifiedCandidateWins } from "../../lib/extension/evolution.ts";

test("candidate receipt policy evaluates 10k receipts under 100ms", () => {
  const receipts = Array.from({ length: 10_000 }, (_, i) => ({ candidate_id: `c-${i}`, strategy: `s-${i % 4}`, producer_id: `p-${i}`, verifier_id: `v-${i}`, fence: "active", verified: true, quality: .9, effect_count: 0, received_at_ms: i }));
  const start = performance.now();
  const result = firstVerifiedCandidateWins(receipts, "promotion", "active");
  const elapsed = performance.now() - start;
  assert.equal(result.winner_id, "c-0");
  assert.ok(elapsed < 100, `10k receipt policy took ${elapsed.toFixed(2)}ms`);
  console.log(`benchmark extension candidate policy: ${elapsed.toFixed(2)}ms/10000 receipts (${(10_000 / elapsed * 1000).toFixed(0)} receipts/s)`);
});
