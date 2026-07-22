import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { manifestHash } from "../../lib/extension/contract.ts";

test("manifest hash hot path stays below 0.25ms/op", () => {
  const value = { schema: "simplicio.loop-extension/v1", extension_id: "loop_marketing", values: Array.from({ length: 30 }, (_, i) => ({ i, enabled: true })) };
  const iterations = 10_000; const start = performance.now();
  for (let i = 0; i < iterations; i++) manifestHash(value);
  const perOpMs = (performance.now() - start) / iterations;
  console.log(`extension manifest hash: ${perOpMs.toFixed(4)} ms/op (${iterations} iterations)`);
  assert.ok(perOpMs < 0.25);
});
