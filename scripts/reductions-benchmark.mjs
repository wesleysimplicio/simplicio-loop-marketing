#!/usr/bin/env node
/**
 * reductions-benchmark.mjs — reproducible proof-trail benchmark for
 * REDUCTIONS.md (issue #78, "Case Study: Reductions in Everything").
 *
 * The case study asks for a script "que qualquer um pode rodar" (that
 * anyone can run) instead of a static claim. This script:
 *
 *   1. Parses every "## Reduction N — ..." section in REDUCTIONS.md.
 *   2. Verifies every "Repo proof" file link actually exists on disk
 *      (fail-closed — a stale proof link fails the run, same discipline
 *      as scripts/claims-audit.mjs).
 *   3. Measures the on-disk byte footprint of each reduction's proof
 *      artifacts, as a repo-local, reproducible footprint metric.
 *   4. Writes a JSON receipt so runs are comparable over time.
 *
 * This does NOT claim production conversion, traffic, or spend numbers —
 * CASE-STUDY.md already marks those external follow-up. What this proves
 * is narrower and honest: "every reduction claim still points at a real,
 * present file."
 *
 * Usage:
 *   node scripts/reductions-benchmark.mjs            # print + write receipt
 *   node scripts/reductions-benchmark.mjs --check     # exit 1 on stale proof
 */

import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REDUCTIONS_PATH = join(ROOT, "REDUCTIONS.md");
const RECEIPT_PATH = join(ROOT, "docs", "evidence", "reductions-benchmark.json");

function parseReductions(rawText) {
  const text = rawText.replace(/\r\n/g, "\n");
  const sections = text.split(/^## /m).slice(1);
  const reductions = [];
  for (const section of sections) {
    const headingMatch = section.match(/^(Reduction \d+[^\n]*)/);
    if (!headingMatch) continue;
    const title = headingMatch[1].trim();
    const proofBlockMatch = section.match(/- Repo proof:\n([\s\S]*?)(?:\n- Narrative angle:|\n## |$)/);
    const proofFiles = [];
    if (proofBlockMatch) {
      for (const m of proofBlockMatch[1].matchAll(/\[([^\]]+)\]\(\.\/([^)]+)\)/g)) {
        proofFiles.push(m[2]);
      }
    }
    reductions.push({ title, proofFiles });
  }
  return reductions;
}

function fileBytes(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return null;
  const st = statSync(abs);
  if (st.isDirectory()) return null; // directories (e.g. templates/) are not measured as a single file
  return st.size;
}

function measure(reductions) {
  const results = [];
  const missing = [];
  for (const r of reductions) {
    let totalBytes = 0;
    const files = [];
    for (const rel of r.proofFiles) {
      const exists = existsSync(join(ROOT, rel));
      if (!exists) missing.push(`${r.title} :: ${rel}`);
      const bytes = fileBytes(rel);
      if (bytes !== null) totalBytes += bytes;
      files.push({ path: rel, exists, bytes });
    }
    results.push({ title: r.title, proof_file_count: r.proofFiles.length, footprint_bytes: totalBytes, files });
  }
  return { results, missing };
}

function main() {
  const checkMode = process.argv.includes("--check");
  const text = readFileSync(REDUCTIONS_PATH, "utf8");
  const reductions = parseReductions(text);
  const { results, missing } = measure(reductions);

  process.stderr.write(`reductions-benchmark: parsed ${reductions.length} reduction(s) from REDUCTIONS.md\n`);
  for (const r of results) {
    process.stderr.write(
      `  - ${r.title} :: ${r.proof_file_count} proof file(s), ${r.footprint_bytes} bytes on disk\n`,
    );
  }

  if (missing.length > 0) {
    for (const m of missing) process.stderr.write(`reductions-benchmark: FAIL — stale proof link: ${m}\n`);
    if (checkMode) process.exit(1);
  }

  if (checkMode) {
    if (reductions.length < 4) {
      process.stderr.write(`reductions-benchmark: FAIL — expected >=4 reductions, got ${reductions.length}\n`);
      process.exit(1);
    }
    process.stderr.write("reductions-benchmark: PASS\n");
    return;
  }

  const receipt = {
    schema: "simplicio.reductions-benchmark/v1",
    generated_at: new Date().toISOString(),
    source: "REDUCTIONS.md",
    reduction_count: reductions.length,
    stale_proof_links: missing,
    reductions: results,
  };
  mkdirSync(dirname(RECEIPT_PATH), { recursive: true });
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stderr.write(`reductions-benchmark: wrote ${RECEIPT_PATH}\n`);
}

main();
