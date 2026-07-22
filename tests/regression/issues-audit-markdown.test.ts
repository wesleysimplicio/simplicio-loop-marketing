import assert from "node:assert/strict";
import test from "node:test";
import { auditIssues, renderAuditMarkdown } from "../../lib/audit/issues.ts";

test("report records an explicit blocker instead of claiming audit completion", () => {
  const audit = auditIssues([{ number: 1, title: "Legacy", state: "closed", created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z", closed_at: "2020-01-02T00:00:00Z", body: "", html_url: "https://example.test/1", labels: [], milestone: null }]);
  const report = renderAuditMarkdown(audit);
  assert.match(report, /Inventory: \*\*1\*\*/);
  assert.match(report, /\*\*BLOCKED:\*\*/);
  assert.match(report, /NEEDS-SPEC/);
});
