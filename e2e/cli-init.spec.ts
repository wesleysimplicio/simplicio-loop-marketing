import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const CLI = resolve(__filename, "..", "..", "bin", "marketing-engine.mjs");

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

test("init scaffolds .marketing-engine/ tree in a tmp host root", () => {
  const host = mkdtempSync(join(tmpdir(), "me-init-"));
  writeFileSync(
    join(host, "package.json"),
    JSON.stringify({ name: "host-app", description: "demo" }),
  );
  const r = run(["init", "--root", host]);
  expect(r.status).toBe(0);
  const root = join(host, ".marketing-engine");
  for (const f of [
    "BRAND.md",
    "PILLARS.md",
    "PERSONAS.md",
    "COMPLIANCE.md",
    "CHANNELS.md",
    "README.md",
    "pieces/.gitkeep",
    "outputs/.gitkeep",
    "data/.gitkeep",
  ]) {
    expect(existsSync(join(root, f))).toBe(true);
  }
  const gi = readFileSync(join(host, ".gitignore"), "utf8");
  expect(gi).toContain(".marketing-engine/.env");
  expect(gi).toContain(".marketing-engine/outputs/*");
});
