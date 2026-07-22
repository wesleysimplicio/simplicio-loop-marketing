import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditCompletion, collectFinding, reconcileOutbox, type Tracker } from "../../lib/extension/reporting";
test("a late tracker regression revokes an earlier terminal",async()=>{const root=mkdtempSync(join(tmpdir(),"mr-reg-"));const t:Tracker={async upsert(){return{confirmed:true,ref:"repo#1"}},async requery(){return{confirmed:false}}};await collectFinding(root,{run_id:"r",stage_id:"publish",code:"DELETED",severity:"high",scope:"delivery",owner_repo:"repo",summary:"deleted",reproduction:["query"],impact:"asset absent",tests:["remote query"],acceptance_criteria:["asset exists"]});await reconcileOutbox(root,t);const r=await auditCompletion(root,"COMPLETE",t,{reporting_required:true,receipts:[]});assert.equal(r.requested_terminal,"REGRESSED");assert.equal(r.revoke_terminal,true)});
