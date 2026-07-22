import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

test("operator doctor returns machine JSON and blocks missing critical core capabilities", () => {
  const result = spawnSync(process.execPath, [resolve("bin/marketing-engine.mjs"), "operator", "doctor", "--json"], {
    cwd: process.cwd(), encoding: "utf8", env: { ...process.env, SIMPLICIO_LOOP_ROOT: "/tmp/simplicio-loop-upstream" },
  });
  expect(result.status).toBe(2);
  const report = JSON.parse(result.stdout);
  expect(report.schema).toBe("loop.marketing-operator-doctor/v1");
  expect(report.probe.status).toBe("BLOCKED");
  expect(report.probe.reason_code).toBe("REQUIRED_CAPABILITY_MISSING");
  expect(report.probe.manifest_sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(report.probe.corrective_action).toContain("extension_reconcile");
});
