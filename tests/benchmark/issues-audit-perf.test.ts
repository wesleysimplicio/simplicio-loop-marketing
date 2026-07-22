import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";
import { auditIssues } from "../../lib/audit/issues.ts";

test("audits 10,000 issue records within 1.5 seconds", () => {
  const issues = Array.from({ length: 10_000 }, (_, index) => ({ number: index + 1, title: "Issue", state: index % 2 ? "open" : "closed",
    created_at: new Date(1_700_000_000_000 + index).toISOString(), updated_at: "2026-01-01T00:00:00Z", closed_at: null,
    body: "## Objetivo\nMelhorar performance #1", html_url: `https://example.test/${index + 1}`, labels: [], milestone: null }));
  const started = performance.now();
  const audit = auditIssues(issues);
  const elapsedMs = performance.now() - started;
  assert.equal(audit.total, 10_000);
  assert.ok(elapsedMs < 1_500, `10,000 records took ${elapsedMs.toFixed(1)} ms`);
  process.stderr.write(`issue-audit benchmark: 10000 records in ${elapsedMs.toFixed(1)} ms\n`);
});
