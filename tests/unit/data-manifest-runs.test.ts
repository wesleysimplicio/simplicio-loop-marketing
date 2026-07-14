'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeManifest, MANIFEST_SCHEMA } from "../../lib/data/manifest.ts";
import { runsLogPath, appendRunLog, readRuns } from "../../lib/data/runs.ts";

test("writeManifest: normalizes string providers into descriptors and defaults optional fields", () => {
  const dir = mkdtempSync(join(tmpdir(), "me-manifest-"));
  const out = join(dir, "piece-a");
  const doc = writeManifest(out, {
    piece_id: "piece-a",
    client: "acme",
    date: "2026-05-08",
    providers: { llm: "claude", image: { name: "gpt-image", version: "1" } },
    prompts: { script: "s" },
    cost_estimate_usd: 0.5,
    compliance_report_path: "C:\\out\\compliance.json",
    outputs: ["a/b", "c/d"],
  });
  assert.equal(doc.schema, MANIFEST_SCHEMA);
  assert.deepEqual(doc.providers.llm, { name: "claude" });
  assert.deepEqual(doc.providers.image, { name: "gpt-image", version: "1" });
  assert.equal(doc.providers.video, undefined);
  assert.equal(doc.tokens_in, 0);
  assert.equal(doc.tokens_out, 0);
  assert.equal(doc.fallback_used, false);
  assert.equal(doc.compliance_report_path, "C:/out/compliance.json");

  const written = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8"));
  assert.equal(written.piece_id, "piece-a");
});

test("writeManifest: accepts a direct .json target path and honors explicit overrides", () => {
  const dir = mkdtempSync(join(tmpdir(), "me-manifest-direct-"));
  const target = join(dir, "sub", "manifest.json");
  const doc = writeManifest(target, {
    piece_id: "p2",
    client: "acme",
    date: "2026-05-08",
    providers: {},
    prompts: {},
    cost_estimate_usd: 1,
    tokens_in: 10,
    tokens_out: 20,
    compliance_report_path: "",
    fallback_used: true,
  });
  assert.equal(doc.tokens_in, 10);
  assert.equal(doc.tokens_out, 20);
  assert.equal(doc.fallback_used, true);
  const written = JSON.parse(readFileSync(target, "utf8"));
  assert.equal(written.piece_id, "p2");
});

test("runsLogPath: resolves data/runs.jsonl under the given root (or cwd by default)", () => {
  const dir = mkdtempSync(join(tmpdir(), "me-runs-path-"));
  assert.equal(runsLogPath(dir), join(dir, "data", "runs.jsonl"));
});

test("appendRunLog: creates the data dir, appends a timestamped row, and readRuns reads it back", () => {
  const dir = mkdtempSync(join(tmpdir(), "me-runs-"));
  const row = appendRunLog(
    { piece_id: "p1", providers_used: ["claude"], cost_estimate_usd: 0.1, status: "ok", actions: ["generate"] },
    dir,
  );
  assert.equal(row.piece_id, "p1");
  assert.ok(row.timestamp);
  const rows = readRuns(runsLogPath(dir));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "ok");
});

test("appendRunLog: defaults piece_id to empty string when omitted", () => {
  const dir = mkdtempSync(join(tmpdir(), "me-runs-nopiece-"));
  const row = appendRunLog({ providers_used: [], cost_estimate_usd: 0, status: "skipped" }, dir);
  assert.equal(row.piece_id, "");
});

test("readRuns: returns an empty array for a missing file and skips malformed lines", () => {
  const dir = mkdtempSync(join(tmpdir(), "me-runs-malformed-"));
  assert.deepEqual(readRuns(join(dir, "nope.jsonl")), []);

  mkdirSync(join(dir, "data"), { recursive: true });
  const path = join(dir, "data", "runs.jsonl");
  writeFileSync(path, '{"status":"ok"}\nnot-json\n\n{"status":"also-ok"}\n');
  const rows = readRuns(path);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, "ok");
  assert.equal(rows[1].status, "also-ok");
});
