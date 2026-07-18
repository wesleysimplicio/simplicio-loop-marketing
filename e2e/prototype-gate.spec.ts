import { test, expect } from "@playwright/test";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runPrototypeGate } from "../lib/prototype/gate";
import type { PrototypeBriefInput } from "../lib/prototype/types";

/*
 * Piece-level e2e spec for the Prototype-First gate (issue #96): exercises
 * the gate end-to-end against mocks (no real provider/network), per this
 * repo's own per-piece Definition of Done ("Playwright evidence: at least
 * one E2E spec exercises the piece pipeline end-to-end against mocks").
 */

function makeBrief(overrides: Partial<PrototypeBriefInput> = {}): PrototypeBriefInput {
  return {
    piece_id: "PIECE-e2e-001",
    client: "acme",
    channel: "instagram",
    brief: "Our platform helps marketing teams ship compliant campaigns faster.",
    pillar: "education",
    variant_count: 3,
    ...overrides,
  };
}

test("prototype gate: brief -> N>=2 distinct candidates -> judges -> ACCEPT with a winner, zero spend", () => {
  const root = mkdtempSync(join(tmpdir(), "prototype-gate-e2e-"));
  try {
    const result = runPrototypeGate(makeBrief(), { root });

    expect(result.verdict).toBe("ACCEPT");
    expect(result.candidates.length).toBeGreaterThanOrEqual(2);
    expect(result.winner_candidate_id).toBeTruthy();
    expect(result.spend_usd).toBe(0);
    expect(result.dry_run).toBe(true);

    const persistedPath = join(root, "data", "prototype-gate", "PIECE-e2e-001.json");
    expect(existsSync(persistedPath)).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("prototype gate: a piece with a forbidden claim is blocked before any would-publish simulation, with zero spend", () => {
  const root = mkdtempSync(join(tmpdir(), "prototype-gate-e2e-block-"));
  try {
    const brief = makeBrief({
      piece_id: "PIECE-e2e-002",
      brief: "This treats chronic pain and heals your condition, guaranteed.",
    });
    const result = runPrototypeGate(brief, { root });

    expect(result.verdict).toBe("REJECT");
    expect(result.evaluations.every((e) => e.eligible === false)).toBe(true);
    expect(result.simulations.every((s) => s.ok === false)).toBe(true);
    expect(result.spend_usd).toBe(0);

    const learningsPath = join(root, "data", "prototype-learnings.jsonl");
    const entry = JSON.parse(readFileSync(learningsPath, "utf8").trim().split("\n").pop() as string);
    expect(entry.publish_occurred).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("prototype gate: a malicious DRY_RUN-tamper payload is rejected and never simulated as a live publish", () => {
  const root = mkdtempSync(join(tmpdir(), "prototype-gate-e2e-tamper-"));
  try {
    const malicious = { ...makeBrief({ piece_id: "PIECE-e2e-003" }), DRY_RUN: false, allow_spend: true };
    const result = runPrototypeGate(malicious, { root });

    expect(result.verdict).toBe("REJECT");
    expect(result.tamper_detected).toBe(true);
    expect(result.spend_usd).toBe(0);
    expect(result.dry_run).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("prototype gate: insufficient diversity triggers REVISE, not a silent ACCEPT", () => {
  const root = mkdtempSync(join(tmpdir(), "prototype-gate-e2e-revise-"));
  try {
    // threshold=0 means "similarity < 0" can never be true, so distinct_pairs
    // is forced to 0 deterministically — this exercises the REVISE branch of
    // the same end-to-end pipeline without relying on wording variance.
    const result = runPrototypeGate(makeBrief({ piece_id: "PIECE-e2e-004" }), {
      root,
      diversityThreshold: 0,
    });
    expect(result.verdict).toBe("REVISE");
    expect(result.diversity.pass).toBe(false);
    expect(result.spend_usd).toBe(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
