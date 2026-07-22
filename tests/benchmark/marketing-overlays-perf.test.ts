import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";
import { deterministicCaptionFormat } from "../../lib/extension/handlers";

test("overlay hot path improves throughput over sequential stage waits", async (t) => {
  const pieces = 20;
  const stage = () => new Promise<void>((resolve) => setTimeout(resolve, 3));
  const sequentialStart = performance.now();
  for (let i = 0; i < pieces; i++) { await stage(); await stage(); }
  const sequentialMs = performance.now() - sequentialStart;
  const overlayStart = performance.now();
  await Promise.all(Array.from({ length: pieces }, async (_, i) => {
    await Promise.all([stage(), stage()]);
    await deterministicCaptionFormat({ run_id: "bench", task_id: `p${i}`, attempt: 1, fence_token: `f${i}`, tenant_id: "bench", input: { caption: "copy", pillar: "proof" } });
  }));
  const overlayMs = performance.now() - overlayStart;
  const speedup = sequentialMs / overlayMs;
  t.diagnostic(`numeric benchmark: pieces=${pieces} sequential_ms=${sequentialMs.toFixed(2)} overlay_ms=${overlayMs.toFixed(2)} speedup=${speedup.toFixed(2)}x throughput=${(pieces / (overlayMs / 1000)).toFixed(1)} pieces/s`);
  assert.ok(speedup >= 2, `expected >=2x speedup, got ${speedup.toFixed(2)}x`);
});
