import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const REQUIRED_COMMANDS = [
  "npm ci",
  "npm run ci:verify",
  "npm run lint",
  "npm run typecheck",
  "npm run budget",
  "npm run coverage",
  "npm run test:e2e",
] as const;

export interface GateReport {
  pass: boolean;
  errors: string[];
  workflow: string;
  coverage: { lines: number | null; statements: number | null; functions: number | null; branches: number | null };
}

function threshold(script: string, flag: string): number | null {
  const match = script.match(new RegExp(`(?:^|\\s)--${flag}\\s+(\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : null;
}

export function inspectQualityGate(root = process.cwd()): GateReport {
  const workflowPath = resolve(root, ".github/workflows/quality-gate.yml");
  const packagePath = resolve(root, "package.json");
  const errors: string[] = [];
  let workflow = "";
  let packageJson: { scripts?: Record<string, string> } = {};

  try { workflow = readFileSync(workflowPath, "utf8"); }
  catch { errors.push("missing .github/workflows/quality-gate.yml"); }
  try { packageJson = JSON.parse(readFileSync(packagePath, "utf8")); }
  catch { errors.push("missing or invalid package.json"); }

  if (!/^\s*pull_request:\s*$/m.test(workflow)) errors.push("workflow must run on pull_request");
  if (!/^\s*push:\s*$/m.test(workflow) || !/^\s*branches:\s*\[main\]\s*$/m.test(workflow)) errors.push("workflow must run on pushes to main");
  if (!/^permissions:\s*\n\s+contents:\s*read\s*$/m.test(workflow)) errors.push("workflow permissions must be read-only");
  if (!/timeout-minutes:\s*\d+/.test(workflow)) errors.push("workflow jobs need a timeout");

  for (const command of REQUIRED_COMMANDS) {
    if (!workflow.includes(`run: ${command}`)) errors.push(`workflow does not run: ${command}`);
    const scriptName = command.match(/^npm run (.+)$/)?.[1];
    if (scriptName && !packageJson.scripts?.[scriptName]) errors.push(`workflow references missing package script: ${scriptName}`);
  }

  const coverageScript = packageJson.scripts?.coverage ?? "";
  const coverage = {
    lines: threshold(coverageScript, "lines"),
    statements: threshold(coverageScript, "statements"),
    functions: threshold(coverageScript, "functions"),
    branches: threshold(coverageScript, "branches"),
  };
  if (!coverageScript.includes("--check-coverage")) errors.push("coverage script must fail when thresholds are missed");
  for (const metric of ["lines", "statements", "functions"] as const) {
    if ((coverage[metric] ?? 0) < 85) errors.push(`${metric} coverage threshold must be at least 85%`);
  }
  if ((coverage.branches ?? 0) < 70) errors.push("branch coverage threshold must be at least 70%");

  return { pass: errors.length === 0, errors, workflow: workflowPath, coverage };
}
