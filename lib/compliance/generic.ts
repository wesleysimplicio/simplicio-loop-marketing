import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface Violation {
  rule_id: string;
  severity: "block" | "warn";
  snippet: string;
  remediation?: string;
}

export interface ComplianceReport {
  piece_id: string;
  pass: boolean;
  violations: Violation[];
  warnings: Violation[];
  checked_against: string[];
  vertical_used?: string;
}

interface RuleDef {
  rule_id: string;
  category: "health" | "finance" | "comparison" | "audience" | "legal" | "privacy";
  pattern: RegExp;
  severity: "block" | "warn";
  remediation?: string;
  applies_to?: Array<string>;
}

export const BASE_RULES: RuleDef[] = [
  // Health
  {
    rule_id: "health.medical_claim",
    category: "health",
    pattern:
      /\b(?:cure[sd]?|treats?|prevents?|diagnoses?|heals?|cura|trata|previne)\b\s+\w+/i,
    severity: "block",
    remediation: "Remove diagnostic / curative language or add licensed disclaimer.",
  },
  {
    rule_id: "health.clinically_proven",
    category: "health",
    pattern: /clinically\s+proven|cientificamente\s+comprovado/i,
    severity: "block",
    remediation: "Cite the study in the caption or remove the claim.",
  },
  {
    rule_id: "health.weight_loss_specific",
    category: "health",
    pattern: /(?:lose|perca)\s+\d+\s*(?:kg|lbs?|quilos?|pounds?)\s+in\s+\d+/i,
    severity: "block",
    remediation: "Remove specific weight-loss numerics without sourced study.",
  },
  // Finance
  {
    rule_id: "finance.guaranteed_return",
    category: "finance",
    pattern:
      /(?:guaranteed?|garantia\s+de|garantimos?)\s+(?:return|income|cash[- ]?back|results?|rendimento|lucro|retorno|\d+%)/i,
    severity: "block",
    remediation: "Remove guarantee language; past returns are not guarantee of future.",
  },
  {
    rule_id: "finance.risk_free",
    category: "finance",
    pattern: /risk[- ]?free|sem\s+riscos?/i,
    severity: "block",
    remediation: "Refund policy is allowed; risk-free framing is not.",
  },
  // Comparison
  {
    rule_id: "comparison.unsourced_superiority",
    category: "comparison",
    pattern: /\b(?:better|melhor)\s+than\s+(?:\[?[A-Z]\w+\]?)/i,
    severity: "warn",
    remediation: "Add a sourced benchmark or remove the comparison.",
  },
  // Audience integrity
  {
    rule_id: "audience.false_scarcity",
    category: "audience",
    pattern: /only\s+\d+\s+left|últimas?\s+vagas?/i,
    severity: "warn",
    remediation: "Confirm inventory truth; do not fake countdowns.",
  },
  // Legal / IP
  {
    rule_id: "legal.copyrighted_phrase",
    category: "legal",
    pattern: /\b(?:Spotify|Disney|Marvel|Star\s?Wars|Netflix)™?\b/i,
    severity: "warn",
    remediation: "Verify licensing relationship before using trademarked names.",
  },
];

function isDryRun(): boolean {
  const v = process.env.DRY_RUN;
  return v === undefined || v === "" || v === "true";
}

export interface AuditInput {
  piece_id: string;
  text: string;
  client?: string;
  vertical?: string;
  before_after_disclaimer?: boolean;
  extra_rules?: RuleDef[];
}

export function auditSync(input: AuditInput): ComplianceReport {
  const rules = [...BASE_RULES, ...(input.extra_rules ?? [])];
  const text = input.text;
  const violations: Violation[] = [];
  const warnings: Violation[] = [];
  for (const r of rules) {
    if (r.applies_to && input.vertical && !r.applies_to.includes(input.vertical)) {
      continue;
    }
    const m = r.pattern.exec(text);
    if (!m) continue;
    const entry: Violation = {
      rule_id: r.rule_id,
      severity: r.severity,
      snippet: m[0],
      remediation: r.remediation,
    };
    if (r.severity === "block") violations.push(entry);
    else warnings.push(entry);
  }
  if (/before\s*\/?\s*after|antes\s*\/?\s*depois/i.test(text)) {
    if (!input.before_after_disclaimer) {
      violations.push({
        rule_id: "audience.before_after_no_disclaimer",
        severity: "block",
        snippet: "before/after referenced without disclaimer",
        remediation: "Add 'individual results vary' or remove the framing.",
      });
    }
  }
  return {
    piece_id: input.piece_id,
    pass: violations.length === 0,
    violations,
    warnings,
    checked_against: ["product/COMPLIANCE.md"],
    vertical_used: input.vertical,
  };
}

export async function audit(input: AuditInput): Promise<ComplianceReport> {
  // Regex pass first; LLM secondary pass available when not DRY_RUN
  const report = auditSync(input);
  if (!isDryRun() && process.env.COMPLIANCE_LLM_SECONDARY === "true") {
    // Real implementation would call llm-router with task: compliance here.
    // Kept as no-op stub to avoid blocking on real API keys in tests.
  }
  return report;
}

export function writeReport(root: string, report: ComplianceReport): string {
  const dir = resolve(root, "data", "compliance");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${report.piece_id}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

void dirname;
