import { test, expect } from "@playwright/test";
import { prepareEvolution, firstVerifiedCandidateWins, evaluateCanary } from "../lib/extension/evolution";

test("marketing extension sandbox evolves and hedges without owning core execution", async () => {
  const intake = prepareEvolution([
    { id: "defect-1", kind: "defect", summary: "provider unavailable" },
    { id: "gap-1", kind: "evolution", summary: "diverse creative strategy" },
  ], [{ operation: "insert_after", target: "creative", stage: "creative-diverse" }], "1.0.0");
  expect(intake.findings).toHaveLength(1);
  expect(intake.proposals).toHaveLength(1);

  const decision = firstVerifiedCandidateWins([
    { candidate_id: "a", strategy: "visual", producer_id: "producer-a", verifier_id: "reviewer-a", fence: "f1", verified: true, quality: .9, effect_count: 0, received_at_ms: 10 },
    { candidate_id: "b", strategy: "ugc", producer_id: "producer-b", verifier_id: "reviewer-b", fence: "f1", verified: true, quality: .91, effect_count: 0, received_at_ms: 20 },
  ], "delivery-owner", "f1");
  expect(decision).toMatchObject({ winner_id: "a", promotion_owner: "delivery-owner", cancelled: ["b"] });
  expect(evaluateCanary({ quality: .9, effect_count: 0 }, { quality: .7, effect_count: 0 })).toMatchObject({ promote: false, rollback: true });
});
