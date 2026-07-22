import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareEvolution, validateProposal, firstVerifiedCandidateWins, evaluateCanary } from "../../lib/extension/evolution.ts";

test("sandbox demonstrates agent RFC, protected compliance, hedged strategies, verified winner and rollback", () => {
  const manifest = JSON.parse(readFileSync(".specs/extensions/loop.marketing.json", "utf8"));
  assert.equal(manifest.schema, "simplicio.loop-extension/v1");
  const proposal = prepareEvolution([{ id: "gap", kind: "evolution", summary: "add creative role" }], [{ operation: "insert_after", target: "creative", stage: "creative-diverse" }], manifest.version).proposals[0];
  assert.equal(validateProposal(proposal, ["creative", "compliance", "safety"]).accepted, true);
  const unsafe = { ...proposal, graph_diff: [{ operation: "insert_after" as const, target: "compliance", stage: "bypass" }] };
  assert.equal(validateProposal(unsafe, ["creative", "compliance", "safety"]).accepted, false);
  const decision = firstVerifiedCandidateWins([
    { candidate_id: "direct", strategy: "direct-response", producer_id: "copy-a", verifier_id: "review-a", fence: "42", verified: true, quality: .92, effect_count: 0, received_at_ms: 95 },
    { candidate_id: "story", strategy: "narrative", producer_id: "copy-b", verifier_id: "review-b", fence: "42", verified: true, quality: .94, effect_count: 0, received_at_ms: 140 },
  ], "promotion-only", "42");
  assert.equal(decision.winner_id, "direct");
  assert.deepEqual(decision.cancelled, ["story"]);
  assert.equal(evaluateCanary({ quality: .92, effect_count: 0 }, { quality: .88, effect_count: 0 }).rollback, true);
});
