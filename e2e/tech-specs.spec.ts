import { test, expect } from "@playwright/test";

/**
 * Aspect-ratio validation per channel/format. Mirrors the qa-tech-specs skill
 * acceptance bar and the channel matrix in .specs/architecture/DESIGN.md.
 */

type Channel =
  | "instagram_reel"
  | "instagram_carousel"
  | "instagram_feed"
  | "tiktok"
  | "youtube_shorts"
  | "youtube_long"
  | "linkedin_post";

interface SpecRule {
  ratios: ReadonlyArray<string>;
  minDurationS?: number;
  maxDurationS?: number;
}

const SPECS: Readonly<Record<Channel, SpecRule>> = {
  instagram_reel: { ratios: ["9:16"], minDurationS: 3, maxDurationS: 90 },
  instagram_carousel: { ratios: ["4:5", "1:1"] },
  instagram_feed: { ratios: ["1:1", "4:5"] },
  tiktok: { ratios: ["9:16"], minDurationS: 3, maxDurationS: 600 },
  youtube_shorts: { ratios: ["9:16"], minDurationS: 1, maxDurationS: 60 },
  youtube_long: { ratios: ["16:9"], minDurationS: 60 },
  linkedin_post: { ratios: ["1:1", "16:9", "4:5"] },
};

function isAcceptedRatio(channel: Channel, ratio: string): boolean {
  return SPECS[channel].ratios.includes(ratio);
}

test("instagram reel requires 9:16", () => {
  expect(isAcceptedRatio("instagram_reel", "9:16")).toBe(true);
  expect(isAcceptedRatio("instagram_reel", "1:1")).toBe(false);
});

test("instagram carousel accepts 4:5 or 1:1", () => {
  expect(isAcceptedRatio("instagram_carousel", "4:5")).toBe(true);
  expect(isAcceptedRatio("instagram_carousel", "1:1")).toBe(true);
  expect(isAcceptedRatio("instagram_carousel", "9:16")).toBe(false);
});

test("tiktok requires 9:16", () => {
  expect(isAcceptedRatio("tiktok", "9:16")).toBe(true);
  expect(isAcceptedRatio("tiktok", "16:9")).toBe(false);
});

test("youtube shorts requires 9:16 and caps at 60s", () => {
  expect(isAcceptedRatio("youtube_shorts", "9:16")).toBe(true);
  expect(SPECS.youtube_shorts.maxDurationS).toBe(60);
});

test("youtube long form requires 16:9", () => {
  expect(isAcceptedRatio("youtube_long", "16:9")).toBe(true);
  expect(isAcceptedRatio("youtube_long", "9:16")).toBe(false);
});

test("linkedin post accepts 1:1, 16:9, 4:5", () => {
  for (const r of ["1:1", "16:9", "4:5"]) {
    expect(isAcceptedRatio("linkedin_post", r)).toBe(true);
  }
});
