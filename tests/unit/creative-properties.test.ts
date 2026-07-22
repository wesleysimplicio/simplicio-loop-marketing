import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { fanOutCaptions, CAPTION_RULES, normalizeCaptionPlatform } from "../../lib/content/captions.ts";
import { satisfiesProviderConstraint } from "../../lib/providers/constraints.ts";
import { getImageProvider, IMAGE_PROVIDER_CAPABILITIES } from "../../lib/providers/image.ts";
import { getVideoProvider, VIDEO_PROVIDER_CAPABILITIES } from "../../lib/providers/video.ts";
import type { ImageTask, ProviderConstraint, VideoTask } from "../../lib/providers/types.ts";

const constraintArb: fc.Arbitrary<ProviderConstraint> = fc.record({
  brand_strict: fc.option(fc.boolean(), { nil: undefined }),
  budget_cap_usd: fc.option(fc.double({ min: 0, max: 0.2, noNaN: true }), { nil: undefined }),
  max_latency_ms: fc.option(fc.integer({ min: 0, max: 120_000 }), { nil: undefined }),
  quality_min: fc.option(fc.constantFrom("low", "medium", "high"), { nil: undefined }),
}, { noNullPrototype: true });

const imageTasks: ImageTask[] = ["quote-card", "ugc-ad", "cinematic", "carousel", "batch-ab", "inpaint", "face-swap", "before-after"];
const videoTasks: VideoTask[] = ["cinematic-reel", "motion-control", "ugc-product", "product-demo", "talking-head", "batch-hooks", "motion-typography", "data-viz-reel", "programmatic-short"];

test("property: image and video factories never return an adapter violating constraints", () => {
  fc.assert(fc.property(
    fc.constantFrom(...imageTasks), constraintArb,
    (task, constraints) => {
      try {
        const selected = getImageProvider(task, { constraints });
        assert.ok(satisfiesProviderConstraint(IMAGE_PROVIDER_CAPABILITIES[selected.name], constraints));
      } catch (error) {
        assert.match(String(error), /no adapter satisfies/);
        assert.ok(Object.values(IMAGE_PROVIDER_CAPABILITIES).every((profile) => !satisfiesProviderConstraint(profile, constraints)));
      }
    },
  ));
  fc.assert(fc.property(
    fc.constantFrom(...videoTasks), constraintArb,
    (task, constraints) => {
      try {
        const selected = getVideoProvider(task, { constraints });
        assert.ok(satisfiesProviderConstraint(VIDEO_PROVIDER_CAPABILITIES[selected.name], constraints));
      } catch (error) {
        assert.match(String(error), /no adapter satisfies/);
        assert.ok(Object.values(VIDEO_PROVIDER_CAPABILITIES).every((profile) => !satisfiesProviderConstraint(profile, constraints)));
      }
    },
  ));
});

test("property: caption fan-out is deterministic, unique, complete, and uses the matching platform rule", () => {
  const platformArb = fc.array(fc.constantFrom("instagram", "ig", "ig_long", "tiktok", "linkedin", "x", "twitter"), { maxLength: 30 });
  fc.assert(fc.property(fc.string({ maxLength: 5_000 }), platformArb, (base, requested) => {
    const first = fanOutCaptions(base, requested);
    assert.deepEqual(fanOutCaptions(base, requested), first);
    const expected = [...new Set(requested.map(normalizeCaptionPlatform).filter((value) => value !== undefined))];
    assert.deepEqual(first.map((variant) => variant.platform), expected);
    assert.equal(new Set(first.map((variant) => variant.platform)).size, first.length);
    for (const variant of first) {
      const rule = CAPTION_RULES[variant.platform];
      assert.equal(variant.cta, rule.cta);
      assert.ok(variant.text.endsWith(rule.cta));
      assert.equal(variant.char_count, variant.text.length);
      assert.ok(variant.char_count <= rule.max_chars);
    }
  }));
});
