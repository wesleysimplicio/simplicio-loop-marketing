'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isCanonPiece,
  enforceClaimsGate,
  writeGateEnforcement,
  readGateEnforcement,
  CLAIMS_RULES,
} from "../../lib/gate/claims-gate.ts";
import type { WatcherReport } from "../../lib/gate/watcher-gate.ts";

function report(overrides: Partial<WatcherReport> = {}): WatcherReport {
  return {
    piece_id: "p1",
    tag: "MEASURED",
    passed: true,
    checked: [],
    checked_at: new Date().toISOString(),
    ...overrides,
  };
}

test("CLAIMS_RULES: exposes the four documented rule ids", () => {
  const ids = CLAIMS_RULES.map((r) => r.rule_id);
  assert.deepEqual(ids, [
    "claims.unverified.no_promote",
    "claims.watcher_failure_review",
    "claims.canonical_requires_source",
    "claims.measured_requires_report",
  ]);
  assert.equal(CLAIMS_RULES.filter((r) => r.blocking).length, 3);
});

test("isCanonPiece: true when the body cites a brand/pillar/voice/compliance doc", () => {
  assert.equal(isCanonPiece("As detailed, see brand guide for tone rules."), true);
  assert.equal(isCanonPiece("Content sourced from pillar research."), true);
  assert.equal(isCanonPiece("Just a normal caption with no citations."), false);
});

test("enforceClaimsGate: blocks when no report exists and gate is required (default)", () => {
  const result = enforceClaimsGate("p1", null);
  assert.equal(result.blocked, true);
  assert.equal(result.tag, "UNVERIFIED");
  assert.match(result.reasons[0], /no watcher report found/);
});

test("enforceClaimsGate: does not block when no report exists and requireGate=false", () => {
  const result = enforceClaimsGate("p1", null, { requireGate: false });
  assert.equal(result.blocked, false);
  assert.equal(result.tag, "UNVERIFIED");
  assert.deepEqual(result.reasons, []);
});

test("enforceClaimsGate: blocks an UNVERIFIED report and lists failed watcher checks", () => {
  const r = report({
    tag: "UNVERIFIED",
    checked: [
      { channel: "instagram", claimed: "10 saves", recomputed: "2 saves", match: false, severity: "block" },
      { channel: "tiktok", claimed: "5 saves", recomputed: "5 saves", match: true, severity: "warn" },
    ],
  });
  const result = enforceClaimsGate("p1", r);
  assert.equal(result.blocked, true);
  assert.equal(result.tag, "UNVERIFIED");
  assert.ok(result.reasons.some((x) => x.includes("1 watcher check(s) failed")));
  assert.ok(result.reasons.some((x) => x.includes("instagram: 2 saves")));
});

test("enforceClaimsGate: an UNVERIFIED report is not blocked when blockUnverified=false", () => {
  const r = report({ tag: "UNVERIFIED", checked: [] });
  const result = enforceClaimsGate("p1", r, { blockUnverified: false });
  assert.equal(result.blocked, false);
  assert.deepEqual(result.reasons, []);
});

test("enforceClaimsGate: a MEASURED report with no failures passes cleanly", () => {
  const r = report({ tag: "MEASURED" });
  const result = enforceClaimsGate("p1", r);
  assert.equal(result.blocked, false);
  assert.equal(result.tag, "MEASURED");
});

test("enforceClaimsGate: a CANON report passes through untouched", () => {
  const r = report({ tag: "CANON" });
  const result = enforceClaimsGate("p1", r);
  assert.equal(result.tag, "CANON");
  assert.equal(result.blocked, false);
});

test("writeGateEnforcement + readGateEnforcement: round-trips through disk", () => {
  const root = mkdtempSync(join(tmpdir(), "me-claims-gate-"));
  const result = enforceClaimsGate("p1", report({ tag: "MEASURED" }));
  const path = writeGateEnforcement(root, result);
  assert.match(path, /p1\.enforcement\.json$/);
  const readBack = readGateEnforcement(root, "p1");
  assert.deepEqual(readBack, result);
});

test("readGateEnforcement: returns null when no enforcement file exists", () => {
  const root = mkdtempSync(join(tmpdir(), "me-claims-gate-missing-"));
  assert.equal(readGateEnforcement(root, "nope"), null);
});
