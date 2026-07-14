'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyMetric,
  computeAccrual,
  rankByAccrual,
  classifyByAccrual,
  appendSnapshot,
  readSnapshots,
  snapshotsPath,
  type MetricSnapshot,
} from "../../lib/analytics/score.ts";

test("classifyMetric: buckets known metrics into vanity/business/quality_engagement", () => {
  assert.equal(classifyMetric("impressions"), "vanity");
  assert.equal(classifyMetric("trial_signup"), "business");
  assert.equal(classifyMetric("saves"), "quality_engagement");
  assert.equal(classifyMetric("something_new"), "unclassified");
});

function snap(overrides: Partial<MetricSnapshot>): MetricSnapshot {
  return {
    piece_id: "p1",
    channel_id: "ig",
    metric: "saves",
    value: 10,
    polled_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

test("computeAccrual: a single snapshot has delta equal to its own value and is unestablished", () => {
  const scores = computeAccrual([snap({})]);
  assert.equal(scores.length, 1);
  assert.equal(scores[0].delta, 10);
  assert.equal(scores[0].poll_count, 1);
});

test("computeAccrual: two snapshots compute a per-day accrual rate", () => {
  const scores = computeAccrual([
    snap({ value: 10, polled_at: "2026-07-01T00:00:00.000Z" }),
    snap({ value: 30, polled_at: "2026-07-02T00:00:00.000Z" }),
  ]);
  assert.equal(scores.length, 1);
  assert.equal(scores[0].delta, 20);
  assert.equal(scores[0].poll_count, 2);
  assert.ok(Math.abs(scores[0].delta_rate_per_day - 20) < 0.001);
});

test("computeAccrual: flags implausible vanity-metric spikes as spam risk", () => {
  const scores = computeAccrual([
    snap({ metric: "likes", value: 0, polled_at: "2026-07-01T00:00:00.000Z" }),
    snap({ metric: "likes", value: 100000, polled_at: "2026-07-02T00:00:00.000Z" }),
  ]);
  assert.equal(scores[0].spam_risk, true);
});

test("computeAccrual: a business-metric spike of the same magnitude is not flagged as spam", () => {
  const scores = computeAccrual([
    snap({ metric: "trial_signup", value: 0, polled_at: "2026-07-01T00:00:00.000Z" }),
    snap({ metric: "trial_signup", value: 100000, polled_at: "2026-07-02T00:00:00.000Z" }),
  ]);
  assert.equal(scores[0].spam_risk, false);
});

test("rankByAccrual: established pieces (>=2 polls) always outrank unestablished ones", () => {
  const established = computeAccrual([
    snap({ piece_id: "established", value: 10, polled_at: "2026-07-01T00:00:00.000Z" }),
    snap({ piece_id: "established", value: 11, polled_at: "2026-07-02T00:00:00.000Z" }),
  ])[0];
  const unestablished = computeAccrual([
    snap({ piece_id: "unestablished", value: 9999, polled_at: "2026-07-01T00:00:00.000Z" }),
  ])[0];
  const ranked = rankByAccrual([unestablished, established]);
  assert.equal(ranked[0].piece_id, "established");
});

test("classifyByAccrual: separates winners, weak-but-promising, losers, and spam", () => {
  const scores = computeAccrual([
    snap({ piece_id: "winner", metric: "trial_signup", value: 0, polled_at: "2026-07-01T00:00:00.000Z" }),
    snap({ piece_id: "winner", metric: "trial_signup", value: 100, polled_at: "2026-07-02T00:00:00.000Z" }),
    snap({ piece_id: "loser", metric: "trial_signup", value: 50, polled_at: "2026-07-01T00:00:00.000Z" }),
    snap({ piece_id: "loser", metric: "trial_signup", value: 10, polled_at: "2026-07-02T00:00:00.000Z" }),
    snap({ piece_id: "spammy", metric: "likes", value: 0, polled_at: "2026-07-01T00:00:00.000Z" }),
    snap({ piece_id: "spammy", metric: "likes", value: 999999, polled_at: "2026-07-02T00:00:00.000Z" }),
  ]);
  const result = classifyByAccrual(scores);
  assert.ok(result.winners.some((s) => s.piece_id === "winner"));
  assert.ok(result.losers.some((s) => s.piece_id === "loser"));
  assert.ok(result.flaggedSpam.some((s) => s.piece_id === "spammy"));
});

test("appendSnapshot/readSnapshots: round-trips through a JSONL file and skips malformed lines", () => {
  const dir = mkdtempSync(join(tmpdir(), "score-snapshots-"));
  try {
    appendSnapshot(dir, snap({ piece_id: "a" }));
    appendSnapshot(dir, snap({ piece_id: "b" }));
    const rows = readSnapshots(dir);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((r) => r.piece_id), ["a", "b"]);
    assert.equal(snapshotsPath(dir).endsWith(join("data", "analytics-snapshots.jsonl")), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readSnapshots: returns an empty array when no snapshot file exists yet", () => {
  const dir = mkdtempSync(join(tmpdir(), "score-snapshots-empty-"));
  try {
    assert.deepEqual(readSnapshots(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
