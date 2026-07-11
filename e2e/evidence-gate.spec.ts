import { test, expect } from "@playwright/test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { serializePiece, type PieceFrontmatter } from "../lib/pieces/frontmatter";
import { gateEvidence } from "../lib/gate/evidence";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "me-evidence-"));
  const ws = join(root, ".marketing-engine");
  const id = "piece-evidence-1";
  const out = join(ws, "outputs", "acme", "2026-05-08", id);
  mkdirSync(join(ws, "pieces"), { recursive: true });
  mkdirSync(out, { recursive: true });
  const fm: PieceFrontmatter = { id, client: "acme", date: "2026-05-08", status: "draft", type: "reel", pillar: "education", platforms: ["instagram", "tiktok", "linkedin", "x"], locale: "en" };
  writeFileSync(join(ws, "pieces", `${id}.md`), serializePiece(fm, "brief"));
  const watcher = join(ws, "data", "gate", `${id}.json`);
  mkdirSync(join(ws, "data", "gate"), { recursive: true });
  writeFileSync(watcher, JSON.stringify({ piece_id: id, tag: "MEASURED", passed: true, checked: [], checked_at: new Date().toISOString() }));
  writeFileSync(join(out, "compliance.json"), JSON.stringify({ pass: true, violations: [] }));
  writeFileSync(join(out, "qa-tech-specs.json"), JSON.stringify({ pass: true, assets: [] }));
  writeFileSync(join(out, "captions.json"), JSON.stringify({ instagram: "a", tiktok: "b", linkedin: "c", x: "d" }));
  writeFileSync(join(out, "evidence.png"), "evidence");
  writeFileSync(join(ws, "data", "runs.jsonl"), JSON.stringify({ piece_id: id, status: "success" }));
  writeFileSync(join(ws, "data", "llm-usage.jsonl"), JSON.stringify({ piece_id: id, ok: true }));
  writeFileSync(join(out, "manifest.json"), JSON.stringify({ schema: "marketing-manifest/v1", generated_at: new Date().toISOString(), piece_id: id, client: "acme", date: "2026-05-08", providers: {}, prompts: {}, cost_estimate_usd: 0, compliance_report_path: join(out, "compliance.json"), qa_report_path: join(out, "qa-tech-specs.json"), watcher_report_path: watcher, outputs: [join(out, "evidence.png")] }));
  return { root, id, out };
}

test("evidence gate passes only with the complete artifact set", () => {
  const f = fixture();
  expect(gateEvidence(f.root, f.id)).toMatchObject({ piece_id: f.id, pass: true, missing: [] });
});

for (const [file, label] of [["manifest.json", "manifest.json"], ["compliance.json", "compliance.json"], ["qa-tech-specs.json", "qa-tech-specs.json"], ["captions.json", "captions.json"]] as const) {
  test(`missing ${file} is named by the gate`, () => {
    const f = fixture();
    rmSync(join(f.out, file));
    expect(gateEvidence(f.root, f.id).missing.some((m) => m.includes(label))).toBe(true);
  });
}
