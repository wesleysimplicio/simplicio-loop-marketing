import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { readPiece } from "../pieces/store";
import { loadSchemaRegistry } from "../contracts/registry";
import { validateArtifact } from "../contracts/validate";

export interface EvidenceGateResult {
  piece_id: string;
  pass: boolean;
  missing: string[];
  evidence_paths: string[];
}
export interface EvidenceGateOptions { outputsDir?: string; piecesDir?: string; }

function engineRoot(root: string): string {
  const nested = resolve(root, ".marketing-engine");
  return existsSync(nested) ? nested : root;
}

function json(path: string): unknown | null {
  try { return JSON.parse(readFileSync(path, "utf8")) as unknown; } catch { return null; }
}

function addMissing(missing: string[], label: string): void {
  if (!missing.includes(label)) missing.push(label);
}

function isEvidenceArtifactPath(path: string): boolean {
  return /\.(png|jpe?g|webp|webm|mp4|html|trace\.zip)$/i.test(path);
}

function evidenceCandidates(root: string, outputDir: string, manifest: Record<string, unknown>): string[] {
  const paths: string[] = [];
  const listed = Array.isArray(manifest.outputs) ? manifest.outputs : [];
  for (const value of listed) {
    if (typeof value === "string" && existsSync(value) && isEvidenceArtifactPath(value)) {
      paths.push(value);
    }
  }
  for (const dir of [join(root, "test-results"), join(root, "playwright-report"), join(root, "data", "evidence"), join(outputDir, "evidence")]) {
    if (!existsSync(dir)) continue;
    const walk = (current: string): void => {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const path = join(current, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.(png|jpe?g|webp|webm|mp4|json|html|trace\.zip)$/i.test(entry.name)) paths.push(path);
      }
    };
    walk(dir);
  }
  return [...new Set(paths)];
}

/** Fail-closed completion gate shared by generate and future campaign anchors. */
export function gateEvidence(root: string, pieceId: string, opts: EvidenceGateOptions = {}): EvidenceGateResult {
  const base = engineRoot(root);
  const missing: string[] = [];
  const evidence_paths: string[] = [];
  let outputDir = "";
  let manifest: Record<string, unknown> | null = null;
  try {
    const piece = readPiece(pieceId, { piecesDir: opts.piecesDir ?? resolve(base, "pieces") });
    outputDir = resolve(opts.outputsDir ?? resolve(base, "outputs"), piece.frontmatter.client, piece.frontmatter.date.slice(0, 10), pieceId);
  } catch { addMissing(missing, "piece metadata"); }
  const manifestPath = outputDir ? join(outputDir, "manifest.json") : "";
  if (!manifestPath || !existsSync(manifestPath)) addMissing(missing, "manifest.json");
  else {
    const parsed = json(manifestPath);
    if (!parsed || typeof parsed !== "object") addMissing(missing, "manifest.json (valid JSON)");
    else {
      manifest = parsed as Record<string, unknown>;
      const valid = validateArtifact(manifest, loadSchemaRegistry());
      if (!valid.ok) addMissing(missing, `manifest.json (schema: ${valid.errors.join("; ")})`);
    }
  }
  const compliancePath = join(outputDir, "compliance.json");
  const compliance = json(compliancePath);
  if (!compliancePath || !existsSync(compliancePath)) addMissing(missing, "compliance.json");
  else if (!compliance || (compliance as { pass?: boolean }).pass !== true) addMissing(missing, "compliance.pass=true");
  const qaPath = join(outputDir, "qa-tech-specs.json");
  const qa = json(qaPath);
  if (!qaPath || !existsSync(qaPath)) addMissing(missing, "qa-tech-specs.json");
  else if (!qa || (qa as { pass?: boolean }).pass !== true) addMissing(missing, "qa-tech-specs.pass=true");
  const captionsPath = join(outputDir, "captions.json");
  const captions = json(captionsPath) as Record<string, unknown> | null;
  if (!captionsPath || !existsSync(captionsPath)) addMissing(missing, "captions.json");
  else for (const platform of ["instagram", "tiktok", "linkedin", "x"]) if (typeof captions?.[platform] !== "string" || !captions[platform]) addMissing(missing, `captions.${platform}`);
  const watcherPath = typeof manifest?.watcher_report_path === "string" ? manifest.watcher_report_path : "";
  const watcher = watcherPath ? json(watcherPath) as { passed?: boolean } | null : null;
  if (!watcherPath || !existsSync(watcherPath)) addMissing(missing, "watcher_report_path");
  else if (!watcher || watcher.passed !== true) addMissing(missing, "watcher_report.passed=true");
  const runLogs = [join(base, "data", "runs.jsonl"), join(base, "data", "llm-usage.jsonl")];
  for (const path of runLogs) if (!existsSync(path) || readFileSync(path, "utf8").trim().length === 0) addMissing(missing, path.endsWith("runs.jsonl") ? "data/runs.jsonl" : "data/llm-usage.jsonl");
  if (manifest) evidence_paths.push(...evidenceCandidates(base, outputDir, manifest));
  if (evidence_paths.length === 0) addMissing(missing, "evidence artifact (Playwright/watcher)");
  return { piece_id: pieceId, pass: missing.length === 0, missing, evidence_paths };
}
