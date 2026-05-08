import { test, expect } from "@playwright/test";

/**
 * Pure compliance-skill simulation. Mirrors the generic rules in
 * .skills/compliance-generic/SKILL.md so we can exercise the
 * acceptance/rejection logic without invoking any LLM.
 */

interface ComplianceInput {
  text: string;
  hasBeforeAfterDisclaimer?: boolean;
}

interface ComplianceResult {
  pass: boolean;
  violations: string[];
}

const FORBIDDEN_PATTERNS: ReadonlyArray<{ pattern: RegExp; code: string }> = [
  { pattern: /garantia\s+de\s+transforma[cç][ãa]o/i, code: "guaranteed_transformation" },
  { pattern: /diagn[oó]stico\s+psicol[oó]gico/i, code: "psych_diagnosis" },
  { pattern: /melhor\s+que\s+(?:o\s+)?concorrente/i, code: "competitor_comparison" },
  { pattern: /aprova[cç][ãa]o\s+social\s+garantida/i, code: "social_approval_guarantee" },
];

function evaluateCompliance(input: ComplianceInput): ComplianceResult {
  const violations: string[] = [];
  if (!input.text || input.text.trim().length === 0) {
    return { pass: false, violations: ["empty_text"] };
  }
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(input.text)) {
      violations.push(rule.code);
    }
  }
  const beforeAfterMentioned = /antes\s*\/\s*depois|antes\s+e\s+depois/i.test(
    input.text,
  );
  if (beforeAfterMentioned && !input.hasBeforeAfterDisclaimer) {
    violations.push("missing_before_after_disclaimer");
  }
  return { pass: violations.length === 0, violations };
}

test("flags guaranteed transformation phrasing", () => {
  const result = evaluateCompliance({
    text: "Voce tera garantia de transformacao em 30 dias",
  });
  expect(result.pass).toBe(false);
  expect(result.violations).toContain("guaranteed_transformation");
});

test("flags psychological diagnosis claim", () => {
  const result = evaluateCompliance({
    text: "Fazemos diagnostico psicologico do seu estilo",
  });
  expect(result.pass).toBe(false);
  expect(result.violations).toContain("psych_diagnosis");
});

test("passes when individual experience framing is present in before/after", () => {
  const result = evaluateCompliance({
    text: "Antes e depois real de uma cliente. Experiencia individual, resultados variam.",
    hasBeforeAfterDisclaimer: true,
  });
  expect(result.pass).toBe(true);
  expect(result.violations).toHaveLength(0);
});

test("fails on empty caption (suspicious)", () => {
  const result = evaluateCompliance({ text: "" });
  expect(result.pass).toBe(false);
  expect(result.violations).toContain("empty_text");
});
