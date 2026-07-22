import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("clean packed installation runs the full extension conformance without checkout coupling", () => {
  const root = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), "marketing-extension-install-"));
  const packed = JSON.parse(execFileSync("npm", ["pack", "--json", "--pack-destination", dir], { cwd: root, encoding: "utf8" }));
  const tarball = join(dir, packed[0].filename);
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], { cwd: dir, stdio: "pipe" });
  const installed = join(dir, "node_modules", "marketing-engine");
  const output = execFileSync(process.execPath, ["--import", "tsx/esm", join(installed, "lib/cli/conformance.ts"), installed], { cwd: dir, encoding: "utf8" });
  const report = JSON.parse(output);
  expect(report.status).toBe("PASS");
  expect(report.modes).toEqual(["embedded", "daemon", "remote"]);
  expect(report.checks.find((x: any) => x.id === "exactly-once").detail).toBe("1 external effect");
  const source = JSON.parse(readFileSync(join(root, ".specs/extensions/loop.marketing.json"), "utf8"));
  const packaged = JSON.parse(readFileSync(join(installed, ".specs/extensions/loop.marketing.json"), "utf8"));
  expect(packaged).toEqual(source);
});
