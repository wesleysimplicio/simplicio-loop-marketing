import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  buildPlatformCaptions,
  CAPTION_LIMITS,
  CAPTION_PLATFORMS,
} from "../../lib/content/captions.ts";

const unicodeText = fc.string({ maxLength: 4000 });

function codePoints(value: string): number {
  return Array.from(value).length;
}

test("property: caption fan-out is deterministic, complete and bounded per platform", () => {
  fc.assert(
    fc.property(unicodeText, fc.string({ maxLength: 100 }), (caption, pillar) => {
      const first = buildPlatformCaptions(caption, pillar);
      const second = buildPlatformCaptions(caption, pillar);
      assert.deepEqual(second, first);
      assert.deepEqual(Object.keys(first), [...CAPTION_PLATFORMS]);
      for (const platform of CAPTION_PLATFORMS) {
        assert.ok(codePoints(first[platform]) <= CAPTION_LIMITS[platform]);
        assert.equal(first[platform].includes("\uFFFD"), caption.includes("\uFFFD") || pillar.includes("\uFFFD"));
      }
    }),
    { numRuns: 500 },
  );
});

test("property: every variant preserves the maximum caption prefix that fits before the normalized pillar tag", () => {
  fc.assert(
    fc.property(unicodeText, fc.string({ minLength: 1, maxLength: 40 }), (caption, pillar) => {
      const result = buildPlatformCaptions(caption, pillar);
      const tag = ` #${pillar.trim().replace(/\s+/g, "-")}`;
      for (const platform of CAPTION_PLATFORMS) {
        const limit = CAPTION_LIMITS[platform];
        const boundedTag = Array.from(tag).slice(0, limit).join("");
        const expectedPrefix = Array.from(caption).slice(0, limit - codePoints(boundedTag)).join("");
        assert.equal(result[platform], `${expectedPrefix}${boundedTag}`);
      }
    }),
    { numRuns: 500 },
  );
});
