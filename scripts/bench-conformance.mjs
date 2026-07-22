import { performance } from "node:perf_hooks";
import { runConformance } from "../lib/cli/conformance.ts";
const samples = []; const count = Number(process.env.BENCH_ITERATIONS ?? 200);
for (let i = 0; i < count; i++) { const start = performance.now(); runConformance(process.cwd()); samples.push(performance.now() - start); }
samples.sort((a,b) => a-b); const p = n => samples[Math.min(samples.length - 1, Math.floor(samples.length * n))];
const report = { schema: "loop.marketing-conformance-benchmark/v1", environment: { node: process.version, platform: process.platform, arch: process.arch, iterations: count }, metrics: { p50_ms: +p(.5).toFixed(3), p95_ms: +p(.95).toFixed(3), p99_ms: +p(.99).toFixed(3), throughput_per_s: +(1000/(samples.reduce((a,b)=>a+b,0)/count)).toFixed(1) }, thresholds: { p95_ms_max: 25, duplicate_effects_max: 0 }, pass: p(.95) <= 25 };
console.log(JSON.stringify(report, null, 2)); if (!report.pass) process.exitCode = 1;
