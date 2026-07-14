#!/usr/bin/env node
// scripts/bench.mjs — lightweight benchmark for hot paths in the pipeline.
//
// Two hot paths are timed:
//  1. TOON encode/decode of a representative piece-batch payload — this runs
//     on every LLM call that uses `prompt_format: "toon"` (see lib/router.ts
//     UsageEntry.prompt_format), so it sits directly on the request latency
//     path.
//  2. CLI dispatch (`marketing-engine help`) — the cold-start path every
//     invocation of the tool pays once.
//
// Produces a measured number (ops/sec + mean ms) for each; run with
// `npm run bench`. Not a strict pass/fail gate — CI can wire a budget once a
// baseline is established, mirroring scripts/token-budget.mjs.

import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { encodeToon, decodeToon } from "../lib/format/toon.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function timeit(label, fn, iterations) {
  // Warm up (JIT + first-call overhead) before the measured loop.
  for (let i = 0; i < Math.min(50, iterations); i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const t1 = performance.now();
  const totalMs = t1 - t0;
  const meanMs = totalMs / iterations;
  const opsPerSec = 1000 / meanMs;
  console.log(
    `${label}: ${iterations} iterations in ${totalMs.toFixed(1)}ms ` +
      `(mean ${meanMs.toFixed(4)}ms/op, ${opsPerSec.toFixed(0)} ops/sec)`,
  );
  return { label, iterations, totalMs, meanMs, opsPerSec };
}

function makePayload() {
  const pieces = Array.from({ length: 25 }, (_, i) => ({
    id: `piece-${i}`,
    status: i % 3 === 0 ? "ready" : "draft",
    score: Math.round(Math.random() * 1000) / 1000,
    platform: ["instagram", "tiktok", "linkedin"][i % 3],
  }));
  return { pieces, tags: ["q3", "launch", "asolaria"] };
}

const payload = makePayload();
const encoded = encodeToon(payload);

const results = [];
results.push(timeit("toon.encode (25-piece batch)", () => encodeToon(payload), 2000));
results.push(timeit("toon.decode (25-piece batch)", () => decodeToon(encoded), 2000));

results.push(
  timeit(
    "cli.dispatch (marketing-engine help)",
    () => {
      const r = spawnSync(process.execPath, [resolve(ROOT, "bin", "marketing-engine.mjs"), "help"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      if (r.status !== 0) throw new Error(`cli help exited ${r.status}: ${r.stderr}`);
    },
    10,
  ),
);

console.log("\nbench: summary (measured numbers above, no fixed budget enforced yet)");
for (const r of results) {
  console.log(`- ${r.label}: ${r.opsPerSec.toFixed(0)} ops/sec, mean ${r.meanMs.toFixed(4)}ms`);
}
