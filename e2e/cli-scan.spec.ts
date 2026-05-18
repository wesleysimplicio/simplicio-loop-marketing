import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const CLI = resolve(__filename, "..", "..", "bin", "marketing-engine.mjs");

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

test("scan regenerates draft files based on package.json signals", () => {
  const host = mkdtempSync(join(tmpdir(), "me-scan-"));
  writeFileSync(
    join(host, "package.json"),
    JSON.stringify({
      name: "scan-target",
      description: "auto-scanned",
      keywords: ["ai", "marketing"],
    }),
  );
  writeFileSync(join(host, "README.md"), "# scan-target\n\nA test app.\n");
  expect(run(["init", "--root", host]).status).toBe(0);
  const r = run(["scan", "--root", host]);
  expect(r.status).toBe(0);
  const draft = readFileSync(
    join(host, ".marketing-engine", "BRAND.draft.md"),
    "utf8",
  );
  expect(draft).toContain("scan-target");
  expect(draft).toContain("auto-scanned");
});
