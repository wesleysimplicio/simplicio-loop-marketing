import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { findingFingerprint, sanitize } from "../../lib/extension/reporting";
test("finding hot path stays below 0.05ms p95 per sanitize+fingerprint",()=>{const samples:number[]=[];const input={run_id:"r",stage_id:"publish",code:"X",severity:"high" as const,scope:"delivery",owner_repo:"repo",summary:"mail me@example.com",reproduction:["x"],impact:"x",tests:["x"],acceptance_criteria:["x"]};for(let i=0;i<5000;i++){const s=performance.now();sanitize(input.summary);findingFingerprint(input);samples.push(performance.now()-s)}samples.sort((a,b)=>a-b);const p95=samples[Math.floor(samples.length*.95)]!;process.stdout.write(`marketing-reporting benchmark: n=5000 p95_ms=${p95.toFixed(4)}\n`);assert.ok(p95<0.05,`p95 ${p95}ms exceeded 0.05ms`)});
