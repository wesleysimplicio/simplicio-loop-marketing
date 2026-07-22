import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { inspectQualityGate, REQUIRED_COMMANDS } from "../../lib/ci/quality-gate.ts";

test("repository quality gate is blocking, complete, and enforces documented coverage", () => {
  const report = inspectQualityGate();
  assert.deepEqual(report.errors, []);
  assert.equal(report.pass, true);
  assert.deepEqual(report.coverage, { lines: 85, statements: 85, functions: 85, branches: 70 });
  assert.equal(REQUIRED_COMMANDS.length, 7);
});

test("integrity check fails closed when a workflow command and coverage enforcement drift", () => {
  const root = mkdtempSync(join(tmpdir(), "quality-gate-"));
  try {
    cpSync(".github", join(root, ".github"), { recursive: true });
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    pkg.scripts.coverage = "c8 npm run test:node";
    writeFileSync(join(root, "package.json"), JSON.stringify(pkg));
    const workflowPath = join(root, ".github/workflows/quality-gate.yml");
    writeFileSync(workflowPath, readFileSync(workflowPath, "utf8").replace("      - run: npm run lint\n", ""));

    const report = inspectQualityGate(root);
    assert.equal(report.pass, false);
    assert.ok(report.errors.includes("workflow does not run: npm run lint"));
    assert.ok(report.errors.includes("coverage script must fail when thresholds are missed"));
    assert.ok(report.errors.includes("lines coverage threshold must be at least 85%"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("integrity check reports missing workflow and package references instead of throwing", () => {
  const root = mkdtempSync(join(tmpdir(), "quality-gate-empty-"));
  try {
    const report = inspectQualityGate(root);
    assert.equal(report.pass, false);
    assert.match(report.errors.join("\n"), /missing \.github|package\.json|pull_request/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
