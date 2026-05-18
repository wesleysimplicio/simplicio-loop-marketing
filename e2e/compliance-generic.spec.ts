import { test, expect } from "@playwright/test";
import { mkdtempSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditSync } from "../lib/compliance/generic";
import {
  activeClient,
  loadOverrideRules,
  runAudit,
} from "../lib/compliance/loader";
import { humanizeSync } from "../lib/skills/humanizer";
import { scoreBrandVoice } from "../lib/skills/brand-voice";

test("auditSync flags guaranteed return", () => {
  const r = auditSync({
    piece_id: "p1",
    text: "Invista hoje e garantimos 12% ao ano sem risco.",
    vertical: "finance",
  });
  expect(r.pass).toBe(false);
  expect(r.violations.some((v) => v.rule_id === "finance.guaranteed_return")).toBe(true);
});

test("auditSync flags clinically proven without source", () => {
  const r = auditSync({ piece_id: "p2", text: "Our cream is clinically proven to whiten." });
  expect(r.pass).toBe(false);
  expect(r.violations.some((v) => v.rule_id === "health.clinically_proven")).toBe(true);
});

test("auditSync requires disclaimer when before/after appears", () => {
  const r = auditSync({ piece_id: "p3", text: "Look at this before/after transformation!" });
  expect(r.pass).toBe(false);
  expect(r.violations.some((v) => v.rule_id.includes("before_after"))).toBe(true);

  const ok = auditSync({
    piece_id: "p3b",
    text: "Look at this before/after transformation!",
    before_after_disclaimer: true,
  });
  expect(ok.pass).toBe(true);
});

test("auditSync passes clean copy", () => {
  const r = auditSync({
    piece_id: "p4",
    text: "Free shipping over $200. See the new collection.",
  });
  expect(r.pass).toBe(true);
});

test("runAudit writes report to data/compliance/<piece>.json", async () => {
  const host = mkdtempSync(join(tmpdir(), "me-comp-"));
  const r = await runAudit({
    piece_id: "p1",
    text: "clean caption text",
    root: host,
  });
  expect(r.report.pass).toBe(true);
  expect(existsSync(r.report_path)).toBe(true);
  const file = JSON.parse(readFileSync(r.report_path, "utf8"));
  expect(file.piece_id).toBe("p1");
});

test("activeClient defaults to saas-consultoria-imagem", () => {
  const original = process.env.ACTIVE_CLIENT;
  delete process.env.ACTIVE_CLIENT;
  try {
    expect(activeClient()).toBe("saas-consultoria-imagem");
  } finally {
    if (original === undefined) delete process.env.ACTIVE_CLIENT;
    else process.env.ACTIVE_CLIENT = original;
  }
});

test("loadOverrideRules reads additive JSON rules from the client override file", () => {
  const host = mkdtempSync(join(tmpdir(), "me-comp-override-"));
  const specDir = join(host, ".specs", "clients", "beauty-brand");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(
    join(specDir, "COMPLIANCE.override.md"),
    `# override\n\n\`\`\`json\n[\n  {\n    "rule_id": "beauty.claims.registration_missing",\n    "category": "health",\n    "pattern": "anvisa-free",\n    "flags": "i",\n    "severity": "block",\n    "remediation": "Add the approved Anvisa registration disclosure."\n  }\n]\n\`\`\`\n`,
  );

  const loaded = loadOverrideRules("beauty-brand", host);
  expect(loaded.rules).toHaveLength(1);
  expect(loaded.rules[0]?.rule_id).toBe("beauty.claims.registration_missing");
  expect(loaded.rules[0]?.pattern.test("ANVISA-FREE glow")).toBe(true);
});

test("runAudit applies client override rules, writes digest, and flips the piece to review", async () => {
  const host = mkdtempSync(join(tmpdir(), "me-comp-block-"));
  const workspace = join(host, ".marketing-engine");
  mkdirSync(join(workspace, "pieces"), { recursive: true });
  mkdirSync(join(workspace, ".specs", "clients", "beauty-brand"), { recursive: true });
  writeFileSync(
    join(workspace, ".specs", "clients", "beauty-brand", "COMPLIANCE.override.md"),
    `# override\n\n\`\`\`json\n[\n  {\n    "rule_id": "beauty.claims.registration_missing",\n    "category": "health",\n    "pattern": "anvisa-free",\n    "flags": "i",\n    "severity": "block",\n    "remediation": "Add the approved Anvisa registration disclosure."\n  },\n  {\n    "rule_id": "beauty.copy.review_claim",\n    "category": "comparison",\n    "pattern": "editor-approved",\n    "flags": "i",\n    "severity": "warn",\n    "remediation": "Clarify who reviewed the claim."\n  }\n]\n\`\`\`\n`,
  );
  writeFileSync(
    join(workspace, "pieces", "p-beauty.md"),
    `---\nid: p-beauty\nclient: beauty-brand\ndate: 2026-05-18\nstatus: draft\ntype: reel\npillar: education\nplatforms: [\"instagram\"]\nlocale: en\n---\n# Brief\n\nGlow now.\n`,
  );

  const output: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;

  try {
    for (let i = 0; i < 3; i++) {
      await runAudit({
        piece_id: "p-beauty",
        text: "ANVISA-free glow. Editor-approved results.",
        client: "beauty-brand",
        root: host,
      });
    }
  } finally {
    process.stdout.write = originalWrite;
  }

  const report = JSON.parse(
    readFileSync(join(workspace, "data", "compliance", "p-beauty.json"), "utf8"),
  );
  expect(report.pass).toBe(false);
  expect(report.checked_against).toContain("clients/beauty-brand/COMPLIANCE.override.md");
  expect(report.violations.some((v: { rule_id: string }) => v.rule_id === "beauty.claims.registration_missing")).toBe(true);
  expect(report.warnings.some((v: { rule_id: string }) => v.rule_id === "beauty.copy.review_claim")).toBe(true);
  expect(existsSync(join(workspace, "data", "compliance-blocked", "p-beauty.json"))).toBe(true);
  expect(readFileSync(join(workspace, "pieces", "p-beauty.md"), "utf8")).toMatch(/status: review/);
  expect(readFileSync(join(workspace, "data", "compliance-weekly-digest.md"), "utf8")).toContain("beauty.copy.review_claim");
  expect(readFileSync(join(workspace, "data", "learnings.md"), "utf8")).toContain("beauty.claims.registration_missing");
  expect(output.join("")).toContain("streak alert");
});

test("humanizeSync removes em-dashes and triadic patterns", () => {
  const r = humanizeSync(
    "In conclusion, color analysis is fast, simple, and effective — really.",
  );
  expect(r.text).not.toContain("—");
  expect(r.text).not.toContain("In conclusion");
  expect(r.changes.length).toBeGreaterThan(0);
});

test("scoreBrandVoice returns score in [0,1] and detects banned terms", () => {
  const r = scoreBrandVoice("This is delve-tastic leverage!", {
    voice_axes: { tone: 3, formality: 2, energy: 3, warmth: 3 },
    lexicon: { avoid: ["delve", "leverage"] },
  });
  expect(r.score).toBeGreaterThanOrEqual(0);
  expect(r.score).toBeLessThanOrEqual(1);
  expect(r.notes.some((n) => n.includes("delve"))).toBe(true);
  expect(r.notes.some((n) => n.includes("leverage"))).toBe(true);
});
