'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SAMPLE_BRIEF = `# CAMPAIGN

\`\`\`yaml
id: 2026-Q3-launch-pilot
client_id: acme-saas
title: Launch pilot
owner: wesley
status: active
\`\`\`

\`\`\`yaml
channels:
  primary: hackernews
  secondary: [devto, x]
  test: [reddit-programming]
\`\`\`

\`\`\`yaml
budget:
  currency: USD
  total: 500

  phases:
    - { name: organic-only, weeks: "1-4", paid_amount: 0 }
    - { name: paid-ramp,    weeks: "5-8", paid_amount: 500 }

  promotion_rule: "top 20% organic pieces by save rate get promoted"
\`\`\`

\`\`\`yaml
pieces_per_week: 3
distribution:
  - { pillar: build-in-public, pieces: 2 }
  - { pillar: architecture, pieces: 1 }
\`\`\`
`;

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

function captureStderr(): { restore: () => string } {
  const chunks: string[] = [];
  const original = process.stderr.write;
  process.stderr.write = ((chunk: any) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  return {
    restore: () => {
      process.stderr.write = original;
      return chunks.join("");
    },
  };
}

function stubExit(): { calls: number[]; restore: () => void } {
  const calls: number[] = [];
  const original = process.exit;
  process.exit = ((code?: number) => {
    calls.push(code ?? 0);
    throw new Error(`__exit_${code ?? 0}__`);
  }) as typeof process.exit;
  return { calls, restore: () => { process.exit = original; } };
}

test("cli/campaign: plans and emits a queue from a brief file", async (t) => {
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-cli-campaign-"));
  writeFileSync(join(root, "CAMPAIGN.md"), SAMPLE_BRIEF);
  process.chdir(root);
  t.after(() => process.chdir(cwd));
  const { cliEntry } = await import("../../lib/cli/campaign.ts");
  const cap = captureStdout();
  await cliEntry(["--brief", "CAMPAIGN.md"]);
  const out = cap.restore();
  assert.match(out, /campaign: id=2026-Q3-launch-pilot pieces_queued=6/);
  assert.match(out, /organic_phase_active=true/);
});

test("cli/campaign: review subcommand prints a JSON summary", async (t) => {
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-cli-campaign-review-"));
  const dataDir = join(root, ".marketing-engine", "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "promotions.jsonl"), `${JSON.stringify({ piece_id: "p1" })}\n`);
  process.chdir(root);
  t.after(() => process.chdir(cwd));
  const { cliEntry } = await import("../../lib/cli/campaign.ts");
  const cap = captureStdout();
  await cliEntry(["review", "2026-Q3-launch-pilot"]);
  const out = cap.restore();
  const parsed = JSON.parse(out);
  assert.equal(parsed.winners, 1);
});

test("cli/campaign: review without a campaign id exits 1 with a usage message", async (t) => {
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-cli-campaign-review-missing-"));
  process.chdir(root);
  t.after(() => process.chdir(cwd));
  const { cliEntry } = await import("../../lib/cli/campaign.ts");
  const errCap = captureStderr();
  const exitStub = stubExit();
  try {
    await assert.rejects(() => cliEntry(["review"]), /__exit_1__/);
  } finally {
    const err = errCap.restore();
    exitStub.restore();
    assert.match(err, /missing <campaign-id>/);
    assert.deepEqual(exitStub.calls, [1]);
  }
});

test("cli/campaign: missing --brief flag exits 1 with usage", async (t) => {
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-cli-campaign-nobrief-"));
  process.chdir(root);
  t.after(() => process.chdir(cwd));
  const { cliEntry } = await import("../../lib/cli/campaign.ts");
  const errCap = captureStderr();
  const exitStub = stubExit();
  try {
    await assert.rejects(() => cliEntry([]), /__exit_1__/);
  } finally {
    const err = errCap.restore();
    exitStub.restore();
    assert.match(err, /usage: marketing-engine campaign/);
    assert.deepEqual(exitStub.calls, [1]);
  }
});

test("cli/campaign: brief path that does not exist exits 1", async (t) => {
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-cli-campaign-missingfile-"));
  process.chdir(root);
  t.after(() => process.chdir(cwd));
  const { cliEntry } = await import("../../lib/cli/campaign.ts");
  const errCap = captureStderr();
  const exitStub = stubExit();
  try {
    await assert.rejects(() => cliEntry(["--brief", "NOPE.md"]), /__exit_1__/);
  } finally {
    const err = errCap.restore();
    exitStub.restore();
    assert.match(err, /brief not found/);
    assert.deepEqual(exitStub.calls, [1]);
  }
});
