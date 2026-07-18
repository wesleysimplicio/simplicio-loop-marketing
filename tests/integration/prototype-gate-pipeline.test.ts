"use strict";

/*
 * Integration test — exercises the Prototype-First gate (issue #96) as a
 * pipeline slice: brief -> candidate generation -> compliance/humanizer/
 * brand-voice judges (real modules, not reimplemented) -> diversity check ->
 * dry-run simulation -> persisted verdict + contract validation, against a
 * temp filesystem sandbox. No mocks of the judges themselves.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPrototypeGate } from "../../lib/prototype/gate.ts";
import { validateArtifact, type SubsetSchema } from "../../lib/contracts/validate.ts";
import type { PrototypeBriefInput } from "../../lib/prototype/types.ts";

const PROTOTYPE_GATE_SCHEMA: SubsetSchema = {
  type: "object",
  required: ["schema", "piece_id", "verdict", "candidates", "evaluations", "simulations", "spend_usd", "dry_run"],
  properties: {
    schema: { type: "string" },
    piece_id: { type: "string" },
    verdict: { type: "string", enum: ["ACCEPT", "REVISE", "REJECT"] },
    candidates: { type: "array", minItems: 2 },
    evaluations: { type: "array", minItems: 2 },
    simulations: { type: "array", minItems: 2 },
    spend_usd: { type: "number", const: 0 },
    dry_run: { type: "boolean", const: true },
  },
};

function makeBrief(overrides: Partial<PrototypeBriefInput> = {}): PrototypeBriefInput {
  return {
    piece_id: "PIECE-int-001",
    client: "acme",
    channel: "instagram",
    brief: "Our platform helps marketing teams ship compliant campaigns faster.",
    pillar: "education",
    variant_count: 3,
    ...overrides,
  };
}

test("clean brief flows end-to-end: candidates -> judges -> diversity -> simulation -> ACCEPT, and the persisted artifact satisfies its contract", () => {
  const root = mkdtempSync(join(tmpdir(), "prototype-gate-int-"));
  try {
    const brief = makeBrief();
    const result = runPrototypeGate(brief, { root });

    assert.equal(result.verdict, "ACCEPT");
    assert.ok(result.candidates.length >= 2);
    assert.equal(result.evaluations.length, result.candidates.length);
    assert.equal(result.simulations.length, result.candidates.length);
    assert.ok(result.winner_candidate_id);
    assert.equal(result.spend_usd, 0);

    const persistedPath = join(root, "data", "prototype-gate", `${brief.piece_id}.json`);
    assert.ok(existsSync(persistedPath));
    const persisted = JSON.parse(readFileSync(persistedPath, "utf8"));
    const validation = validateArtifact(persisted, {
      "marketing-prototype-gate/v1": PROTOTYPE_GATE_SCHEMA,
    });
    assert.equal(validation.ok, true, validation.errors.join("; "));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("forbidden-claim brief is blocked end-to-end (REJECT), the block is traceable, and zero simulations succeed", () => {
  const root = mkdtempSync(join(tmpdir(), "prototype-gate-int-block-"));
  try {
    const brief = makeBrief({
      piece_id: "PIECE-int-002",
      brief: "This treats chronic pain and heals your condition, guaranteed.",
    });
    const result = runPrototypeGate(brief, { root });

    assert.equal(result.verdict, "REJECT");
    assert.ok(result.evaluations.every((e) => e.eligible === false));
    assert.ok(result.simulations.every((s) => s.ok === false));
    assert.equal(result.spend_usd, 0);

    const learningsPath = join(root, "data", "prototype-learnings.jsonl");
    const raw = readFileSync(learningsPath, "utf8").trim();
    const entry = JSON.parse(raw.split("\n").pop() as string);
    assert.equal(entry.piece_id, brief.piece_id);
    assert.equal(entry.publish_occurred, false);
    assert.equal(entry.spend_usd, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a DRY_RUN-tampering brief is rejected before the diversity/publish stages ever run against live intent", () => {
  const root = mkdtempSync(join(tmpdir(), "prototype-gate-int-tamper-"));
  try {
    const malicious = { ...makeBrief({ piece_id: "PIECE-int-003" }), DRY_RUN: false, force_live: true };
    const result = runPrototypeGate(malicious, { root });

    assert.equal(result.verdict, "REJECT");
    assert.equal(result.tamper_detected, true);
    assert.equal(result.spend_usd, 0);
    assert.equal(result.dry_run, true);

    const learningsPath = join(root, "data", "prototype-learnings.jsonl");
    assert.ok(existsSync(learningsPath));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
