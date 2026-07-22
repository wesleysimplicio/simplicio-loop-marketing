import { test } from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { buildPlatformCaptions } from "../../lib/content/captions.ts";

test("benchmark: caption fan-out sustains at least 2,000 operations/second", (t) => {
  const iterations = 10_000;
  const caption = "Conteúdo real com acentuação e emoji 🔎 ".repeat(40);
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) buildPlatformCaptions(caption, "engineering evidence");
  const elapsedMs = performance.now() - start;
  const operationsPerSecond = iterations / (elapsedMs / 1000);
  t.diagnostic(`caption fan-out: ${operationsPerSecond.toFixed(0)} ops/s (${iterations} iterations in ${elapsedMs.toFixed(1)} ms)`);
  assert.ok(operationsPerSecond >= 2_000, `expected >= 2,000 ops/s, got ${operationsPerSecond.toFixed(0)}`);
});
