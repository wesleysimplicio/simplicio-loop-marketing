import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { encodeEnvelope } from "../../lib/formats/binary.ts";

test("HBP hot-path benchmark records observed size and latency", (t) => {
  const row = { schema: "marketing-run/v1", piece_id: "piece-1", providers_used: ["routed"], status: "success", cost_estimate_usd: 0.01 };
  const iterations = 10_000;
  const started = performance.now();
  let bytes = 0;
  for (let index = 0; index < iterations; index++) bytes += encodeEnvelope("HBP", row).byteLength;
  const elapsedMs = performance.now() - started;
  const jsonBytes = Buffer.byteLength(`${JSON.stringify(row)}\n`) * iterations;
  t.diagnostic(JSON.stringify({ iterations, elapsed_ms: elapsedMs, hbp_bytes: bytes, jsonl_bytes: jsonBytes, ops_per_second: iterations / (elapsedMs / 1000), peak_rss_bytes: process.memoryUsage().rss }));
  assert.ok(iterations / (elapsedMs / 1000) > 1_000);
  assert.ok(bytes > 0);
});
