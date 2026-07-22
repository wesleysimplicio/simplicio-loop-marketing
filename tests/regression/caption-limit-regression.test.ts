import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlatformCaptions, CAPTION_LIMITS } from "../../lib/content/captions.ts";

test("regression #99: suffix is included inside the platform limit and emoji is not split", () => {
  const captions = buildPlatformCaptions("🚀".repeat(2000), "engineering evidence");
  assert.equal(Array.from(captions.tiktok).length, CAPTION_LIMITS.tiktok);
  assert.equal(captions.tiktok.endsWith(" #engineering-evidence"), true);
  assert.equal(captions.tiktok.includes("\uFFFD"), false);
});
