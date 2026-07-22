import { performance } from "node:perf_hooks";
import { join } from "node:path";
import { FakeEffectServer, loadManifest, redact, stableHash, validateManifest } from "../extension/conformance.js";

export function runConformance(root = process.cwd(), coreVersion = "1.0.0") {
  const started = performance.now();
  const manifest = loadManifest(join(root, ".specs", "extensions", "loop.marketing.json"));
  const checks = validateManifest(manifest, coreVersion);
  const server = new FakeEffectServer();
  const first = server.request({ key: "piece-1:publish", fence: 2, authorized: true });
  const replay = server.request({ key: "piece-1:publish", fence: 2, authorized: true });
  checks.push({ id: "exactly-once", pass: first.id === replay.id && server.effectCount === 1, detail: `${server.effectCount} external effect` });
  const elapsed = performance.now() - started;
  return redact({ schema: "loop.marketing-conformance-report/v1", status: checks.every(x => x.pass) ? "PASS" : "BLOCKED", core_version: coreVersion, extension_version: manifest.version, manifest_hash: stableHash(manifest), composed_graph_hash: stableHash(manifest.stage_overlays), modes: manifest.modes, checks, metrics: { duration_ms: Number(elapsed.toFixed(3)), p50_ms: null, p95_ms: null, p99_ms: null, throughput_per_s: null, tokens: null, cost_usd: null, unavailable_reason: "single conformance run; run npm run bench:conformance for distribution" } });
}

if (process.argv[1]?.endsWith("conformance.ts")) { const report = runConformance(process.argv[2] ?? process.cwd(), process.argv[3] ?? "1.0.0"); console.log(JSON.stringify(report, null, 2)); if ((report as any).status !== "PASS") process.exitCode = 1; }
