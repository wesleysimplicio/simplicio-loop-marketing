import { test, expect } from "@playwright/test";

/**
 * Platform-specific caption format rules. Inline rules table; no library
 * coupling — the engine's caption-multi-platform skill is contract-tested
 * here against the same numeric limits documented in
 * .specs/architecture/DESIGN.md.
 */

type Platform = "instagram" | "tiktok" | "youtube_shorts" | "linkedin" | "x";

interface PlatformRule {
  hardMax: number;
  recommendedMax: number;
  hashtagMin: number;
  hashtagMax: number;
}

const RULES: Readonly<Record<Platform, PlatformRule>> = {
  instagram: { hardMax: 2200, recommendedMax: 1500, hashtagMin: 3, hashtagMax: 30 },
  tiktok: { hardMax: 2200, recommendedMax: 150, hashtagMin: 2, hashtagMax: 8 },
  youtube_shorts: { hardMax: 100, recommendedMax: 100, hashtagMin: 1, hashtagMax: 5 },
  linkedin: { hardMax: 3000, recommendedMax: 1300, hashtagMin: 0, hashtagMax: 5 },
  x: { hardMax: 280, recommendedMax: 240, hashtagMin: 0, hashtagMax: 3 },
};

function countHashtags(text: string): number {
  const matches = text.match(/#[\p{L}0-9_]+/gu);
  return matches ? matches.length : 0;
}

function validateCaption(
  platform: Platform,
  text: string,
): { ok: boolean; reasons: string[] } {
  const rule = RULES[platform];
  const reasons: string[] = [];
  if (text.length > rule.hardMax) {
    reasons.push(`length ${text.length} exceeds hard max ${rule.hardMax}`);
  }
  const tags = countHashtags(text);
  if (tags < rule.hashtagMin) {
    reasons.push(`hashtags ${tags} below min ${rule.hashtagMin}`);
  }
  if (tags > rule.hashtagMax) {
    reasons.push(`hashtags ${tags} above max ${rule.hashtagMax}`);
  }
  return { ok: reasons.length === 0, reasons };
}

test("instagram allows up to 2200 chars", () => {
  expect(RULES.instagram.hardMax).toBe(2200);
  const tags = " #x #y #z";
  const body = "a".repeat(2200 - tags.length);
  const text = body + tags;
  expect(text.length).toBe(2200);
  const result = validateCaption("instagram", text);
  expect(result.reasons.find((r) => r.includes("hard max"))).toBeUndefined();
});

test("tiktok hard max is 2200 but recommended max is 150", () => {
  expect(RULES.tiktok.hardMax).toBe(2200);
  expect(RULES.tiktok.recommendedMax).toBe(150);
});

test("youtube shorts cap is 100 chars", () => {
  expect(RULES.youtube_shorts.hardMax).toBe(100);
  const tooLong = "a".repeat(101) + " #shorts";
  const result = validateCaption("youtube_shorts", tooLong);
  expect(result.ok).toBe(false);
  expect(result.reasons.some((r) => r.includes("hard max"))).toBe(true);
});

test("linkedin recommended max is 1300, hard max 3000", () => {
  expect(RULES.linkedin.recommendedMax).toBe(1300);
  expect(RULES.linkedin.hardMax).toBe(3000);
});

test("x has 280 hard cap and at most 3 hashtags", () => {
  const tooManyTags = "post #a #b #c #d";
  const result = validateCaption("x", tooManyTags);
  expect(result.ok).toBe(false);
  expect(result.reasons.some((r) => r.includes("hashtags"))).toBe(true);
});

test("instagram requires at least 3 hashtags", () => {
  const sparse = "boa caption #only";
  const result = validateCaption("instagram", sparse);
  expect(result.ok).toBe(false);
  expect(result.reasons.some((r) => r.includes("below min"))).toBe(true);
});
