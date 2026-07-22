import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { scanInternalFormats } from "../../lib/policy/internal-formats.mjs";

test("scans 1,000 source files within the policy-gate budget", () => {
  const root = mkdtempSync(join(tmpdir(), "format-bench-"));
  mkdirSync(join(root, "config"));
  writeFileSync(join(root, "config", "json-boundaries.toml"), "version = 2\n");
  for (let i = 0; i < 1_000; i++) writeFileSync(join(root, `source-${i}.ts`), "export const value = 1;\n");
  const start = performance.now();
  const report = scanInternalFormats({ root });
  const elapsedMs = performance.now() - start;
  assert.equal(report.unknown.length, 0);
  assert.ok(elapsedMs < 1_000, `1,000-file scan took ${elapsedMs.toFixed(2)}ms`);
  process.stderr.write(`internal-format benchmark: files=1000 elapsed_ms=${elapsedMs.toFixed(2)}\n`);
});
