import { test, expect } from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { classify } from "../lib/promotion/classifier";
import { appendLearning } from "../lib/promotion/learnings";

test.describe.configure({ mode: "serial" });

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

test("classify keeps the top and bottom 20 percent, aggregates by piece, and skips weak signal", () => {
  const result = classify([
    {
      piece_id: "winner-001",
      channel: "instagram",
      platform: "instagram",
      impressions: 500,
      reach: 450,
      saves: 80,
      shares: 12,
      comments: 5,
      likes: 210,
      watch_time_s: 3200,
      captured_at: isoDaysAgo(1),
    },
    {
      piece_id: "winner-001",
      channel: "instagram",
      platform: "instagram",
      impressions: 300,
      reach: 260,
      saves: 32,
      shares: 7,
      comments: 3,
      likes: 120,
      watch_time_s: 1700,
      captured_at: isoDaysAgo(3),
    },
    {
      piece_id: "winner-001",
      channel: "instagram",
      platform: "instagram",
      impressions: 1000,
      reach: 900,
      saves: 400,
      shares: 20,
      comments: 4,
      likes: 500,
      watch_time_s: 4800,
      captured_at: isoDaysAgo(10),
    },
    {
      piece_id: "solid-002",
      channel: "instagram",
      platform: "instagram",
      impressions: 650,
      reach: 580,
      saves: 58,
      shares: 9,
      comments: 4,
      likes: 180,
      watch_time_s: 2400,
      captured_at: isoDaysAgo(1),
    },
    {
      piece_id: "steady-003",
      channel: "instagram",
      platform: "instagram",
      impressions: 700,
      reach: 610,
      saves: 49,
      shares: 8,
      comments: 6,
      likes: 170,
      watch_time_s: 2000,
      captured_at: isoDaysAgo(2),
    },
    {
      piece_id: "borderline-004",
      channel: "instagram",
      platform: "instagram",
      impressions: 540,
      reach: 300,
      saves: 20,
      shares: 4,
      comments: 12,
      likes: 95,
      watch_time_s: 700,
      captured_at: isoDaysAgo(2),
    },
    {
      piece_id: "loser-005",
      channel: "instagram",
      platform: "instagram",
      impressions: 720,
      reach: 95,
      saves: 4,
      shares: 1,
      comments: 55,
      likes: 10,
      watch_time_s: 90,
      captured_at: isoDaysAgo(1),
    },
    {
      piece_id: "skip-006",
      channel: "instagram",
      platform: "instagram",
      impressions: 80,
      reach: 70,
      saves: 10,
      shares: 2,
      comments: 0,
      likes: 40,
      watch_time_s: 120,
      captured_at: isoDaysAgo(1),
    },
  ]);

  expect(result.winners).toHaveLength(1);
  expect(result.losers).toHaveLength(1);
  expect(result.skipped).toHaveLength(1);

  expect(result.winners[0]?.piece_id).toBe("winner-001");
  expect(result.winners[0]?.impressions).toBe(800);
  expect(result.winners[0]?.saves).toBe(112);
  expect(result.winners[0]?.save_rate).toBeCloseTo(0.14, 5);

  expect(result.losers[0]?.piece_id).toBe("loser-005");
  expect(result.losers[0]?.save_rate).toBeCloseTo(4 / 720, 5);
  const loserReason = result.losers[0]?.reason ?? "";
  expect(loserReason).toContain("low save rate");
  expect(loserReason).toMatch(/watch time|reach|comment ratio/i);
  expect(loserReason.toLowerCase()).not.toContain("provider");

  expect(result.skipped[0]).toMatchObject({
    piece_id: "skip-006",
    skipped_reason: "insufficient_impressions",
  });
});

test("appendLearning writes the expected markdown line into data/learnings.md", async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "marketing-engine-promotion-"));
  const previousCwd = process.cwd();

  process.chdir(tempRoot);

  try {
    await appendLearning({
      date: "2026-05-18",
      piece_id: "loser-005",
      channel: "instagram",
      reason: "low save rate with weak watch time and poor comment ratio",
    });

    await appendLearning({
      date: "2026-05-19",
      piece_id: "loser-004",
      channel: "tiktok",
      reason: "low save rate with low reach",
    });

    const contents = readFileSync(join(tempRoot, "data", "learnings.md"), "utf8");

    expect(contents).toBe(
      [
        "- 2026-05-18 | loser-005 | instagram | did not perform: low save rate with weak watch time and poor comment ratio",
        "- 2026-05-19 | loser-004 | tiktok | did not perform: low save rate with low reach",
        "",
      ].join("\n"),
    );
  } finally {
    process.chdir(previousCwd);
  }
});
