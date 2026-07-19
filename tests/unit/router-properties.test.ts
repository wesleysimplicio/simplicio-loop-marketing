"use strict";

// Property-based coverage for lib/router.ts (issue #99, hub: simplicio-loop#579).
//
// #579 found two "silent corruption" bugs in sibling repos where a handful of
// hand-picked example tests passed while a whole *class* of input combinations
// was never exercised: an edit plan whose ordering logic disagreed between a
// whole-plan check and a per-file check (dev-cli), and a regex anchor that
// silently reported the wrong line number for the single most common Python
// formatting style (mapper). Neither bug was a missing feature -- both were a
// resolution/anchoring function silently drifting to the wrong answer for an
// input shape example tests never generated.
//
// The analogous risk in this repo is `lib/router.ts`: it resolves a
// `task_type` + optional per-piece override + `.env` state into a concrete
// provider name that every downstream skill (script/caption/creative/
// compliance/publish) trusts blindly. A silent-drift bug here -- an
// override that gets ignored, an env var that leaks into an unrelated task,
// or a resolution that changes answer between two calls with identical
// inputs -- would route real client content to the wrong LLM/image/video
// vendor without ever raising an error. Example tests (tests/unit/
// router.test.ts) already assert a handful of fixed cases; this file
// generates hundreds of task/override/env combinations with fast-check and
// asserts the invariants that must hold for *all* of them, not just the
// ones a human happened to write down.

import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { routeImage, routeLLM, routeLLMFallback, routeVideo } from "../../lib/router.ts";
import {
  imageRow,
  loadProviderMatrix,
  llmRow,
  resetMatrixCache,
  videoRow,
} from "../../lib/providers/matrix.ts";
import type { ImageTask, LLMTask, VideoTask } from "../../lib/providers/types";

const LLM_TASKS: LLMTask[] = [
  "orchestration",
  "code",
  "caption",
  "script",
  "compliance",
  "translation",
  "humanization",
];

const IMAGE_TASKS: ImageTask[] = [
  "quote-card",
  "ugc-ad",
  "cinematic",
  "carousel",
  "batch-ab",
  "inpaint",
  "face-swap",
  "before-after",
];

const VIDEO_TASKS: VideoTask[] = [
  "cinematic-reel",
  "motion-control",
  "ugc-product",
  "product-demo",
  "talking-head",
  "batch-hooks",
  "motion-typography",
  "data-viz-reel",
  "programmatic-short",
];

// Also feed the router unknown task labels (never in the matrix) so the
// property covers the "unrecognized task_type" path, not just the seven/eight
// documented rows.
const unknownTaskArb = fc.string().filter((s) => !LLM_TASKS.includes(s as LLMTask));

const llmTaskArb = fc.oneof(fc.constantFrom(...LLM_TASKS), unknownTaskArb);
const imageTaskArb = fc.oneof(
  fc.constantFrom(...IMAGE_TASKS),
  fc.string().filter((s) => !IMAGE_TASKS.includes(s as ImageTask)),
);
const videoTaskArb = fc.oneof(
  fc.constantFrom(...VIDEO_TASKS),
  fc.string().filter((s) => !VIDEO_TASKS.includes(s as VideoTask)),
);

// `override` mirrors a piece's `provider_override` frontmatter: usually
// absent, sometimes a real provider name, sometimes (edge case worth
// generating, not hand-picking) an empty string -- which the implementation's
// `if (override)` truthy check treats as "no override".
const overrideArb = fc.option(fc.string(), { nil: undefined });
const envValueArb = fc.option(fc.string({ minLength: 1 }), { nil: undefined });

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) prev[key] = process.env[key];
  try {
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetMatrixCache();
    return fn();
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetMatrixCache();
  }
}

test("property: routeLLM resolution is deterministic, an override always wins, and unrelated env noise never leaks into the resolved provider", () => {
  fc.assert(
    fc.property(
      llmTaskArb,
      overrideArb,
      envValueArb,
      envValueArb,
      (task, override, llmDefault, noise) =>
        withEnv(
          { LLM_DEFAULT: llmDefault, MKT_ENGINE_PROPERTY_TEST_NOISE: noise },
          () => {
            const first = routeLLM(task as LLMTask, override);
            const second = routeLLM(task as LLMTask, override);

            // Invariant 1 -- determinism: identical inputs + identical env
            // resolve to the identical provider, every time. A router that
            // answers differently on the second call for the same state is
            // exactly the kind of silent drift #579 is about.
            assert.equal(second, first, "routeLLM must be deterministic for the same inputs/env");

            // Invariant 2 -- a non-empty override always wins, regardless of
            // matrix content or env state. An empty-string override ("") is
            // falsy in the implementation and therefore must NOT win; this
            // edge case is asserted explicitly below, not skipped.
            if (override) {
              assert.equal(first, override, "a non-empty override must always win");
              return;
            }

            // Invariant 3 -- LLM_DEFAULT only ever affects the "orchestration"
            // task. Any other task must resolve purely from the matrix.
            if (task === "orchestration" && llmDefault) {
              assert.equal(
                first,
                llmDefault,
                "orchestration must honor a non-empty LLM_DEFAULT when there is no override",
              );
              return;
            }

            // Invariant 4 -- otherwise resolution must match the matrix row
            // exactly for the given task, falling back to the same "claude"
            // default the router itself falls back to for an unknown task.
            // This is the direct analogue of "never silently drift to a
            // different provider than the routing table says."
            const expected = llmRow(task, loadProviderMatrix()).default ?? "claude";
            assert.equal(first, expected, "resolution must match the provider matrix row");

            // Invariant 5 -- an unrelated env var must never change the
            // outcome (no hidden global-state leakage between unrelated
            // config knobs).
            const withNoiseChanged = withEnv(
              { MKT_ENGINE_PROPERTY_TEST_NOISE: `${noise ?? ""}-changed` },
              () => routeLLM(task as LLMTask, override),
            );
            assert.equal(withNoiseChanged, first, "unrelated env noise must not affect resolution");
          },
        ),
    ),
    { numRuns: 200 },
  );
});

test("property: routeImage/routeVideo resolution is deterministic and an override always wins", () => {
  fc.assert(
    fc.property(imageTaskArb, overrideArb, (task, override) => {
      resetMatrixCache();
      const first = routeImage(task as ImageTask, override);
      const second = routeImage(task as ImageTask, override);
      assert.equal(second, first, "routeImage must be deterministic for the same inputs");
      if (override) {
        assert.equal(first, override, "a non-empty image override must always win");
        return;
      }
      const expected = imageRow(task, loadProviderMatrix()).default ?? "gpt-image";
      assert.equal(first, expected, "image resolution must match the provider matrix row");
    }),
    { numRuns: 200 },
  );

  fc.assert(
    fc.property(videoTaskArb, overrideArb, (task, override) => {
      resetMatrixCache();
      const first = routeVideo(task as VideoTask, override);
      const second = routeVideo(task as VideoTask, override);
      assert.equal(second, first, "routeVideo must be deterministic for the same inputs");
      if (override) {
        assert.equal(first, override, "a non-empty video override must always win");
        return;
      }
      const expected = videoRow(task, loadProviderMatrix()).default ?? "higgsfield";
      assert.equal(first, expected, "video resolution must match the provider matrix row");
    }),
    { numRuns: 200 },
  );
});

test("property: routeLLMFallback always matches the matrix fallback when one is declared, and is deterministic otherwise", () => {
  fc.assert(
    fc.property(llmTaskArb, envValueArb, (task, llmFallback) =>
      withEnv({ LLM_FALLBACK: llmFallback }, () => {
        const first = routeLLMFallback(task as LLMTask);
        const second = routeLLMFallback(task as LLMTask);
        assert.equal(second, first, "routeLLMFallback must be deterministic for the same inputs/env");

        const row = llmRow(task, loadProviderMatrix());
        const expected = row.fallback ?? llmFallback;
        assert.equal(first, expected, "fallback resolution must match matrix row, then env, never a third value");
      }),
    ),
    { numRuns: 200 },
  );
});
