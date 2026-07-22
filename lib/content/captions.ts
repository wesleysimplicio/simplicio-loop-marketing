/** Canonical review platforms required by the piece evidence contract. */
export const CAPTION_PLATFORMS = ["instagram", "tiktok", "linkedin", "x"] as const;

export type CaptionPlatform = (typeof CAPTION_PLATFORMS)[number];
export type PlatformCaptions = Record<CaptionPlatform, string>;

/**
 * Limits used by generation's four-platform review set.
 * They intentionally retain the engine's conservative pre-existing limits.
 */
export const CAPTION_LIMITS: Readonly<Record<CaptionPlatform, number>> = {
  instagram: 1500,
  tiktok: 150,
  linkedin: 1500,
  x: 240,
};

function takeCodePoints(value: string, max: number): string {
  return Array.from(value).slice(0, Math.max(0, max)).join("");
}

/**
 * Fan one caption out into the canonical platform-keyed evidence set.
 * The pillar tag is budgeted inside each limit, rather than appended after
 * truncation, and code-point slicing never leaves a broken surrogate pair.
 */
export function buildPlatformCaptions(caption: string, pillar: string): PlatformCaptions {
  const tag = ` #${pillar.trim().replace(/\s+/g, "-")}`;
  return Object.fromEntries(
    CAPTION_PLATFORMS.map((platform) => {
      const limit = CAPTION_LIMITS[platform];
      const boundedTag = takeCodePoints(tag, limit);
      const available = limit - Array.from(boundedTag).length;
      return [platform, `${takeCodePoints(caption, available)}${boundedTag}`];
    }),
  ) as PlatformCaptions;
}
