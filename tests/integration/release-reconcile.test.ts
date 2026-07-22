import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateRelease, promoteLock, type ComponentRelease, type CoreLock } from "../../lib/release-train/core.ts";

const load = (path:string) => JSON.parse(readFileSync(path,"utf8"));
test("compatible reconciliation persists a deterministic canary with rollback",()=>{
  const root=mkdtempSync(join(tmpdir(),"release-train-"));
  const lock=load("extension/core.lock.json") as CoreLock, manifest=load("extension/loop.marketing.json"), candidate=load("tests/fixtures/core-component-release.json") as ComponentRelease;
  const result=evaluateRelease(candidate,lock,manifest); assert.equal(result.compatible,true);
  const path=join(root,"core.lock.json"); writeFileSync(path,JSON.stringify(promoteLock(lock,candidate,"canary")));
  const stored=load(path); assert.equal(stored.channel,"canary"); assert.deepEqual(stored.previous,lock.core);
});
test("incompatible reconciliation exposes actionable diff and keeps stable pin",()=>{
  const lock=load("extension/core.lock.json") as CoreLock, manifest=load("extension/loop.marketing.json"), candidate=load("tests/fixtures/core-component-release.json") as ComponentRelease;
  const result=evaluateRelease({...candidate,breaking_change:true,protocols:{"simplicio.loop-extension/v1":"2.0.0"}},lock,manifest);
  assert.equal(result.compatible,false); assert.equal(result.reason_code,"breaking-change"); assert.deepEqual(result.schema_diff,["simplicio.loop-extension/v1"]); assert.equal(lock.channel,"stable");
});
