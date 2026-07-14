'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate, type Platform } from "../../lib/qa/tech-specs.ts";

function fakeAsset(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), "me-qa-specs-"));
  const path = join(dir, name);
  writeFileSync(path, "fake");
  return path;
}

test("validate: flags min_width and min_height when an asset matches the required aspect but is undersized", () => {
  const p = fakeAsset("small-500x500.png");
  const r = validate(p, ["ig_feed"]);
  const violations = r.per_platform.ig_feed?.violations ?? [];
  assert.ok(violations.some((v) => v.rule === "min_width"));
  assert.ok(violations.some((v) => v.rule === "min_height"));
  assert.equal(r.per_platform.ig_feed?.pass, false);
  assert.ok(r.per_platform.ig_feed?.fixes.some((f) => f.includes("fix min_width")));
});

test("validate: an unrecognized platform (defensive path) is skipped with a note instead of throwing", () => {
  const p = fakeAsset("cover-1080x1080.png");
  const r = validate(p, ["not_a_real_platform" as Platform]);
  const result = r.per_platform.not_a_real_platform;
  assert.equal(result?.pass, true);
  assert.ok(result?.fixes[0].includes("no spec for platform"));
});

test("validate: aggregates overall pass=false when any requested platform fails", () => {
  const p = fakeAsset("cover-1080x1080.png");
  const r = validate(p, ["ig_feed", "ig_reel"]);
  assert.equal(r.per_platform.ig_feed?.pass, true);
  assert.equal(r.per_platform.ig_reel?.pass, false);
  assert.equal(r.pass, false);
});

test("validate: honors a CHANNELS.md override for aspect, resolution, duration, and file size", () => {
  const root = mkdtempSync(join(tmpdir(), "me-qa-channels-"));
  mkdirSync(join(root, ".specs", "product"), { recursive: true });
  writeFileSync(
    join(root, ".specs", "product", "CHANNELS.md"),
    [
      "### `ig_carousel`",
      "",
      "| Field | Value |",
      "|---|---|",
      "| Aspect ratio | 1:1, 3:4 |",
      "| Resolution | 1200x1200 |",
      "| Max duration | 45s |",
      "| File size | 50 MB |",
      "",
    ].join("\n"),
  );
  const p = fakeAsset("cover-1200x1200.png");
  const r = validate(p, ["ig_feed"], { channelsPath: root });
  // ig_feed maps to the same doc id (ig_carousel) via CHANNEL_DOC_PLATFORM_MAP
  assert.equal(r.per_platform.ig_feed?.pass, true);
  assert.equal(r.metadata.aspect, "1:1");
});

test("validate: a CHANNELS.md override that lowers min resolution surfaces a violation when unmet", () => {
  const root = mkdtempSync(join(tmpdir(), "me-qa-channels-strict-"));
  mkdirSync(join(root, ".specs", "product"), { recursive: true });
  writeFileSync(
    join(root, ".specs", "product", "CHANNELS.md"),
    [
      "### `ig_carousel`",
      "",
      "| Field | Value |",
      "|---|---|",
      "| Resolution | 2000x2000 |",
      "",
    ].join("\n"),
  );
  const p = fakeAsset("cover-1200x1200.png");
  const r = validate(p, ["ig_feed"], { channelsPath: root });
  assert.equal(r.per_platform.ig_feed?.pass, false);
  assert.ok(r.per_platform.ig_feed?.violations.some((v) => v.rule === "min_width"));
});

test("validate: a missing CHANNELS.md falls back to DEFAULT_SPECS without error", () => {
  const root = mkdtempSync(join(tmpdir(), "me-qa-channels-missing-"));
  const p = fakeAsset("cover-1080x1080.png");
  const r = validate(p, ["ig_feed"], { channelsPath: root });
  assert.equal(r.per_platform.ig_feed?.pass, true);
});
