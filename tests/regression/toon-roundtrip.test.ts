'use strict';

/*
 * Regression tests — lock down TOON encode/decode edge cases and the
 * compliance/provider-matrix fallback paths that are easy to silently break
 * during a refactor (no user-facing symptom until a prompt gets malformed or
 * routing silently drifts). Each case below is a specific shape that has to
 * keep working, not a general behavior spec (see tests/unit for that).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeToon, decodeToon } from "../../lib/format/toon.ts";
import { loadProviderMatrix, resetMatrixCache } from "../../lib/providers/matrix.ts";
import { auditSync } from "../../lib/compliance/generic.ts";

test("regression: TOON tabular block preserves row order for pieces with identical field sets", () => {
  const payload = {
    pieces: [
      { id: "p3", score: 0.9 },
      { id: "p1", score: 0.5 },
      { id: "p2", score: 0.7 },
    ],
  };
  const encoded = encodeToon(payload);
  const decoded = decodeToon(encoded) as typeof payload;
  assert.deepEqual(decoded.pieces.map((p) => p.id), ["p3", "p1", "p2"]);
});

test("regression: a string that looks numeric stays a quoted string through a round trip", () => {
  const payload = { zip: "02139", version: "1.0" };
  const decoded = decodeToon(encodeToon(payload));
  assert.equal(typeof (decoded as any).zip, "string");
  assert.equal((decoded as any).zip, "02139");
  assert.equal((decoded as any).version, "1.0");
});

test("regression: nested empty object encodes/decodes as {} rather than being dropped", () => {
  const payload = { meta: {} };
  const encoded = encodeToon(payload);
  assert.match(encoded, /meta: \{\}/);
  assert.deepEqual(decodeToon(encoded), { meta: {} });
});

test("regression: an unreadable/missing PROVIDERS.md never throws — router must degrade to embedded defaults", () => {
  resetMatrixCache();
  assert.doesNotThrow(() => loadProviderMatrix("/path/does/not/exist/PROVIDERS.md"));
  resetMatrixCache();
});

test("regression: before/after language without a disclaimer still blocks even when mixed with unrelated warn-only rules", () => {
  const report = auditSync({
    piece_id: "reg-1",
    text: "Better than the competition — see the before/after results.",
  });
  assert.equal(report.pass, false);
  assert.ok(report.violations.some((v) => v.rule_id === "audience.before_after_no_disclaimer"));
  // The warn-only comparison rule must not be promoted to a blocking violation.
  assert.ok(report.warnings.some((v) => v.rule_id === "comparison.unsourced_superiority"));
  assert.ok(!report.violations.some((v) => v.rule_id === "comparison.unsourced_superiority"));
});
