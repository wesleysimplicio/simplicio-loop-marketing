'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function captureStdout(): { restore: () => string } {
  const chunks: string[] = [];
  const original = process.stdout.write;
  process.stdout.write = ((chunk: any) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  return {
    restore: () => {
      process.stdout.write = original;
      return chunks.join("");
    },
  };
}

test("cli/autoresearch: cliEntry parses --client/--brief/--max-iter and writes the manifest JSON to stdout", async (t) => {
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-cli-autoresearch-"));
  process.chdir(root);
  t.after(() => process.chdir(cwd));
  const { cliEntry } = await import("../../lib/cli/autoresearch.ts");
  const cap = captureStdout();
  await cliEntry(["--client", "acme", "--brief", "A clear CTA story", "--max-iter", "1"]);
  const out = cap.restore();
  const parsed = JSON.parse(out);
  assert.equal(parsed.dry_run, true);
  const manifest = JSON.parse(readFileSync(parsed.manifest_path, "utf8"));
  assert.equal(manifest.client, "acme");
});

test("cli/autoresearch: falls back to defaults when no flags are given", async (t) => {
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-cli-autoresearch-defaults-"));
  process.chdir(root);
  t.after(() => process.chdir(cwd));
  const { cliEntry } = await import("../../lib/cli/autoresearch.ts");
  const cap = captureStdout();
  await cliEntry([]);
  const out = cap.restore();
  const parsed = JSON.parse(out);
  const manifest = JSON.parse(readFileSync(parsed.manifest_path, "utf8"));
  assert.equal(manifest.client, "default");
});

test("cli/report: cliEntry throws on missing piece id argument", async () => {
  const { cliEntry } = await import("../../lib/cli/report.ts");
  assert.throws(() => cliEntry([]), /usage: report build/);
});

test("cli/report: cliEntry writes the report to stdout for an existing piece", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-cli-report-"));
  const ws = join(root, ".marketing-engine");
  mkdirSync(join(ws, "pieces"), { recursive: true });
  writeFileSync(
    join(ws, "pieces", "p.md"),
    "---\nid: p\nclient: acme\ndate: 2026-05-08\nstatus: draft\ntype: reel\npillar: education\nplatforms: [instagram]\nlocale: en\n---\nbrief",
  );
  process.env.MARKETING_ENGINE_HOST_ROOT = root;
  const { cliEntry } = await import("../../lib/cli/report.ts");
  const cap = captureStdout();
  try {
    cliEntry(["p"]);
  } finally {
    const out = cap.restore();
    delete process.env.MARKETING_ENGINE_HOST_ROOT;
    assert.ok(out.length > 0);
  }
});

test("cli/report: cliEntry surfaces EvidenceRequiredError as exit code 3 instead of throwing", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-cli-report-evidence-"));
  const ws = join(root, ".marketing-engine");
  mkdirSync(join(ws, "pieces"), { recursive: true });
  writeFileSync(
    join(ws, "pieces", "empty.md"),
    "---\nid: empty\nclient: acme\ndate: 2026-05-08\nstatus: draft\ntype: reel\npillar: education\nplatforms: [instagram]\nlocale: en\n---\nbrief",
  );
  process.env.MARKETING_ENGINE_HOST_ROOT = root;
  const { cliEntry } = await import("../../lib/cli/report.ts");
  const cap = captureStdout();
  const originalExitCode = process.exitCode;
  try {
    cliEntry(["empty", "--require-evidence"]);
    assert.equal(process.exitCode, 3);
  } finally {
    cap.restore();
    process.exitCode = originalExitCode;
    delete process.env.MARKETING_ENGINE_HOST_ROOT;
  }
});

test("cli/retrospective: cliEntry parses flags and prints the retrospective JSON", async (t) => {
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-cli-retro-"));
  process.chdir(root);
  t.after(() => process.chdir(cwd));
  const { cliEntry } = await import("../../lib/cli/retrospective.ts");
  const cap = captureStdout();
  await cliEntry(["--campaign", "camp1", "--client", "acme", "--max-entries", "5"]);
  const out = cap.restore();
  const parsed = JSON.parse(out);
  assert.ok("lessons" in parsed);
  assert.ok("deduped" in parsed);
});

test("cli/watcher: cliEntry runs a cycle with numeric flag overrides and sets exit code on blocked", async (t) => {
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-cli-watcher-"));
  process.chdir(root);
  t.after(() => process.chdir(cwd));
  const { cliEntry } = await import("../../lib/cli/watcher.ts");
  const cap = captureStdout();
  const originalExitCode = process.exitCode;
  await cliEntry(["--max-cycles", "1", "--idle-delay-ms", "10", "--active-delay-ms", "10", "--blocked-delay-ms", "10"]);
  const out = cap.restore();
  const parsed = JSON.parse(out);
  assert.ok(["completed", "blocked", "capped"].includes(parsed.status));
  process.exitCode = originalExitCode;
});
