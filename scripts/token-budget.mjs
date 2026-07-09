#!/usr/bin/env node
/**
 * token-budget.mjs — context budget guard (simplicio-mapper pattern).
 *
 * Estimates the token cost of the artifacts an agent/LLM loads whole in
 * this repo (charter docs, the super-skill, the largest CLI modules) with
 * the labeled stdlib heuristic (chars/4) and FAILS when any artifact grows
 * more than 25% past the committed baseline — a doc or module that quietly
 * balloons is caught like a broken test.
 *
 * Modes:
 *   (none)             report + gate against the baseline
 *   --check            quiet unless failing (CI)
 *   --update-baseline  regenerate after a deliberate, reviewed size change
 *   --self-test        negative proof: the guard actually bites on a
 *                      simulated regression and passes small growth
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = join(ROOT, "scripts", "token-budget-baseline.json");
const THRESHOLD_GROWTH = 0.25;
const ESTIMATOR = "heuristic:chars-div-4";

const TRACKED = [
  "CLAUDE.md",
  "AGENTS.md",
  "PRD.md",
  ".skills/simplicio-loop-marketing/SKILL.md",
  "bin/marketing-engine.mjs",
  "lib/cli/generate.ts",
  "lib/cli/loop.ts",
  "lib/publish/verify-pipeline.ts",
];

function estimate(text) {
  return Math.ceil(text.length / 4);
}

function measure() {
  const artifacts = [];
  for (const rel of TRACKED) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) continue;
    artifacts.push({ label: rel, tokens: estimate(readFileSync(path, "utf8")) });
  }
  return artifacts;
}

function gate(artifacts, baseline, { quiet } = {}) {
  const byLabel = new Map(baseline.artifacts.map((a) => [a.label, a.tokens]));
  let failed = 0;
  for (const a of artifacts) {
    const base = byLabel.get(a.label);
    if (base === undefined) {
      if (!quiet) process.stderr.write(`[new] ${a.label} ${a.tokens} tok (no baseline — will be added on --update-baseline)\n`);
      continue;
    }
    const threshold = Math.round(base * (1 + THRESHOLD_GROWTH));
    const ok = a.tokens <= threshold;
    if (!ok) failed++;
    if (!quiet || !ok) {
      process.stderr.write(
        `[${ok ? "ok" : "FAIL"}] ${a.label} ${a.tokens} tok (baseline ${base}, threshold ${threshold})\n`,
      );
    }
  }
  return failed === 0;
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
}

const mode = process.argv[2] ?? "";

if (mode === "--update-baseline") {
  const payload = {
    estimator: ESTIMATOR,
    threshold_growth: THRESHOLD_GROWTH,
    generated_at: new Date().toISOString(),
    artifacts: measure(),
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  process.stderr.write(`baseline written: ${BASELINE_PATH} (${payload.artifacts.length} artifacts)\n`);
  process.exit(0);
}

if (mode === "--self-test") {
  // The guard must FAIL on a simulated 50% regression and PASS on +10%.
  const fake = [{ label: "x", tokens: 150 }];
  const failing = gate(fake, { artifacts: [{ label: "x", tokens: 100 }] }, { quiet: true });
  const passing = gate([{ label: "x", tokens: 110 }], { artifacts: [{ label: "x", tokens: 100 }] }, { quiet: true });
  if (failing || !passing) {
    process.stderr.write("token-budget self-test: FAIL (guard is theatrical)\n");
    process.exit(1);
  }
  process.stderr.write("token-budget self-test: PASS (guard bites on regression, allows small growth)\n");
  process.exit(0);
}

const baseline = loadBaseline();
if (!baseline) {
  process.stderr.write(`no baseline at ${BASELINE_PATH} — run --update-baseline first\n`);
  process.exit(1);
}
if (baseline.estimator !== ESTIMATOR) {
  process.stderr.write(`estimator mismatch: baseline=${baseline.estimator} current=${ESTIMATOR} — regenerate the baseline\n`);
  process.exit(1);
}
const ok = gate(measure(), baseline, { quiet: mode === "--check" });
process.stderr.write(`token-budget: ${ok ? "PASS" : "FAIL"}\n`);
process.exit(ok ? 0 : 1);
