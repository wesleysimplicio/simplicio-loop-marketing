'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function captureStdout(): { restore: () => string } {
  const chunks: string[] = [];
  const original = process.stdout.write;
  process.stdout.write = ((chunk: any) => { chunks.push(String(chunk)); return true; }) as typeof process.stdout.write;
  return { restore: () => { process.stdout.write = original; return chunks.join(""); } };
}
function captureStderr(): { restore: () => string } {
  const chunks: string[] = [];
  const original = process.stderr.write;
  process.stderr.write = ((chunk: any) => { chunks.push(String(chunk)); return true; }) as typeof process.stderr.write;
  return { restore: () => { process.stderr.write = original; return chunks.join(""); } };
}
function stubExit(): { calls: number[]; restore: () => void } {
  const calls: number[] = [];
  const original = process.exit;
  process.exit = ((code?: number) => { calls.push(code ?? 0); throw new Error(`__exit_${code ?? 0}__`); }) as typeof process.exit;
  return { calls, restore: () => { process.exit = original; } };
}

test("cli/new-piece: creates a piece file under .marketing-engine/pieces and prints its path", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-cli-newpiece-"));
  const piecesDir = join(root, ".marketing-engine", "pieces");
  mkdirSync(piecesDir, { recursive: true });
  process.env.MARKETING_ENGINE_HOST_ROOT = root;
  const { cliEntry } = await import("../../lib/cli/new-piece.ts");
  const cap = captureStdout();
  try {
    await cliEntry(["--client", "acme", "--pillar", "education", "--channel", "instagram", "--date", "2026-05-08"]);
    const out = cap.restore();
    assert.ok(existsSync(out.trim()));
    const content = readFileSync(out.trim(), "utf8");
    assert.match(content, /client:\s*acme/);
  } finally {
    delete process.env.MARKETING_ENGINE_HOST_ROOT;
  }
});

test("cli/new-piece: increments the weekly sequence when prior pieces exist for the same ISO week", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-cli-newpiece-seq-"));
  const piecesDir = join(root, ".marketing-engine", "pieces");
  mkdirSync(piecesDir, { recursive: true });
  process.env.MARKETING_ENGINE_HOST_ROOT = root;
  const { cliEntry } = await import("../../lib/cli/new-piece.ts");
  const cap1 = captureStdout();
  await cliEntry(["--client", "acme", "--pillar", "education", "--channel", "instagram", "--date", "2026-05-08"]);
  const first = cap1.restore().trim();
  const cap2 = captureStdout();
  try {
    await cliEntry(["--client", "acme", "--pillar", "education", "--channel", "instagram", "--date", "2026-05-08"]);
    const second = cap2.restore().trim();
    assert.notEqual(first, second);
  } finally {
    delete process.env.MARKETING_ENGINE_HOST_ROOT;
  }
});

test("cli/new-piece: missing required flags exits 1 with a usage message", async () => {
  const { cliEntry } = await import("../../lib/cli/new-piece.ts");
  const errCap = captureStderr();
  const exitStub = stubExit();
  try {
    await assert.rejects(() => cliEntry(["--client", "acme"]), /__exit_1__/);
  } finally {
    const err = errCap.restore();
    exitStub.restore();
    assert.match(err, /usage: marketing-engine new-piece/);
  }
});

test("cli/new-piece: an invalid --date value exits 1", async () => {
  const { cliEntry } = await import("../../lib/cli/new-piece.ts");
  const errCap = captureStderr();
  const exitStub = stubExit();
  try {
    await assert.rejects(
      () => cliEntry(["--client", "acme", "--pillar", "education", "--channel", "instagram", "--date", "not-a-date"]),
      /__exit_1__/,
    );
  } finally {
    const err = errCap.restore();
    exitStub.restore();
    assert.match(err, /--date must be a valid/);
  }
});

test("cli/new-piece: missing .marketing-engine workspace exits 2", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-cli-newpiece-noworkspace-"));
  process.env.MARKETING_ENGINE_HOST_ROOT = root;
  const { cliEntry } = await import("../../lib/cli/new-piece.ts");
  const errCap = captureStderr();
  const exitStub = stubExit();
  try {
    await assert.rejects(
      () => cliEntry(["--client", "acme", "--pillar", "education", "--channel", "instagram"]),
      /__exit_2__/,
    );
  } finally {
    const err = errCap.restore();
    exitStub.restore();
    delete process.env.MARKETING_ENGINE_HOST_ROOT;
    assert.match(err, /workspace not found/);
  }
});

test("cli/new-piece: workspace exists but pieces dir missing exits 2", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-cli-newpiece-nopieces-"));
  mkdirSync(join(root, ".marketing-engine"), { recursive: true });
  process.env.MARKETING_ENGINE_HOST_ROOT = root;
  const { cliEntry } = await import("../../lib/cli/new-piece.ts");
  const errCap = captureStderr();
  const exitStub = stubExit();
  try {
    await assert.rejects(
      () => cliEntry(["--client", "acme", "--pillar", "education", "--channel", "instagram"]),
      /__exit_2__/,
    );
  } finally {
    const err = errCap.restore();
    exitStub.restore();
    delete process.env.MARKETING_ENGINE_HOST_ROOT;
    assert.match(err, /pieces directory not found/);
  }
});
