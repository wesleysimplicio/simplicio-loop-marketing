'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runWatcherChecks,
  determineTag,
  runGate,
  writeWatcherReport,
  readWatcherReport,
  checkClaimsGate,
  type WatcherInput,
  type WatcherReport,
} from "../../lib/gate/watcher-gate.ts";

function input(overrides: Partial<WatcherInput> = {}): WatcherInput {
  return {
    piece_id: "p1",
    script: "A clear script about growing your morning habits and routine consistency.",
    caption: "Build a better morning routine today. #education",
    brief: "morning habits routine consistency growth",
    platform: "instagram",
    pillar: "education",
    ...overrides,
  };
}

test("runWatcherChecks: passes all checks for a clean, on-topic, on-brand piece", () => {
  const checks = runWatcherChecks(input());
  const byChannel = Object.fromEntries(checks.map((c) => [c.channel, c]));
  assert.equal(byChannel["caption.pillar_hashtag"].match, true);
  assert.equal(byChannel["script.topic_coverage"].match, true);
  assert.equal(byChannel["caption.length"].match, true);
  assert.equal(byChannel["script.placeholder"].match, true);
  assert.equal(byChannel["claims.overpromise"].match, true);
});

test("runWatcherChecks: flags a missing pillar hashtag as a warn-severity mismatch", () => {
  const checks = runWatcherChecks(input({ caption: "No hashtag here." }));
  const check = checks.find((c) => c.channel === "caption.pillar_hashtag")!;
  assert.equal(check.match, false);
  assert.equal(check.severity, "warn");
});

test("runWatcherChecks: flags insufficient topic coverage as a blocking mismatch", () => {
  const checks = runWatcherChecks(
    input({ script: "Totally unrelated content about something else entirely." }),
  );
  const check = checks.find((c) => c.channel === "script.topic_coverage")!;
  assert.equal(check.match, false);
  assert.equal(check.severity, "block");
});

test("runWatcherChecks: an empty brief always yields full topic coverage", () => {
  const checks = runWatcherChecks(input({ brief: "" }));
  const check = checks.find((c) => c.channel === "script.topic_coverage")!;
  assert.equal(check.match, true);
});

test("runWatcherChecks: enforces per-platform caption length limits", () => {
  const longCaption = "x".repeat(200);
  const checks = runWatcherChecks(input({ platform: "tiktok", caption: longCaption }));
  const check = checks.find((c) => c.channel === "caption.length")!;
  assert.equal(check.match, false);
  assert.match(check.recomputed, /exceeds 150 limit/);
});

test("runWatcherChecks: unknown platforms fall back to the 2200-char default limit", () => {
  const checks = runWatcherChecks(input({ platform: "mastodon", caption: "short" }));
  const check = checks.find((c) => c.channel === "caption.length")!;
  assert.match(check.recomputed, /within 2200 limit/);
});

test("runWatcherChecks: detects a leaked placeholder in the script", () => {
  const checks = runWatcherChecks(input({ script: "Write about [INSERT TOPIC HERE] today." }));
  const check = checks.find((c) => c.channel === "script.placeholder")!;
  assert.equal(check.match, false);
  assert.match(check.recomputed, /found placeholder/);
});

test("runWatcherChecks: a numeric bracket like [1] is not treated as a placeholder", () => {
  const checks = runWatcherChecks(input({ script: "Source [1] confirms the routine works well for most people testing it out for weeks." }));
  const check = checks.find((c) => c.channel === "script.placeholder")!;
  assert.equal(check.match, true);
});

test("runWatcherChecks: DRY_RUN=true strips [mock-*] attestation markers before the placeholder scan", () => {
  process.env.DRY_RUN = "true";
  try {
    const checks = runWatcherChecks(
      input({ script: "[mock-claude] A clear script about morning habits and routine consistency for growth." }),
    );
    const check = checks.find((c) => c.channel === "script.placeholder")!;
    assert.equal(check.match, true);
  } finally {
    delete process.env.DRY_RUN;
  }
});

test("runWatcherChecks: [mock-*] markers still count as leaked placeholders outside DRY_RUN", () => {
  delete process.env.DRY_RUN;
  const checks = runWatcherChecks(
    input({ script: "[mock-claude] A clear script about morning habits and routine consistency for growth." }),
  );
  const check = checks.find((c) => c.channel === "script.placeholder")!;
  assert.equal(check.match, false);
});

test("runWatcherChecks: flags overpromise language in either the script or the caption", () => {
  const inScript = runWatcherChecks(input({ script: "This plan has guaranteed results for everyone." }));
  const inCaption = runWatcherChecks(input({ caption: "Instant results guaranteed! #education" }));
  assert.equal(inScript.find((c) => c.channel === "claims.overpromise")!.match, false);
  assert.equal(inCaption.find((c) => c.channel === "claims.overpromise")!.match, false);
});

test("determineTag: MEASURED when all block-severity checks pass", () => {
  const { tag, passed } = determineTag([
    { channel: "a", claimed: "", recomputed: "", match: true, severity: "block" },
    { channel: "b", claimed: "", recomputed: "", match: false, severity: "warn" },
  ]);
  assert.equal(tag, "MEASURED");
  assert.equal(passed, true);
});

test("determineTag: UNVERIFIED when any block-severity check fails", () => {
  const { tag, passed } = determineTag([
    { channel: "a", claimed: "", recomputed: "", match: false, severity: "block" },
  ]);
  assert.equal(tag, "UNVERIFIED");
  assert.equal(passed, false);
});

test("runGate: end-to-end produces a timestamped report matching determineTag", () => {
  const report = runGate(input());
  assert.equal(report.piece_id, "p1");
  assert.equal(report.tag, "MEASURED");
  assert.equal(report.passed, true);
  assert.ok(report.checked_at);
  assert.ok(report.checked.length >= 5);
});

test("writeWatcherReport + readWatcherReport: round-trips through disk", () => {
  const root = mkdtempSync(join(tmpdir(), "me-watcher-gate-"));
  const report = runGate(input());
  const path = writeWatcherReport(root, report);
  assert.match(path, /p1\.json$/);
  const readBack = readWatcherReport(root, "p1");
  assert.deepEqual(readBack, report);
});

test("readWatcherReport: returns null for a missing file and for malformed JSON", () => {
  const root = mkdtempSync(join(tmpdir(), "me-watcher-gate-missing-"));
  assert.equal(readWatcherReport(root, "nope"), null);
});

test("checkClaimsGate: blocks when there is no report at all", () => {
  const result = checkClaimsGate("p1", null);
  assert.equal(result.blocked, true);
  assert.equal(result.tag, "UNVERIFIED");
  assert.match(result.reason!, /No watcher report found/);
});

test("checkClaimsGate: blocks and lists failing checks when the report is UNVERIFIED", () => {
  const report: WatcherReport = {
    piece_id: "p1",
    tag: "UNVERIFIED",
    passed: false,
    checked: [
      { channel: "script.topic_coverage", claimed: "x", recomputed: "10% coverage", match: false, severity: "block" },
    ],
    checked_at: new Date().toISOString(),
  };
  const result = checkClaimsGate("p1", report);
  assert.equal(result.blocked, true);
  assert.match(result.reason!, /script.topic_coverage: 10% coverage/);
});

test("checkClaimsGate: a MEASURED report passes through unblocked", () => {
  const report: WatcherReport = {
    piece_id: "p1",
    tag: "MEASURED",
    passed: true,
    checked: [],
    checked_at: new Date().toISOString(),
  };
  const result = checkClaimsGate("p1", report);
  assert.equal(result.blocked, false);
  assert.equal(result.reason, undefined);
});
