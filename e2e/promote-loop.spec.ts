import { test, expect } from "@playwright/test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classify } from "../lib/promotion/classifier";
import { runPromoteLoop } from "../lib/cli/promote";

test("classify identifies top 20% winners by save_rate", () => {
  const rows = [];
  for (let i = 1; i <= 10; i++) {
    rows.push({
      piece_id: `p${i}`,
      client: "acme",
      channel: "instagram",
      impressions: 1000,
      saves: i * 5,
      captured_at: new Date().toISOString(),
    });
  }
  const c = classify(rows, 7);
  expect(c.winners.length).toBeGreaterThanOrEqual(1);
  expect(c.winners[0].piece_id).toBe("p10"); // highest saves
  expect(c.losers.length).toBeGreaterThanOrEqual(1);
});

test("classify skips pieces under 100 impressions", () => {
  const rows = [
    { piece_id: "low", impressions: 50, saves: 10, captured_at: new Date().toISOString() },
    { piece_id: "ok", impressions: 200, saves: 10, captured_at: new Date().toISOString() },
  ];
  const c = classify(rows, 7);
  expect(c.skipped.map((s) => s.piece_id)).toContain("low");
  expect(c.all.find((s) => s.piece_id === "ok")).toBeDefined();
});

test("runPromoteLoop writes ads-draft.json for winners and learnings for losers", async () => {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-promote-"));
  mkdirSync(join(host, "data"), { recursive: true });
  const analytics = [];
  for (let i = 1; i <= 10; i++) {
    analytics.push(
      JSON.stringify({
        piece_id: `p${i}`,
        client: "acme",
        channel: "instagram",
        impressions: 1000,
        saves: i * 5,
        watch_time_s: i * 100,
        captured_at: new Date().toISOString(),
      }),
    );
  }
  writeFileSync(join(host, "data", "analytics.jsonl"), analytics.join("\n") + "\n");
  const r = await runPromoteLoop({ root: host, windowDays: 7 });
  expect(r.promoted).toBeGreaterThanOrEqual(1);
  expect(r.losers).toBeGreaterThanOrEqual(1);
  expect(existsSync(join(host, "data", "learnings.md"))).toBe(true);
  const learnings = readFileSync(join(host, "data", "learnings.md"), "utf8");
  expect(learnings).toMatch(/did not perform/);
});
