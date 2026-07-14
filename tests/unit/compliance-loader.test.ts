'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAudit, loadOverrideRules, clientOverridePath, detectStreaks, activeClient } from "../../lib/compliance/loader.ts";
import { writePiece } from "../../lib/pieces/store.ts";

function piece(overrides: Record<string, unknown> = {}) {
  return {
    frontmatter: {
      id: "p1",
      client: "acme",
      date: "2026-05-08",
      status: "draft" as const,
      type: "reel",
      pillar: "education",
      platforms: ["instagram"],
      locale: "en",
      ...overrides,
    },
    body: "brief",
  };
}

test("activeClient: defaults to saas-consultoria-imagem, honors ACTIVE_CLIENT env", () => {
  delete process.env.ACTIVE_CLIENT;
  assert.equal(activeClient(), "saas-consultoria-imagem");
  process.env.ACTIVE_CLIENT = "custom-client";
  try {
    assert.equal(activeClient(), "custom-client");
  } finally {
    delete process.env.ACTIVE_CLIENT;
  }
});

test("loadOverrideRules: returns no rules when the override file is absent", () => {
  const root = mkdtempSync(join(tmpdir(), "me-loader-nooverride-"));
  const { path, rules } = loadOverrideRules("acme", root);
  assert.equal(rules.length, 0);
  assert.equal(path, clientOverridePath("acme", root));
});

test("loadOverrideRules: parses a fenced JSON block of extra rules", () => {
  const root = mkdtempSync(join(tmpdir(), "me-loader-override-"));
  const dir = join(root, ".specs", "clients", "acme");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "COMPLIANCE.override.md"),
    [
      "# Overrides",
      "```json",
      JSON.stringify([
        {
          rule_id: "custom.no-guarantee",
          category: "medical",
          pattern: "guaranteed results",
          severity: "block",
          remediation: "remove guarantee language",
        },
      ]),
      "```",
    ].join("\n"),
  );
  const { rules } = loadOverrideRules("acme", root);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].rule_id, "custom.no-guarantee");
  assert.ok(rules[0].pattern.test("we offer guaranteed results"));
});

test("loadOverrideRules: an override file without a JSON block yields no rules", () => {
  const root = mkdtempSync(join(tmpdir(), "me-loader-nojson-"));
  const dir = join(root, ".specs", "clients", "acme");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "COMPLIANCE.override.md"), "# Overrides\nNo rules here.");
  const { rules } = loadOverrideRules("acme", root);
  assert.equal(rules.length, 0);
});

test("runAudit: a passing piece writes a report and does not create a blocked artefact", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-loader-pass-"));
  const { report, report_path } = await runAudit({
    piece_id: "p1",
    text: "Great tips for your morning routine.",
    client: "acme",
    root,
  });
  assert.equal(report.pass, true);
  assert.ok(existsSync(report_path));
  assert.equal(existsSync(join(root, "data", "compliance-blocked", "p1.json")), false);
});

test("runAudit: a blocked piece writes the blocked artefact, history entry, and transitions a draft piece to review", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-loader-block-"));
  const piecesDir = join(root, "pieces");
  writePiece(piece({ id: "p2" }), { piecesDir });
  const { report } = await runAudit({
    piece_id: "p2",
    text: "This treatment cures cancer guaranteed.",
    client: "acme",
    root,
    vertical: "health",
  });
  assert.equal(report.pass, false);
  assert.ok(existsSync(join(root, "data", "compliance-blocked", "p2.json")));
  const history = readFileSync(join(root, "data", "compliance-history.jsonl"), "utf8");
  assert.ok(history.trim().length > 0);
  // the piece should have moved from draft -> review
  const movedPath = join(piecesDir, "p2.md");
  const content = readFileSync(movedPath, "utf8");
  assert.match(content, /status:\s*review/);
});

test("runAudit: applies client override rules and records the override doc as checked_against", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-loader-override-audit-"));
  const overrideDir = join(root, ".specs", "clients", "acme");
  mkdirSync(overrideDir, { recursive: true });
  writeFileSync(
    join(overrideDir, "COMPLIANCE.override.md"),
    [
      "```json",
      JSON.stringify([
        { rule_id: "custom.banned-phrase", category: "medical", pattern: "banned phrase", severity: "block" },
      ]),
      "```",
    ].join("\n"),
  );
  const { report } = await runAudit({
    piece_id: "p3",
    text: "This contains a banned phrase in it.",
    client: "acme",
    root,
  });
  assert.equal(report.pass, false);
  assert.ok(report.checked_against.some((c) => c.includes("COMPLIANCE.override.md")));
});

test("detectStreaks: returns an empty array without a history file", () => {
  const root = mkdtempSync(join(tmpdir(), "me-loader-streak-empty-"));
  assert.deepEqual(detectStreaks(root), []);
});

test("detectStreaks: flags 3+ recent blocks for the same client/rule within the window", () => {
  const root = mkdtempSync(join(tmpdir(), "me-loader-streak-"));
  const dataDir = join(root, "data");
  mkdirSync(dataDir, { recursive: true });
  const now = new Date().toISOString();
  const rows = [
    { ts: now, client: "acme", rule_id: "medical.claims", piece_id: "p1" },
    { ts: now, client: "acme", rule_id: "medical.claims", piece_id: "p2" },
    { ts: now, client: "acme", rule_id: "medical.claims", piece_id: "p3" },
    { ts: new Date(Date.now() - 20 * 86400 * 1000).toISOString(), client: "acme", rule_id: "medical.claims", piece_id: "old" },
    "not-json",
  ];
  writeFileSync(
    join(dataDir, "compliance-history.jsonl"),
    rows.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join("\n") + "\n",
  );
  const streaks = detectStreaks(root);
  assert.equal(streaks.length, 1);
  assert.equal(streaks[0].client, "acme");
  assert.equal(streaks[0].count, 3);
});

test("runAudit: repeated blocks for the same client/rule append streak alerts to learnings.md", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-loader-streak-audit-"));
  for (let i = 0; i < 3; i++) {
    await runAudit({
      piece_id: `p${i}`,
      text: "This treatment cures cancer guaranteed.",
      client: "acme",
      root,
      vertical: "health",
    });
  }
  const learnings = readFileSync(join(root, "data", "learnings.md"), "utf8");
  assert.match(learnings, /compliance streak/);
});
