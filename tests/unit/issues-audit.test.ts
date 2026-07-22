import assert from "node:assert/strict";
import test from "node:test";
import { REQUIRED_SECTIONS, auditIssue, auditIssues } from "../../lib/audit/issues.ts";

const completeBody = REQUIRED_SECTIONS.map((section) => `## ${section}\nMeasured baseline: 12 ms. Timeout and rollback are specified.`).join("\n");
const issue = (overrides = {}) => ({ number: 2, title: "Example", state: "open", created_at: "2026-01-02T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z", closed_at: null, body: completeBody, html_url: "https://example.test/2",
  labels: [{ name: "P0" }], milestone: null, ...overrides });

test("recognizes the complete, measurable issue contract", () => {
  const finding = auditIssue(issue());
  assert.deepEqual(finding.missingSections, []);
  assert.deepEqual(finding.risks, []);
  assert.equal(finding.decision, "REVIEWED");
});

test("fails closed for missing sections, unmeasured claims, timeout and rollback", () => {
  const finding = auditIssue(issue({ body: "## Objetivo\nMelhorar performance. Depends on #9; bloqueada por #7." }));
  assert.equal(finding.decision, "NEEDS-SPEC");
  assert.deepEqual(finding.dependencies, [7]);
  assert.deepEqual(finding.references, [7, 9]);
  assert.ok(finding.risks.includes("unmeasured-claim"));
  assert.ok(finding.risks.includes("timeout-unspecified"));
  assert.ok(finding.risks.includes("rollback-unspecified"));
});

test("flags secret-shaped examples without retaining any derived secret", () => {
  const finding = auditIssue(issue({ body: completeBody + "\nAPI_KEY=abcdefghijklmnop" }));
  assert.ok(finding.risks.includes("possible-secret"));
  assert.equal(JSON.stringify(finding).includes("abcdefghijklmnop"), false);
});

test("inventory excludes pull requests and sorts oldest first", () => {
  const audit = auditIssues([issue(), issue({ number: 1, created_at: "2026-01-01T00:00:00Z", state: "closed" }), issue({ number: 3, pull_request: {} })]);
  assert.equal(audit.total, 2);
  assert.deepEqual(audit.findings.map((item) => item.number), [1, 2]);
  assert.deepEqual(audit.byState, { closed: 1, open: 1 });
  assert.equal(audit.compliancePercent, 100);
});
