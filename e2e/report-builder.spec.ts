import { test, expect } from "@playwright/test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReport, EvidenceRequiredError } from "../lib/report/builder";

test("require-evidence fails closed with exit code 3", () => {
  const root = mkdtempSync(join(tmpdir(), "me-report-empty-"));
  mkdirSync(join(root, ".marketing-engine", "pieces"), { recursive: true });
  writeFileSync(join(root, ".marketing-engine", "pieces", "empty.md"), "---\nid: empty\nclient: acme\ndate: 2026-05-08\nstatus: draft\ntype: reel\npillar: education\nplatforms: [instagram]\nlocale: en\n---\nbrief");
  expect(() => buildReport(root, "empty", { requireEvidence: true })).toThrow(EvidenceRequiredError);
  try { buildReport(root, "empty", { requireEvidence: true }); } catch (error) { expect((error as EvidenceRequiredError).exitCode).toBe(3); }
});

test("report mechanically exposes the claims-gate block", () => {
  const root = mkdtempSync(join(tmpdir(), "me-report-unverified-"));
  const ws = join(root, ".marketing-engine");
  mkdirSync(join(ws, "pieces"), { recursive: true });
  writeFileSync(join(ws, "pieces", "p.md"), "---\nid: p\nclient: acme\ndate: 2026-05-08\nstatus: draft\ntype: reel\npillar: education\nplatforms: [instagram]\nlocale: en\n---\nbrief");
  const out = join(ws, "outputs", "acme", "2026-05-08", "p");
  mkdirSync(out, { recursive: true });
  const watcher = join(ws, "data", "gate.json");
  mkdirSync(join(ws, "data"), { recursive: true });
  writeFileSync(watcher, JSON.stringify({ tag: "UNVERIFIED" }));
  writeFileSync(join(out, "manifest.json"), JSON.stringify({ schema: "marketing-manifest/v1", piece_id: "p", client: "acme", date: "2026-05-08", providers: {}, prompts: {}, cost_estimate_usd: 0, compliance_report_path: "x", watcher_report_path: watcher, outputs: [] }));
  expect(buildReport(root, "p")).toContain("CLAIMS GATE BLOCK");
});

