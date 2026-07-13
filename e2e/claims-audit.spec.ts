import { test, expect } from "@playwright/test";
import { cpSync } from "node:fs";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error mjs helper has no local declaration file
import { auditClaims } from "../scripts/claims-audit.mjs";

function cloneFixtureDir(): string {
  const root = mkdtempSync(join(tmpdir(), "me-claims-audit-"));
  mkdirSync(join(root, ".skills", "watcher-gate"), { recursive: true });
  mkdirSync(join(root, ".specs", "architecture"), { recursive: true });
  mkdirSync(join(root, ".specs", "pieces"), { recursive: true });
  mkdirSync(join(root, "lib", "providers", "__mocks__"), { recursive: true });
  for (const rel of [
    "CLAUDE.md",
    ".env.example",
    ".specs/architecture/PROVIDERS.md",
    ".specs/pieces/piece-template.md",
    ".skills/watcher-gate/SKILL.md",
    "lib/providers/llm.ts",
    "lib/providers/image.ts",
    "lib/providers/video.ts",
    "lib/providers/__mocks__/llm.ts",
    "lib/providers/__mocks__/image.ts",
    "lib/providers/__mocks__/video.ts",
  ]) {
    cpSync(join(process.cwd(), rel), join(root, rel), { recursive: true });
  }
  return root;
}

test("claims audit names a missing documented skill", () => {
  const root = cloneFixtureDir();
  const skill = join(root, ".skills", "watcher-gate", "SKILL.md");
  const backup = readFileSync(skill, "utf8");
  rmSync(skill);
  expect(auditClaims(root)).toContain("skill claim missing: watcher-gate");
  writeFileSync(skill, backup);
});

test("claims audit names undocumented provider implementations", () => {
  const root = cloneFixtureDir();
  const providerFile = join(root, "lib", "providers", "rogue.ts");
  mkdirSync(join(root, "lib", "providers"), { recursive: true });
  writeFileSync(providerFile, 'export class RogueProvider { readonly name = "rogue"; }');
  expect(auditClaims(root)).toContain("provider implementation undocumented in PROVIDERS.md: rogue");
});
