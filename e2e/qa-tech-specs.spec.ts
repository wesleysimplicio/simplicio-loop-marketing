import { test, expect } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate } from "../lib/qa/tech-specs";

function fakeAsset(name: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "me-qa-")), name);
  writeFileSync(path, "fake");
  return path;
}

test("validate flags square image against 9:16 platforms", () => {
  const p = fakeAsset("cover-1080x1080.png");
  const r = validate(p, ["ig_reel", "ig_feed"]);
  expect(r.per_platform.ig_reel?.pass).toBe(false);
  expect(r.per_platform.ig_feed?.pass).toBe(true);
  expect(r.pass).toBe(false);
});

test("validate passes a 9:16 video against tiktok + ig_reel", () => {
  const p = fakeAsset("reel-1080x1920.mp4");
  const r = validate(p, ["tiktok", "ig_reel"]);
  expect(r.per_platform.tiktok?.pass).toBe(true);
  expect(r.per_platform.ig_reel?.pass).toBe(true);
});

test("validate surfaces metadata", () => {
  const p = fakeAsset("frame-1920x1080.png");
  const r = validate(p, ["yt_long"]);
  expect(r.metadata.aspect).toBe("16:9");
  expect(r.metadata.width).toBe(1920);
  expect(r.metadata.height).toBe(1080);
});
