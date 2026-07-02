import { test, expect } from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendSnapshot,
  readSnapshots,
  computeAccrual,
  rankByAccrual,
  classifyByAccrual,
  classifyMetric,
  type MetricSnapshot,
} from "../lib/analytics/score";

test("classifyMetric separates vanity, business, and quality-engagement metrics", () => {
  expect(classifyMetric("impressions")).toBe("vanity");
  expect(classifyMetric("trial_signup")).toBe("business");
  expect(classifyMetric("saves")).toBe("quality_engagement");
  expect(classifyMetric("something_unknown")).toBe("unclassified");
});

test("a slow-compounding thread outranks a one-shot spike snapshot from a single poll", () => {
  // Piece A: one huge snapshot at a single poll (looks "hot" at that instant).
  const spike: MetricSnapshot[] = [
    { piece_id: "spike-post", channel_id: "hackernews", metric: "points", value: 500, polled_at: "2026-06-01T00:00:00Z" },
  ];
  // Piece B: two polls a week apart, small but positive accrual — the
  // "quietly compounding" case from the review discussion.
  const compounder: MetricSnapshot[] = [
    { piece_id: "compounder-post", channel_id: "devto", metric: "reactions", value: 10, polled_at: "2026-06-01T00:00:00Z" },
    { piece_id: "compounder-post", channel_id: "devto", metric: "reactions", value: 24, polled_at: "2026-06-08T00:00:00Z" },
  ];
  const scores = computeAccrual([...spike, ...compounder]);
  const ranked = rankByAccrual(scores);
  // The established (>=2 poll) compounder must outrank the single-poll spike,
  // even though the spike's raw total (500) dwarfs the compounder's (24).
  expect(ranked[0].piece_id).toBe("compounder-post");
});

test("computeAccrual returns per-day normalized delta rate", () => {
  const snapshots: MetricSnapshot[] = [
    { piece_id: "p1", channel_id: "reddit", metric: "upvotes", value: 10, polled_at: "2026-06-01T00:00:00Z" },
    { piece_id: "p1", channel_id: "reddit", metric: "upvotes", value: 30, polled_at: "2026-06-03T00:00:00Z" },
  ];
  const [score] = computeAccrual(snapshots);
  expect(score.delta).toBe(20);
  expect(score.days_between_polls).toBe(2);
  expect(score.delta_rate_per_day).toBe(10);
});

test("classifyByAccrual separates winners, weak-but-promising, losers, and flags spam risk", () => {
  const snapshots: MetricSnapshot[] = [
    { piece_id: "winner", channel_id: "devto", metric: "reactions", value: 5, polled_at: "2026-06-01T00:00:00Z" },
    { piece_id: "winner", channel_id: "devto", metric: "reactions", value: 105, polled_at: "2026-06-02T00:00:00Z" },
    { piece_id: "flat", channel_id: "devto", metric: "reactions", value: 5, polled_at: "2026-06-01T00:00:00Z" },
    { piece_id: "flat", channel_id: "devto", metric: "reactions", value: 5, polled_at: "2026-06-02T00:00:00Z" },
    { piece_id: "bot-spike", channel_id: "x", metric: "likes", value: 0, polled_at: "2026-06-01T00:00:00Z" },
    { piece_id: "bot-spike", channel_id: "x", metric: "likes", value: 50000, polled_at: "2026-06-02T00:00:00Z" },
  ];
  const scores = computeAccrual(snapshots);
  const result = classifyByAccrual(scores);
  expect(result.flaggedSpam.map((s) => s.piece_id)).toContain("bot-spike");
  expect(result.winners.map((s) => s.piece_id)).toContain("winner");
  expect(result.losers.map((s) => s.piece_id)).toContain("flat");
});

test("appendSnapshot + readSnapshots round-trip through data/analytics-snapshots.jsonl", () => {
  const host = mkdtempSync(join(tmpdir(), "me-analytics-"));
  appendSnapshot(host, {
    piece_id: "p9",
    channel_id: "tabnews",
    metric: "points",
    value: 12,
    polled_at: "2026-06-01T00:00:00Z",
    source: "manual",
  });
  const rows = readSnapshots(host);
  expect(rows).toHaveLength(1);
  expect(rows[0].piece_id).toBe("p9");
  const raw = readFileSync(join(host, "data", "analytics-snapshots.jsonl"), "utf8");
  expect(raw.trim().split("\n")).toHaveLength(1);
});
