'use strict';

/*
 * Lightweight benchmark gate for the TOON hot path (see scripts/bench.mjs for
 * the full measured-numbers report via `npm run bench`). This test asserts a
 * generous time budget so a real performance regression fails CI, without
 * being flaky on slower machines.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeToon, decodeToon } from "../../lib/format/toon.ts";

function makePayload(n: number) {
  return {
    pieces: Array.from({ length: n }, (_, i) => ({
      id: `piece-${i}`,
      status: i % 3 === 0 ? "ready" : "draft",
      platform: ["instagram", "tiktok", "linkedin"][i % 3],
    })),
  };
}

test("benchmark: encoding+decoding a 100-piece batch 500x stays under budget", () => {
  const payload = makePayload(100);
  const iterations = 500;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const encoded = encodeToon(payload);
    decodeToon(encoded);
  }
  const totalMs = performance.now() - t0;
  const meanMs = totalMs / iterations;
  console.log(`benchmark: toon encode+decode mean ${meanMs.toFixed(4)}ms/op over ${iterations} iterations`);
  // Generous budget (measured baseline is well under 1ms/op on dev hardware);
  // this catches an accidental O(n^2) regression, not micro-variance.
  assert.ok(meanMs < 25, `expected mean < 25ms/op, got ${meanMs.toFixed(4)}ms/op`);
});
