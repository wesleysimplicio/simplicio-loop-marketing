"use strict";

/*
 * Unit tests for the Prototype-First gate (issue #96, simplicio-loop epic
 * #568): brief -> N>=2 storyboard/copy candidates -> brand/humanizer/
 * compliance judges -> diversity check -> dry-run publish simulation ->
 * independent ACCEPT/REVISE/REJECT verdict.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  generateCandidates,
  assessDiversity,
  clampVariantCount,
} from "../../lib/prototype/candidates.ts";
import {
  runPrototypeGate,
  sanitizeBriefInput,
  evaluateCandidate,
  simulateDryRunPublish,
  prototypeGatePath,
} from "../../lib/prototype/gate.ts";
import type { PrototypeBriefInput, PrototypeCandidate } from "../../lib/prototype/types.ts";

function makeBrief(overrides: Partial<PrototypeBriefInput> = {}): PrototypeBriefInput {
  return {
    piece_id: "PIECE-test-001",
    client: "acme",
    channel: "instagram",
    brief: "Our new dashboard helps teams ship marketing pieces faster.",
    pillar: "education",
    ...overrides,
  };
}

// --- candidate generation -------------------------------------------------

test("generateCandidates produces >=2 genuinely distinct candidates by default", () => {
  const brief = makeBrief();
  const candidates = generateCandidates(brief);
  assert.ok(candidates.length >= 2);
  const ids = new Set(candidates.map((c) => c.candidate_id));
  assert.equal(ids.size, candidates.length, "candidate ids must be unique");
  const angles = new Set(candidates.map((c) => c.angle));
  assert.ok(angles.size >= 2, "candidates must use distinct narrative angles");
});

test("clampVariantCount enforces the [2,5] budget", () => {
  assert.equal(clampVariantCount(undefined), 2);
  assert.equal(clampVariantCount(1), 2);
  assert.equal(clampVariantCount(3), 3);
  assert.equal(clampVariantCount(99), 5);
});

test("assessDiversity: 2 near-identical candidates fail the diversity bar", () => {
  const texts = [
    "Try our dashboard today for faster shipping of marketing pieces.",
    "Try our dashboard today for faster shipping of marketing pieces now.",
  ];
  const result = assessDiversity(texts);
  assert.equal(result.pass, false);
  assert.equal(result.distinct_pairs, 0);
});

test("assessDiversity: 2 genuinely distinct candidates pass the diversity bar", () => {
  const texts = [
    "Stop losing time to slow marketing pipelines and manual reviews.",
    "A number that changes how you think about content velocity: 4x.",
  ];
  const result = assessDiversity(texts);
  assert.equal(result.pass, true);
  assert.ok(result.distinct_pairs >= 1);
});

test("the default candidate set generated from one brief passes its own diversity check", () => {
  const brief = makeBrief();
  const candidates = generateCandidates(brief, 3);
  const result = assessDiversity(
    candidates.map((c) => `${c.hook} ${c.storyboard.map((b) => `${b.beat} ${b.visual}`).join(" ")}`),
  );
  assert.equal(result.pass, true);
});

// --- DRY_RUN tamper guard --------------------------------------------------

test("sanitizeBriefInput ignores a clean brief with no tamper flags", () => {
  const { brief, tamper_detected, tamper_reasons } = sanitizeBriefInput(makeBrief());
  assert.equal(tamper_detected, false);
  assert.equal(tamper_reasons.length, 0);
  assert.equal(brief.client, "acme");
});

test("sanitizeBriefInput detects and reports a malicious DRY_RUN override attempt without honoring it", () => {
  const before = process.env.DRY_RUN;
  const malicious = {
    ...makeBrief(),
    dry_run_override: false,
    env: { DRY_RUN: "false" },
  };
  const { tamper_detected, tamper_reasons } = sanitizeBriefInput(malicious);
  assert.equal(tamper_detected, true);
  assert.ok(tamper_reasons[0].includes("disallowed override key"));
  // The sanitizer must never itself touch process.env.
  assert.equal(process.env.DRY_RUN, before);
});

test("runPrototypeGate REJECTs a payload with a DRY_RUN tamper attempt, with zero spend/publish", () => {
  const malicious = { ...makeBrief(), DRY_RUN: false };
  const result = runPrototypeGate(malicious);
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.tamper_detected, true);
  assert.equal(result.spend_usd, 0);
  assert.equal(result.dry_run, true);
  assert.ok(result.simulations.every((s) => !s.simulated_draft_url || result.tamper_detected));
});

// --- compliance judge -------------------------------------------------------

test("evaluateCandidate blocks a candidate carrying a forbidden medical claim", () => {
  const brief = makeBrief();
  const candidate: PrototypeCandidate = {
    candidate_id: "cand-forbidden",
    piece_id: brief.piece_id,
    angle: "problem-agitate-solve",
    hook: "Stop the pain today.",
    storyboard: [],
    copy: "This treats chronic pain and heals your condition for good.",
    caption: "Real results, no gimmicks.",
  };
  const evaluation = evaluateCandidate(candidate, brief);
  assert.equal(evaluation.eligible, false);
  assert.equal(evaluation.compliance.pass, false);
  assert.ok(evaluation.compliance.violations.length >= 1);
});

test("simulateDryRunPublish refuses to simulate a blocked candidate before it reaches a would-publish state", () => {
  const candidate: PrototypeCandidate = {
    candidate_id: "cand-blocked",
    piece_id: "p1",
    angle: "data-point",
    hook: "hook",
    storyboard: [],
    copy: "copy",
    caption: "caption",
  };
  const simulation = simulateDryRunPublish(candidate, false, "acme");
  assert.equal(simulation.ok, false);
  assert.ok(simulation.reason?.includes("blocked by compliance"));
  assert.equal(simulation.simulated_draft_url, undefined);
});

test("simulateDryRunPublish makes zero real network calls even when fetch is instrumented to throw", () => {
  const originalFetch = globalThis.fetch;
  // @ts-expect-error — intentionally poison fetch for this test to prove the
  // simulation path never calls it.
  globalThis.fetch = () => {
    throw new Error("simulateDryRunPublish must never call fetch");
  };
  try {
    const candidate: PrototypeCandidate = {
      candidate_id: "cand-ok",
      piece_id: "p1",
      angle: "data-point",
      hook: "hook",
      storyboard: [],
      copy: "copy",
      caption: "caption",
    };
    const simulation = simulateDryRunPublish(candidate, true, "acme");
    assert.equal(simulation.ok, true);
    assert.ok(simulation.simulated_draft_url?.startsWith("https://prototype-sim.test/"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// --- end-to-end verdicts -----------------------------------------------------

test("runPrototypeGate end-to-end: a forbidden-claim brief is blocked before any would-publish simulation succeeds", () => {
  const brief = makeBrief({
    piece_id: "PIECE-test-forbidden",
    brief: "This treats chronic pain and heals your condition, guaranteed cure in days.",
  });
  const result = runPrototypeGate(brief, { variantCount: 2 });
  assert.equal(result.verdict, "REJECT");
  assert.equal(result.spend_usd, 0);
  assert.ok(result.evaluations.every((e) => e.eligible === false));
  assert.ok(result.simulations.every((s) => s.ok === false));
  assert.equal(result.winner_candidate_id, undefined);
});

test("runPrototypeGate end-to-end: a clean, diverse brief reaches ACCEPT with a winner", () => {
  const brief = makeBrief({ piece_id: "PIECE-test-clean" });
  const result = runPrototypeGate(brief, { variantCount: 3 });
  assert.equal(result.verdict, "ACCEPT");
  assert.ok(result.winner_candidate_id);
  assert.ok(result.simulations.some((s) => s.ok === true));
  assert.equal(result.spend_usd, 0);
  assert.equal(result.dry_run, true);
});

// --- persistence -------------------------------------------------------------

test("runPrototypeGate persists the result and, on REJECT, appends a durable learning with zero spend", () => {
  const root = mkdtempSync(join(tmpdir(), "me-prototype-gate-"));
  try {
    const brief = makeBrief({
      piece_id: "PIECE-test-persist-reject",
      brief: "This treats chronic pain and heals conditions overnight.",
    });
    const result = runPrototypeGate(brief, { root });
    assert.equal(result.verdict, "REJECT");

    const gatePath = prototypeGatePath(root, brief.piece_id);
    assert.ok(existsSync(gatePath));
    const persisted = JSON.parse(readFileSync(gatePath, "utf8"));
    assert.equal(persisted.verdict, "REJECT");

    const learningsPath = join(root, "data", "prototype-learnings.jsonl");
    assert.ok(existsSync(learningsPath));
    const lines = readFileSync(learningsPath, "utf8").trim().split("\n");
    const last = JSON.parse(lines[lines.length - 1]);
    assert.equal(last.piece_id, brief.piece_id);
    assert.equal(last.spend_usd, 0);
    assert.equal(last.publish_occurred, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runPrototypeGate does not append a learning entry on ACCEPT", () => {
  const root = mkdtempSync(join(tmpdir(), "me-prototype-gate-accept-"));
  try {
    const brief = makeBrief({ piece_id: "PIECE-test-persist-accept" });
    runPrototypeGate(brief, { root, variantCount: 3 });
    const learningsPath = join(root, "data", "prototype-learnings.jsonl");
    assert.equal(existsSync(learningsPath), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
