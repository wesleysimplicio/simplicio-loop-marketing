import { test, expect } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkActionGate, recordPromotionApproval } from "../lib/gate/action-gate";
test("live publish blocks without approval", () => { const root = mkdtempSync(join(tmpdir(), "action-gate-")); const r = checkActionGate({ root, action: "publish", pieceId: "p1" }); expect(r.ok).toBe(false); expect(r.reasons.join(" ")).toContain("human approval"); });
test("matching approval allows live publish", () => { const root = mkdtempSync(join(tmpdir(), "action-gate-")); recordPromotionApproval(root, { approved_by: "human", approved_at: new Date().toISOString(), piece_id: "p1", evidence_reviewed: ["gate.json"], spend_ceiling_usd: 25 }); expect(checkActionGate({ root, action: "publish", pieceId: "p1" }).ok).toBe(true); });
test("budget breach blocks ads activation", () => { const root = mkdtempSync(join(tmpdir(), "action-gate-")); recordPromotionApproval(root, { approved_by: "human", approved_at: new Date().toISOString(), piece_id: "p1", evidence_reviewed: ["gate.json"], spend_ceiling_usd: 1000 }); const r = checkActionGate({ root, action: "ads_activate", pieceId: "p1", dailyBudgetUsd: 999 }); expect(r.ok).toBe(false); expect(r.reasons.join(" ")).toContain("max_daily_spend"); });
