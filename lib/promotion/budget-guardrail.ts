/**
 * budget-guardrail.ts — paid-promotion guardrails (issue #55).
 *
 * Organic winners can generate a paused ads-draft.json, never live spend.
 * This module defines the campaign-level kill-switches that must accompany
 * every draft (max daily spend, max CPA/CPL, max experiment duration,
 * stop-loss) and the append-only log of promotion attempts with the
 * hypothesis behind each one.
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface BudgetGuardrailConfig {
  max_daily_spend_usd: number;
  max_cpa_usd?: number;
  max_cpl_usd?: number;
  max_experiment_duration_days: number;
  stop_loss_spend_usd: number;
}

export const DEFAULT_GUARDRAILS: BudgetGuardrailConfig = {
  max_daily_spend_usd: 25,
  max_cpa_usd: 50,
  max_cpl_usd: 15,
  max_experiment_duration_days: 14,
  stop_loss_spend_usd: 150,
};

export interface AdSpendDraft {
  piece_id: string;
  daily_budget_usd: number;
  experiment_duration_days?: number;
  cumulative_spend_usd?: number;
  observed_cpa_usd?: number;
  observed_cpl_usd?: number;
}

export interface GuardrailCheckResult {
  ok: boolean;
  violations: string[];
}

export function checkGuardrails(
  draft: AdSpendDraft,
  config: BudgetGuardrailConfig = DEFAULT_GUARDRAILS,
): GuardrailCheckResult {
  const violations: string[] = [];

  if (draft.daily_budget_usd > config.max_daily_spend_usd) {
    violations.push(
      `daily_budget_usd (${draft.daily_budget_usd}) exceeds max_daily_spend_usd (${config.max_daily_spend_usd})`,
    );
  }
  if (
    draft.experiment_duration_days !== undefined &&
    draft.experiment_duration_days > config.max_experiment_duration_days
  ) {
    violations.push(
      `experiment_duration_days (${draft.experiment_duration_days}) exceeds max_experiment_duration_days (${config.max_experiment_duration_days})`,
    );
  }
  if (
    draft.cumulative_spend_usd !== undefined &&
    draft.cumulative_spend_usd >= config.stop_loss_spend_usd
  ) {
    violations.push(
      `cumulative_spend_usd (${draft.cumulative_spend_usd}) has hit stop_loss_spend_usd (${config.stop_loss_spend_usd}) — kill the experiment`,
    );
  }
  if (
    config.max_cpa_usd !== undefined &&
    draft.observed_cpa_usd !== undefined &&
    draft.observed_cpa_usd > config.max_cpa_usd
  ) {
    violations.push(
      `observed_cpa_usd (${draft.observed_cpa_usd}) exceeds max_cpa_usd (${config.max_cpa_usd})`,
    );
  }
  if (
    config.max_cpl_usd !== undefined &&
    draft.observed_cpl_usd !== undefined &&
    draft.observed_cpl_usd > config.max_cpl_usd
  ) {
    violations.push(
      `observed_cpl_usd (${draft.observed_cpl_usd}) exceeds max_cpl_usd (${config.max_cpl_usd})`,
    );
  }

  return { ok: violations.length === 0, violations };
}

export interface PromotionAttempt {
  piece_id: string;
  timestamp: string;
  metric: string;
  channel: string;
  audience: string;
  hypothesis: string;
  guardrails: BudgetGuardrailConfig;
  paused: true;
}

function attemptsPath(root: string): string {
  return resolve(root, "data", "paid-promotion-attempts.jsonl");
}

/**
 * Append-only log of paid promotion attempts. Distinct from
 * data/promotions.jsonl (which already logs the mechanical draft write) —
 * this is the guardrail-and-hypothesis audit trail issue #55 asks for.
 */
export function recordPromotionAttempt(root: string, attempt: PromotionAttempt): string {
  const path = attemptsPath(root);
  if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(attempt)}\n`);
  return path;
}
