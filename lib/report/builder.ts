import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gateEvidence, type EvidenceGateResult } from "../gate/evidence";

export interface ReportOptions { requireEvidence?: boolean; }
export class EvidenceRequiredError extends Error { exitCode = 3; }
function load(path: string): Record<string, unknown> { try { return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>; } catch { return {}; } }
function engineRoot(root: string): string { const nested = resolve(root, ".marketing-engine"); return existsSync(nested) ? nested : root; }

export function buildReport(root: string, pieceId: string, opts: ReportOptions = {}): string {
  const base = engineRoot(root);
  const gate: EvidenceGateResult = gateEvidence(root, pieceId);
  if (opts.requireEvidence && gate.evidence_paths.length === 0) throw new EvidenceRequiredError(`blocked: no evidence for ${pieceId}`);
  const piece = (() => { try { return readFileSync(resolve(base, "pieces", `${pieceId}.md`), "utf8"); } catch { return ""; } })();
  const manifestPath = (() => { const m = piece.match(/client:\s*(\S+)[\s\S]*?date:\s*(\S+)/); return m ? resolve(base, "outputs", m[1], m[2].slice(0, 10), pieceId, "manifest.json") : ""; })();
  const manifest = manifestPath ? load(manifestPath) : {};
  const claims: { tag?: string } = manifest.watcher_report_path ? load(String(manifest.watcher_report_path)) as { tag?: string } : {};
  const journalPath = manifestPath ? join(resolve(manifestPath, ".."), "journal.jsonl") : "";
  const journalRows = journalPath && existsSync(journalPath) ? readFileSync(journalPath, "utf8").split("\n").filter(Boolean) : [];
  const lines = [`# Evidence report: ${pieceId}`, "", `Verdict: **${gate.pass ? "PASS" : "BLOCKED"}**`, "", "## Acceptance criteria", ...[
    ["manifest.json", !gate.missing.some((m) => m.startsWith("manifest.json"))], ["compliance.pass=true", !gate.missing.includes("compliance.pass=true")], ["qa-tech-specs.pass=true", !gate.missing.some((m) => m.startsWith("qa-tech-specs"))], ["4-platform captions", !gate.missing.some((m) => m.startsWith("captions."))], ["watcher evidence", !gate.missing.some((m) => m.startsWith("watcher"))],
  ].map(([name, pass]) => `- [${pass ? "x" : " "}] ${name}`), "", "## Evidence", ...(gate.evidence_paths.length ? gate.evidence_paths.map((p) => `- ${p}`) : ["- none"]), "", "## Providers and cost", `- providers: ${JSON.stringify(manifest.providers ?? {})}`, `- cost_estimate_usd: ${String(manifest.cost_estimate_usd ?? "unknown")}`, "", "## Journal", `- attempts: ${journalRows.length}`];
  if (claims && claims.tag === "UNVERIFIED") lines.push("", "## CLAIMS GATE BLOCK", "This piece is **UNVERIFIED** and must not be promoted.");
  if (gate.missing.length) lines.push("", "## Missing", ...gate.missing.map((m) => `- ${m}`));
  return `${lines.join("\n")}\n`;
}
