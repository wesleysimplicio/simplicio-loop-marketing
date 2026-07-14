'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDraft, createCampaign } from "../../lib/publish/meta-ads.ts";
import type { PieceFrontmatter } from "../../lib/pieces/frontmatter.ts";

function piece(overrides: Partial<PieceFrontmatter> = {}): PieceFrontmatter {
  return {
    id: "p1",
    client: "acme",
    date: "2026-05-08",
    status: "draft",
    type: "reel",
    pillar: "education",
    platforms: ["instagram"],
    ...overrides,
  } as PieceFrontmatter;
}

test("buildDraft: applies defaults for objective, audience_hint, and daily_budget_usd", () => {
  const draft = buildDraft(piece(), { captions: { instagram: "hi" }, creative_ids: ["c1"] });
  assert.equal(draft.piece_id, "p1");
  assert.equal(draft.campaign_name, "auto-p1");
  assert.equal(draft.objective, "OUTCOME_ENGAGEMENT");
  assert.equal(draft.audience_hint, "education");
  assert.equal(draft.daily_budget_usd, 10);
  assert.equal(draft.paused, true);
});

test("buildDraft: honors explicit overrides", () => {
  const draft = buildDraft(piece(), {
    captions: { instagram: "hi" },
    creative_ids: ["c1"],
    objective: "OUTCOME_SALES",
    audience_hint: "custom-audience",
    daily_budget_usd: 42,
  });
  assert.equal(draft.objective, "OUTCOME_SALES");
  assert.equal(draft.audience_hint, "custom-audience");
  assert.equal(draft.daily_budget_usd, 42);
});

test("createCampaign: dry-run writes the draft file and appends a promotions.jsonl entry", async () => {
  delete process.env.DRY_RUN;
  const root = mkdtempSync(join(tmpdir(), "me-meta-ads-"));
  const draft = buildDraft(piece(), { captions: { instagram: "hi" }, creative_ids: ["c1"] });
  const result = await createCampaign(root, piece(), draft);
  assert.equal(result.ok, true);
  assert.ok(result.path && existsSync(result.path));
  const written = JSON.parse(readFileSync(result.path!, "utf8"));
  assert.equal(written.piece_id, "p1");
  const promotions = readFileSync(join(root, "data", "promotions.jsonl"), "utf8");
  assert.ok(promotions.includes("promoted-by-classifier"));
});

test("createCampaign: writing twice does not clobber the first draft file", async () => {
  delete process.env.DRY_RUN;
  const root = mkdtempSync(join(tmpdir(), "me-meta-ads-twice-"));
  const draft = buildDraft(piece(), { captions: { instagram: "hi" }, creative_ids: ["c1"] });
  const first = await createCampaign(root, piece(), draft);
  const second = await createCampaign(root, piece(), draft);
  assert.notEqual(first.path, second.path);
  assert.ok(existsSync(first.path!));
  assert.ok(existsSync(second.path!));
});

test("createCampaign: live mode without META_ADS_MCP_ACTIVE reports a clear error but keeps the draft", async () => {
  const root = mkdtempSync(join(tmpdir(), "me-meta-ads-live-"));
  process.env.DRY_RUN = "false";
  delete process.env.META_ADS_MCP_ACTIVE;
  process.env.ACTION_GATE_SELFTEST = "true";
  try {
    const draft = buildDraft(piece(), { captions: { instagram: "hi" }, creative_ids: ["c1"], daily_budget_usd: 1 });
    const result = await createCampaign(root, piece(), draft);
    assert.equal(result.ok, false);
    assert.ok(result.path && existsSync(result.path));
    assert.ok(result.error);
  } finally {
    delete process.env.DRY_RUN;
    delete process.env.ACTION_GATE_SELFTEST;
  }
});
