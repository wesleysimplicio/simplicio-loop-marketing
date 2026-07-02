import { test, expect } from "@playwright/test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseCampaignBrief,
  planPieceQueue,
  organicPhaseActive,
  reviewCampaign,
} from "../lib/campaigns/campaign";

const SAMPLE_BRIEF = `# CAMPAIGN

\`\`\`yaml
id: 2026-Q3-launch-pilot
client_id: acme-saas
title: Launch pilot
owner: wesley
status: active
\`\`\`

\`\`\`yaml
channels:
  primary: hackernews
  secondary: [devto, x]
  test: [reddit-programming]
\`\`\`

\`\`\`yaml
budget:
  currency: USD
  total: 500

  phases:
    - { name: organic-only, weeks: "1-4", paid_amount: 0 }
    - { name: paid-ramp,    weeks: "5-8", paid_amount: 500 }

  promotion_rule: "top 20% organic pieces by save rate get promoted"
\`\`\`

\`\`\`yaml
pieces_per_week: 3
distribution:
  - { pillar: build-in-public, pieces: 2 }
  - { pillar: architecture, pieces: 1 }
\`\`\`
`;

test("parseCampaignBrief extracts identity, channels, budget phases, and distribution", () => {
  const brief = parseCampaignBrief(SAMPLE_BRIEF);
  expect(brief.id).toBe("2026-Q3-launch-pilot");
  expect(brief.client_id).toBe("acme-saas");
  expect(brief.channels.primary).toBe("hackernews");
  expect(brief.channels.secondary).toEqual(["devto", "x"]);
  expect(brief.budget.phases).toHaveLength(2);
  expect(brief.budget.phases[1].paid_amount).toBe(500);
  expect(brief.distribution).toHaveLength(2);
  expect(brief.distribution[0]).toEqual({ pillar: "build-in-public", pieces: 2 });
});

test("planPieceQueue expands distribution across primary + secondary channels", () => {
  const brief = parseCampaignBrief(SAMPLE_BRIEF);
  const queue = planPieceQueue(brief);
  // 2 pillars * 3 channels (primary + 2 secondary) = 6
  expect(queue).toHaveLength(6);
  expect(queue.every((q) => q.phase === "organic")).toBe(true);
  expect(queue.find((q) => q.channel_id === "hackernews")?.language).toBe("en");
});

test("organicPhaseActive is true when the brief has a paid phase and no override", () => {
  const brief = parseCampaignBrief(SAMPLE_BRIEF);
  expect(organicPhaseActive(brief)).toBe(true);
});

test("organicPhaseActive can be explicitly overridden", () => {
  const brief = parseCampaignBrief(SAMPLE_BRIEF);
  brief.organic_before_paid_override = true;
  expect(organicPhaseActive(brief)).toBe(false);
});

test("reviewCampaign summarizes winners/losers/spend from runtime logs", () => {
  const host = mkdtempSync(join(tmpdir(), "me-campaign-review-"));
  const dataDir = join(host, ".marketing-engine", "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "promotions.jsonl"), `${JSON.stringify({ piece_id: "p1" })}\n`);
  writeFileSync(join(dataDir, "learnings.md"), "- 2026-06-01 | p2 | reddit | did not perform: low save rate\n");
  writeFileSync(
    join(dataDir, "paid-promotion-attempts.jsonl"),
    `${JSON.stringify({ daily_budget_usd: 10, guardrails: { max_daily_spend_usd: 25 } })}\n`,
  );
  const summary = reviewCampaign(host, "2026-Q3-launch-pilot");
  expect(summary.winners).toBe(1);
  expect(summary.losers).toBe(1);
  expect(summary.spend_usd).toBe(10);
  expect(summary.next_actions[0]).toContain("promoted piece");
});
