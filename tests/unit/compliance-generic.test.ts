'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditSync, audit, writeReport } from "../../lib/compliance/generic.ts";

test("auditSync: passes clean copy", () => {
  const report = auditSync({ piece_id: "p1", text: "Try our new product today!" });
  assert.equal(report.pass, true);
  assert.deepEqual(report.violations, []);
});

test("auditSync: blocks a medical cure claim", () => {
  const report = auditSync({ piece_id: "p2", text: "This supplement cures anxiety." });
  assert.equal(report.pass, false);
  assert.ok(report.violations.some((v) => v.rule_id === "health.medical_claim"));
});

test("auditSync: blocks a guaranteed-return finance claim", () => {
  const report = auditSync({ piece_id: "p3", text: "Guaranteed return of 20% every month." });
  assert.equal(report.pass, false);
  assert.ok(report.violations.some((v) => v.rule_id === "finance.guaranteed_return"));
});

test("auditSync: warns (does not block) on unsourced superiority claims", () => {
  const report = auditSync({ piece_id: "p4", text: "Our app is better than Notion." });
  assert.equal(report.pass, true);
  assert.ok(report.warnings.some((v) => v.rule_id === "comparison.unsourced_superiority"));
});

test("auditSync: before/after framing requires a disclaimer", () => {
  const withoutDisclaimer = auditSync({ piece_id: "p5", text: "Look at this before/after transformation." });
  assert.equal(withoutDisclaimer.pass, false);
  assert.ok(withoutDisclaimer.violations.some((v) => v.rule_id === "audience.before_after_no_disclaimer"));

  const withDisclaimer = auditSync({
    piece_id: "p6",
    text: "Look at this before/after transformation.",
    before_after_disclaimer: true,
  });
  assert.equal(withDisclaimer.pass, true);
});

test("auditSync: extra_rules are merged with the base rule set", () => {
  const report = auditSync({
    piece_id: "p7",
    text: "Use promo code BANNED123 now.",
    extra_rules: [
      {
        rule_id: "custom.banned_code",
        category: "legal",
        pattern: /BANNED123/,
        severity: "block",
      },
    ],
  });
  assert.equal(report.pass, false);
  assert.ok(report.violations.some((v) => v.rule_id === "custom.banned_code"));
});

test("auditSync: vertical-scoped rules only apply within applies_to", () => {
  const rule = {
    rule_id: "custom.scoped",
    category: "legal" as const,
    pattern: /widget/,
    severity: "block" as const,
    applies_to: ["saas"],
  };
  const outOfScope = auditSync({ piece_id: "p8", text: "widget", vertical: "health", extra_rules: [rule] });
  assert.equal(outOfScope.pass, true);

  const inScope = auditSync({ piece_id: "p9", text: "widget", vertical: "saas", extra_rules: [rule] });
  assert.equal(inScope.pass, false);
});

test("audit: async wrapper mirrors auditSync in DRY_RUN", async () => {
  const report = await audit({ piece_id: "p10", text: "Perfectly compliant copy." });
  assert.equal(report.pass, true);
  assert.deepEqual(report.checked_against, ["product/COMPLIANCE.md"]);
});

test("writeReport: persists the report as JSON under data/compliance", () => {
  const dir = mkdtempSync(join(tmpdir(), "compliance-test-"));
  try {
    const report = auditSync({ piece_id: "wr-1", text: "All good here." });
    const path = writeReport(dir, report);
    assert.equal(path.endsWith(join("data", "compliance", "wr-1.json")), true);
    const persisted = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(persisted.piece_id, "wr-1");
    assert.equal(persisted.pass, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
