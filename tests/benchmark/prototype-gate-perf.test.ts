import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { runPrototypeGate } from "../../lib/prototype/gate.ts";

test("prototype gate hot path processes 1,000 five-variant decisions under 3 seconds", () => {
  const started = performance.now();
  for (let i = 0; i < 1_000; i++) runPrototypeGate({ piece_id: `P-${i}`, client: "bench", channel: "instagram", brief: "A deterministic compliant campaign workflow.", variant_count: 5 });
  const elapsedMs = performance.now() - started;
  const decisionsPerSecond = 1_000 / (elapsedMs / 1_000);
  process.stderr.write(`prototype benchmark: ${elapsedMs.toFixed(1)}ms total, ${decisionsPerSecond.toFixed(0)} decisions/s, 5000 candidates\n`);
  assert.ok(elapsedMs < 3_000, `prototype hot path took ${elapsedMs.toFixed(1)}ms`);
});
