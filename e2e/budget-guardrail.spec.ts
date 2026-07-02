import { test, expect } from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkGuardrails,
  recordPromotionAttempt,
  DEFAULT_GUARDRAILS,
} from "../lib/promotion/budget-guardrail";

test("checkGuardrails passes a draft within all limits", () => {
  const r = checkGuardrails({ piece_id: "p1", daily_budget_usd: 10 });
  expect(r.ok).toBe(true);
  expect(r.violations).toHaveLength(0);
});

test("checkGuardrails flags daily spend over the cap", () => {
  const r = checkGuardrails({ piece_id: "p1", daily_budget_usd: 999 });
  expect(r.ok).toBe(false);
  expect(r.violations[0]).toContain("daily_budget_usd");
});

test("checkGuardrails enforces stop-loss on cumulative spend", () => {
  const r = checkGuardrails({
    piece_id: "p1",
    daily_budget_usd: 10,
    cumulative_spend_usd: 200,
  });
  expect(r.ok).toBe(false);
  expect(r.violations.some((v) => v.includes("stop_loss"))).toBe(true);
});

test("checkGuardrails enforces max CPA/CPL and experiment duration", () => {
  const r = checkGuardrails({
    piece_id: "p1",
    daily_budget_usd: 10,
    observed_cpa_usd: 999,
    observed_cpl_usd: 999,
    experiment_duration_days: 999,
  });
  expect(r.violations).toHaveLength(3);
});

test("recordPromotionAttempt appends the hypothesis + guardrails to an audit log", () => {
  const host = mkdtempSync(join(tmpdir(), "me-guardrail-"));
  recordPromotionAttempt(host, {
    piece_id: "p1",
    timestamp: new Date().toISOString(),
    metric: "save_rate",
    channel: "instagram",
    audience: "instagram",
    hypothesis: "top performer likely converts paid traffic too",
    guardrails: DEFAULT_GUARDRAILS,
    paused: true,
  });
  const raw = readFileSync(join(host, "data", "paid-promotion-attempts.jsonl"), "utf8");
  const parsed = JSON.parse(raw.trim());
  expect(parsed.hypothesis).toContain("top performer");
  expect(parsed.paused).toBe(true);
});
