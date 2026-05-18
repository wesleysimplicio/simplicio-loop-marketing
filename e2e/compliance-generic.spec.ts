import { test, expect } from "@playwright/test";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditSync } from "../lib/compliance/generic";
import { runAudit } from "../lib/compliance/loader";
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
