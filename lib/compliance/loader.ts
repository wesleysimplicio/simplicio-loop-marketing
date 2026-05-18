import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { audit, writeReport, type AuditInput, type ComplianceReport } from "./generic";

export function activeClient(): string {
  return process.env.ACTIVE_CLIENT ?? "default";
}

export function clientOverridePath(client: string, root?: string): string {
  return resolve(
    root ?? process.cwd(),
    ".specs",
    "clients",
    client,
    "COMPLIANCE.override.md",
  );
}

export async function runAudit(
  input: AuditInput & { root?: string },
): Promise<{ report: ComplianceReport; report_path: string }> {
  const root = input.root ?? process.cwd();
  const client = input.client ?? activeClient();
  const overridePath = clientOverridePath(client, root);
  let extraRulesNote: string | undefined;
  if (existsSync(overridePath)) {
    extraRulesNote = `loaded ${overridePath}`;
  }
  const report = await audit({
    ...input,
    client,
  });
  if (extraRulesNote) report.checked_against.push(extraRulesNote);

  const path = writeReport(root, report);

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
