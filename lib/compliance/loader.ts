import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  audit,
  writeReport,
  type AuditInput,
  type ComplianceReport,
  type RuleDef,
} from "./generic";
import { readPiece, transitionStatus } from "../pieces/store";

export function activeClient(): string {
  return process.env.ACTIVE_CLIENT ?? "saas-consultoria-imagem";
}

function engineRoot(root: string): string {
  const nested = resolve(root, ".marketing-engine");
  return existsSync(nested) ? nested : root;
}

export function clientOverridePath(client: string, root?: string): string {
  return resolve(
    engineRoot(root ?? process.cwd()),
    ".specs",
    "clients",
    client,
    "COMPLIANCE.override.md",
  );
}

interface OverrideRuleSource {
  rule_id: string;
  category: RuleDef["category"];
  pattern: string;
  flags?: string;
  severity: RuleDef["severity"];
  remediation?: string;
  applies_to?: string[];
}

const JSON_BLOCK_RE = /```json\s*([\s\S]*?)```/i;

export function loadOverrideRules(client: string, root?: string): {
  path: string;
  rules: RuleDef[];
} {
  const path = clientOverridePath(client, root);
  if (!existsSync(path)) {
    return { path, rules: [] };
  }

  const text = readFileSync(path, "utf8");
  const match = JSON_BLOCK_RE.exec(text);
  if (!match) {
    return { path, rules: [] };
  }

  const parsed = JSON.parse(match[1]) as OverrideRuleSource[];
  return {
    path,
    rules: parsed.map((rule) => ({
      rule_id: rule.rule_id,
      category: rule.category,
      pattern: new RegExp(rule.pattern, rule.flags ?? "i"),
      severity: rule.severity,
      remediation: rule.remediation,
      applies_to: rule.applies_to,
    })),
  };
}

function appendWeeklyDigest(
  root: string,
  client: string,
  report: ComplianceReport,
): void {
  if (report.warnings.length === 0) return;
  const digestPath = resolve(root, "data", "compliance-weekly-digest.md");
  if (!existsSync(dirname(digestPath))) mkdirSync(dirname(digestPath), { recursive: true });
  for (const warning of report.warnings) {
    appendFileSync(
      digestPath,
      `- ${new Date().toISOString()} | ${client} | ${report.piece_id} | ${warning.rule_id} | ${warning.snippet}\n`,
    );
  }
}

function maybeTransitionPieceToReview(root: string, pieceId: string): void {
  const piecesDir = resolve(root, "pieces");
  try {
    const piece = readPiece(pieceId, { piecesDir });
    if (piece.frontmatter.status === "draft") {
      transitionStatus(pieceId, "draft", "review", { piecesDir });
      return;
    }
    if (piece.frontmatter.status === "scheduled") {
      transitionStatus(pieceId, "scheduled", "review", { piecesDir });
      return;
    }
    if (piece.frontmatter.status === "published") {
      transitionStatus(pieceId, "published", "review", { piecesDir });
    }
  } catch {
    // No local piece file means we still preserve the report artefacts.
  }
}

function appendStreakAlerts(root: string, currentClient: string): void {
  const streaks = detectStreaks(root).filter((streak) => streak.client === currentClient);
  if (streaks.length === 0) return;

  const learningsPath = resolve(root, "data", "learnings.md");
  if (!existsSync(dirname(learningsPath))) mkdirSync(dirname(learningsPath), { recursive: true });
  for (const streak of streaks) {
    const line = `- ${new Date().toISOString()} | compliance streak | ${streak.client} | ${streak.rule_id} | pieces: ${streak.pieces.join(", ")}\n`;
    appendFileSync(learningsPath, line);
    process.stdout.write(
      `[compliance] streak alert for ${streak.client} on ${streak.rule_id}: ${streak.count} blocks this week\n`,
    );
  }
}

export async function runAudit(
  input: AuditInput & { root?: string },
): Promise<{ report: ComplianceReport; report_path: string }> {
  const root = engineRoot(input.root ?? process.cwd());
  const client = input.client ?? activeClient();
  const { path: overridePath, rules: extraRules } = loadOverrideRules(client, root);
  const report = await audit({
    ...input,
    client,
    extra_rules: extraRules,
  });
  if (extraRules.length > 0) {
    report.checked_against.push(`clients/${client}/COMPLIANCE.override.md`);
  }

  const path = writeReport(root, report);
  appendWeeklyDigest(root, client, report);

  if (!report.pass) {
    const blockedDir = resolve(root, "data", "compliance-blocked");
    if (!existsSync(blockedDir)) mkdirSync(blockedDir, { recursive: true });
    writeFileSync(
      resolve(blockedDir, `${report.piece_id}.json`),
      JSON.stringify(report, null, 2),
    );
    // Append to history for streak detection.
    const history = resolve(root, "data", "compliance-history.jsonl");
    if (!existsSync(dirname(history))) mkdirSync(dirname(history), { recursive: true });
    for (const v of report.violations) {
      appendFileSync(
        history,
        `${JSON.stringify({
          ts: new Date().toISOString(),
          client,
          rule_id: v.rule_id,
          piece_id: report.piece_id,
        })}\n`,
      );
    }
    maybeTransitionPieceToReview(root, report.piece_id);
    appendStreakAlerts(root, client);
  }
  return { report, report_path: path };
}

export interface StreakDetection {
  client: string;
  rule_id: string;
  count: number;
  pieces: string[];
}

export function detectStreaks(root: string, days = 7): StreakDetection[] {
  const path = resolve(root, "data", "compliance-history.jsonl");
  if (!existsSync(path)) return [];
  const cutoff = Date.now() - days * 86400 * 1000;
  const counts = new Map<string, { count: number; pieces: string[] }>();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as {
        ts?: string;
        client?: string;
        rule_id?: string;
        piece_id?: string;
      };
      if (!r.ts || Date.parse(r.ts) < cutoff) continue;
      const key = `${r.client}::${r.rule_id}`;
      const cur = counts.get(key) ?? { count: 0, pieces: [] };
      cur.count += 1;
      if (r.piece_id) cur.pieces.push(r.piece_id);
      counts.set(key, cur);
    } catch {}
  }
  const out: StreakDetection[] = [];
  for (const [key, v] of counts) {
    if (v.count >= 3) {
      const [client, rule_id] = key.split("::");
      out.push({ client, rule_id, count: v.count, pieces: v.pieces });
    }
  }
  return out;
}
