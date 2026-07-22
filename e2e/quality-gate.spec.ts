import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

test("quality-gate workflow can be verified locally without GitHub Actions", () => {
  const output = execFileSync(process.execPath, ["--import", "tsx/esm", "scripts/verify-quality-gate.mjs"], { encoding: "utf8" });
  const report = JSON.parse(output);
  expect(report.pass).toBe(true);
  expect(report.errors).toEqual([]);
  expect(report.coverage.lines).toBeGreaterThanOrEqual(85);
});
