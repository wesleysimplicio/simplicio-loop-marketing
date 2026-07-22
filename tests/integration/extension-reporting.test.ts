import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectFinding, findingsReport, reconcileOutbox, type Tracker } from "../../lib/extension/reporting";
test("routes a cross-repository finding and confirms it remotely",async()=>{const root=mkdtempSync(join(tmpdir(),"mr-int-"));let routed="";const t:Tracker={async upsert(x){routed=x.repo;return{confirmed:true,ref:"other/repo#9"}},async requery(){return{confirmed:true,state:"open"}}};await collectFinding(root,{run_id:"r",stage_id:"metrics",code:"BAD_METRIC",severity:"critical",scope:"analytics",owner_repo:"other/repo",summary:"metric invalid",reproduction:["pull"],impact:"wrong decision",tests:["metric contract"],acceptance_criteria:["reject invalid"]});await reconcileOutbox(root,t);assert.equal(routed,"other/repo");assert.equal(findingsReport(root).findings[0]?.issue_ref,"other/repo#9")});
