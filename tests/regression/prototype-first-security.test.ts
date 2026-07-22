import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPrototypeGate, prototypeGatePath, validateFreshAccept } from "../../lib/prototype/gate.ts";
import type { PrototypeBriefInput } from "../../lib/prototype/types.ts";

function brief(overrides: Partial<PrototypeBriefInput> = {}): PrototypeBriefInput {
  return { piece_id: "PIECE-sec", campaign_id: "CAMPAIGN-sec", client: "acme", channel: "instagram", brief: "Explain our audited workflow.", variant_count: 3, brand_version: "b1", offer_version: "o1", policy_version: "p1", source_version: "s1", ...overrides };
}

test("missing evidence fails closed without fabricating evidence", () => {
  const result = runPrototypeGate(brief({ evidence_required: true, evidence: [] }));
  assert.equal(result.verdict, "REJECT");
  assert.ok(result.evaluations.every((e) => !e.evidence_pass));
  assert.deepEqual(result.candidates.filter((candidate) => "evidence" in candidate), []);
});

test("calendar and budget conflicts block the dry-run simulation", () => {
  const result = runPrototypeGate(brief({ daily_budget_usd: 51, spend_ceiling_usd: 50, calendar_conflicts: ["launch slot occupied"] }));
  assert.equal(result.verdict, "REJECT");
  assert.ok(result.simulations.every((s) => !s.ok && s.calendar?.pass === false && s.budget?.pass === false));
  assert.equal(result.spend_usd, 0);
});

test("PII or secret-shaped input is rejected and never persisted in a public payload URL", () => {
  const result = runPrototypeGate(brief({ brief: "use api_key=sk-abcdefghijklmnop for launch" }));
  assert.equal(result.verdict, "REJECT");
  assert.ok(result.evaluations.every((e) => !e.security_pass));
  assert.ok(result.simulations.every((s) => !s.ok));
});

test("ACCEPT expires and is invalidated by relevant drift", () => {
  const root = mkdtempSync(join(tmpdir(), "prototype-drift-"));
  try {
    const input = brief();
    const result = runPrototypeGate(input, { root });
    assert.equal(validateFreshAccept(root, input).ok, true);
    assert.match(result.input_fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(validateFreshAccept(root, brief({ policy_version: "p2" })).ok, false);
    const stored = JSON.parse(readFileSync(prototypeGatePath(root, input.piece_id), "utf8"));
    stored.expires_at = "2000-01-01T00:00:00.000Z";
    writeFileSync(prototypeGatePath(root, input.piece_id), JSON.stringify(stored));
    assert.equal(validateFreshAccept(root, input).ok, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("prototype metrics keep unobservable real performance null with a reason", () => {
  const result = runPrototypeGate(brief());
  assert.equal(result.metrics.real_performance, null);
  assert.match(result.metrics.real_performance_reason, /not observable/);
  assert.equal(result.metrics.prototype_quality_score, 1);
});
