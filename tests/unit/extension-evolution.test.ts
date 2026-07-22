import test from "node:test";
import assert from "node:assert/strict";
import { prepareEvolution, validateProposal, replicationAdmission, firstVerifiedCandidateWins, evaluateCanary } from "../../lib/extension/evolution.ts";

test("defects remain findings while evolution proposals are deterministic and deduplicable", () => {
  const signals = [{ id: "f1", kind: "defect" as const, summary: "broken caption" }, { id: "e1", kind: "evolution" as const, summary: "specialist gap" }];
  const a = prepareEvolution(signals, [{ operation: "insert_after", target: "copy", stage: "copy-specialist" }], "1.0.0");
  const b = prepareEvolution([...signals].reverse(), [{ operation: "insert_after", target: "copy", stage: "copy-specialist" }], "1.0.0");
  assert.deepEqual(a.findings.map((x) => x.id), ["f1"]);
  assert.equal(a.proposals[0].fingerprint, b.proposals[0].fingerprint);
  assert.deepEqual(a.proposals[0].rollout, ["replay", "shadow", "canary"]);
  assert.equal(a.proposals[0].estimated_cost_usd, null);
  assert.deepEqual(prepareEvolution([signals[0]], [], "1.0.0").proposals, []);
  const improvement = prepareEvolution([{ id: "i", kind: "improvement", summary: "faster" }], [{ operation: "refine", target: "copy", stage: "copy-policy" }], "1.0.0");
  assert.equal(improvement.proposals[0].kind, "improvement");
});

test("compliance cannot be weakened and orphan overlays fail closed", () => {
  const proposal = prepareEvolution([{ id: "e", kind: "evolution", summary: "replace gate" }], [{ operation: "insert_before", target: "compliance", stage: "fast-pass" }], "1.0.0").proposals[0];
  assert.deepEqual(validateProposal(proposal, ["copy", "compliance", "safety"]).violations, ["protected-gate:compliance"]);
  const orphan = { ...proposal, graph_diff: [{ operation: "refine" as const, target: "unknown", stage: "x" }] };
  assert.equal(validateProposal(orphan, ["compliance", "safety"]).accepted, false);
  const cycle = { ...proposal, graph_diff: [{ operation: "refine" as const, target: "copy", stage: "copy" }] };
  assert.ok(validateProposal(cycle, ["copy", "compliance", "safety"]).violations.includes("cycle:copy"));
  assert.ok(validateProposal(proposal, ["copy"]).violations.includes("missing-required-gate:compliance"));
});

test("replication declaration is bounded by critical path, confidence, slots and backlog", () => {
  const policy = { max_agents: 4, max_tokens: 1000, max_media_usd: 5, max_ads_usd: 0, max_backlog: 10, p95_trigger_ms: 100, min_confidence: .8, available_slots: 2, critical_paths: ["creative"] };
  assert.equal(replicationAdmission(policy, { stage: "creative", p95_ms: 500, confidence: .9, backlog: 2, requested_replicas: 8 }).admitted, 2);
  assert.equal(replicationAdmission(policy, { stage: "publish", p95_ms: 500, confidence: .9, backlog: 2, requested_replicas: 2 }).admitted, 0);
  assert.equal(replicationAdmission(policy, { stage: "creative", p95_ms: 500, confidence: .9, backlog: 11, requested_replicas: 2 }).admitted, 0);
  assert.equal(replicationAdmission(policy, { stage: "creative", p95_ms: 50, confidence: .9, backlog: 1, requested_replicas: 2 }).reason, "threshold-not-met");
  assert.equal(replicationAdmission({ ...policy, available_slots: 0 }, { stage: "creative", p95_ms: 500, confidence: .9, backlog: 1, requested_replicas: 2 }).reason, "no-capacity");
});

test("first independently verified isolated receipt wins; losers and late receipts are rejected/cancelled", () => {
  const receipts = [
    { candidate_id: "slow", strategy: "story", producer_id: "p1", verifier_id: "v1", fence: "f", verified: true, quality: .9, effect_count: 0, received_at_ms: 20 },
    { candidate_id: "fast", strategy: "direct", producer_id: "p2", verifier_id: "v2", fence: "f", verified: true, quality: .8, effect_count: 0, received_at_ms: 10 },
    { candidate_id: "self", strategy: "x", producer_id: "p3", verifier_id: "p3", fence: "f", verified: true, quality: 1, effect_count: 0, received_at_ms: 1 },
    { candidate_id: "late", strategy: "x", producer_id: "p4", verifier_id: "v4", fence: "old", verified: true, quality: 1, effect_count: 0, received_at_ms: 2 },
    { candidate_id: "pending", strategy: "x", producer_id: "p5", verifier_id: "v5", fence: "f", verified: false, quality: 1, effect_count: 0, received_at_ms: 2 },
    { candidate_id: "effect", strategy: "x", producer_id: "p6", verifier_id: "v6", fence: "f", verified: true, quality: 1, effect_count: 1, received_at_ms: 2 },
  ];
  const result = firstVerifiedCandidateWins(receipts, "promotion-agent", "f");
  assert.equal(result.winner_id, "fast");
  assert.equal(result.promotion_owner, "promotion-agent");
  assert.deepEqual(result.cancelled, ["slow"]);
  assert.deepEqual(result.rejected.map((x) => x.reason).sort(), ["candidate-has-external-effect", "late-or-stale-fence", "self-verification", "unverified"]);
});

test("regressive or duplicate-effect canary rolls back", () => {
  assert.equal(evaluateCanary({ quality: .9, effect_count: 1 }, { quality: .8, effect_count: 1 }).rollback, true);
  assert.equal(evaluateCanary({ quality: .9, effect_count: 1 }, { quality: .9, effect_count: 2 }).reason, "duplicate-effect-regression");
  assert.equal(evaluateCanary({ quality: .9, effect_count: 1 }, { quality: .9, effect_count: 1 }).promote, true);
});
