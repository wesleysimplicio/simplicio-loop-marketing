import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI = resolve(__dirname, "..", "bin", "marketing-engine.mjs");

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
  });
}

test("help command exits 0 and prints usage banner", () => {
  const result = run(["help"]);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("marketing-engine");
  expect(result.stdout).toContain("Usage:");
  expect(result.stdout).toContain("init");
  expect(result.stdout).toContain("scan");
  expect(result.stdout).toContain("check");
});

test("--help flag exits 0 and prints usage banner", () => {
  const result = run(["--help"]);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("marketing-engine");
  expect(result.stdout).toContain("Commands:");
});

test("-h flag exits 0 and prints usage banner", () => {
  const result = run(["-h"]);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("marketing-engine");
});

test("no-arg invocation prints usage and exits 0", () => {
  const result = run([]);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("marketing-engine");
  expect(result.stdout).toContain("Commands:");
});

test("unknown command exits 1 and surfaces the bad name", () => {
  const result = run(["unknowncmd"]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Unknown command: unknowncmd");
  expect(result.stderr).toContain("Usage:");
});

test("generate command runs under DRY_RUN and prints a summary line", () => {
  const result = run(["generate"]);
  expect(result.status === 0 || result.status === 2).toBe(true);
  expect(result.stdout).toContain("generate:");
});

test("promote command runs under DRY_RUN and prints a summary line", () => {
  const result = run(["promote"]);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("promote:");
});
