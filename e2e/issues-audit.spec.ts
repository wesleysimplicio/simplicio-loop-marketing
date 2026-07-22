import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("audit CLI writes machine and human receipts from an offline snapshot", () => {
  const dir = mkdtempSync(join(tmpdir(), "issue-audit-"));
  const input = join(dir, "issues.json");
  const json = join(dir, "audit.json");
  const markdown = join(dir, "audit.md");
  writeFileSync(input, JSON.stringify([{ number: 1, title: "Incomplete", state: "open", created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z", closed_at: null, body: "## Objetivo\nSpecific", html_url: "https://example.test/1", labels: [], milestone: null }]));
  const output = execFileSync(process.execPath, ["--import", "tsx/esm", "scripts/audit-issues.mjs", json, markdown],
    { cwd: process.cwd(), env: { ...process.env, AUDIT_ISSUES_INPUT: input }, encoding: "utf8" });
  expect(output).toContain("audited=1 compliant=0 percent=0");
  expect(JSON.parse(readFileSync(json, "utf8"))).toMatchObject({ schema: "marketing-issue-audit/v1", total: 1, compliant: 0 });
  expect(readFileSync(markdown, "utf8")).toContain("**BLOCKED:**");
});
