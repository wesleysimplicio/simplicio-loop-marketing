import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateRelease, promoteLock, stableHash, type ComponentRelease, type CoreLock } from "../../lib/release-train/core.ts";
const json = (p:string) => JSON.parse(readFileSync(p,"utf8"));
const manifest=json("extension/loop.marketing.json"), lock=json("extension/core.lock.json") as CoreLock, candidate=json("tests/fixtures/core-component-release.json") as ComponentRelease;
test("accepts a pinned compatible release with all-mode conformance",()=>{const out=evaluateRelease(candidate,lock,manifest);assert.equal(out.compatible,true);assert.equal(out.reason_code,null);assert.match(out.graph_hash,/^[a-f0-9]{64}$/);});
test("fails closed for breaking, revoked, unpinned, drifted, or unconformant releases",()=>{for(const patch of [{breaking_change:true},{revoked:true},{digest:"latest"},{protocols:{}},{capabilities:[]},{conformance:{modes:["embedded"],passed:true}}]){const out=evaluateRelease({...candidate,...patch} as ComponentRelease,lock,manifest);assert.equal(out.compatible,false,JSON.stringify(patch));assert.ok(out.reason_code);}});
test("rejects every malformed identity and version boundary before work",()=>{
  const cases: Array<[Partial<ComponentRelease>,Record<string,unknown>]> = [
    [{schema:"unknown" as ComponentRelease["schema"]},manifest],
    [{component:"other"},manifest],
    [{commit:"short"},manifest],
    [{version:"3.37.9"},manifest],
    [{version:"4.0.0"},manifest],
    [{version:"latest"},manifest],
    [{}, {...manifest,requires_core:{min_version:"bad",max_version:"3.99.99"}}],
    [{}, {...manifest,capabilities:{...manifest.capabilities,provides:["coordinator"]}}],
  ];
  for(const [releasePatch,manifestPatch] of cases) assert.equal(evaluateRelease({...candidate,...releasePatch},lock,manifestPatch).compatible,false);
});
test("promotion preserves an atomic rollback pin",()=>{const next=promoteLock(lock,candidate,"canary");assert.deepEqual(next.previous,lock.core);assert.equal(next.core.version,"3.38.1");assert.equal(next.channel,"canary");});
test("graph hash is independent of object key discovery order",()=>assert.equal(stableHash({b:2,a:1}),stableHash({a:1,b:2})));
