import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { evaluateRelease, promoteLock } from "../lib/release-train/core.ts";

const arg = (name) => { const i=process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i+1]; };
const root=process.cwd(), candidatePath=arg("--candidate");
if (!candidatePath) throw new Error("usage: reconcile-core-release --candidate <component-release.json> [--apply-canary]");
const load = async (source) => source.startsWith("https://") ? (await fetch(source, { signal: AbortSignal.timeout(15000) })).json() : JSON.parse(await readFile(resolve(source),"utf8"));
const [candidate, lock, manifest] = await Promise.all([load(candidatePath),load("extension/core.lock.json"),load("extension/loop.marketing.json")]);
const result=evaluateRelease(candidate,lock,manifest);
const report={schema:"loop.marketing-release-reconciliation/v1",observed_at:new Date().toISOString(),candidate:{version:candidate.version,commit:candidate.commit,digest:candidate.digest},installed:lock.core,result,metrics:{duration_ms:null,token_count:null,cost_usd:null,cpu_ms:null,rss_bytes:null,reason:"measured by conformance lane; unavailable during reconciliation"}};
const reportPath=resolve("artifacts/release-train/reconciliation.json"); await mkdir(dirname(reportPath),{recursive:true}); await writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
if (!result.compatible) { const issue={title:`Migrate loop.marketing to Loop ${candidate.version ?? "unknown"}`,owner:"@wesleysimplicio",reason_code:result.reason_code,overlay_diff:result.schema_diff,capability_diff:result.capability_diff,steps:["Review upstream changelog and contract diff","Implement expand/migrate/contract changes","Run conformance in embedded, daemon, and remote modes","Promote canary, then stable"],rollback:`Keep ${lock.core.version} (${lock.core.artifact_digest}) installed`}; await writeFile(resolve("artifacts/release-train/migration-issue.json"),JSON.stringify(issue,null,2)+"\n"); console.error(`blocked: ${result.reasons.join(", ")}`); process.exitCode=2; }
else if(process.argv.includes("--apply-canary")){await writeFile(resolve("extension/core.lock.json"),JSON.stringify(promoteLock(lock,candidate,"canary"),null,2)+"\n"); console.log(`canary lock updated to ${candidate.version}`);} else console.log(`compatible: ${candidate.version}`);
