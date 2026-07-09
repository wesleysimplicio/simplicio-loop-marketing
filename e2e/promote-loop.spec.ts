import { test, expect } from "@playwright/test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classify } from "../lib/promotion/classifier";
import { runPromoteLoop } from "../lib/cli/promote";
import { serializePiece } from "../lib/pieces/frontmatter";
import { writeWatcherReport } from "../lib/gate/watcher-gate";

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
  const workspaceRoot = join(host, ".marketing-engine");
  mkdirSync(join(workspaceRoot, "data"), { recursive: true });
  mkdirSync(join(workspaceRoot, "pieces"), { recursive: true });
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
  writeFileSync(
    join(workspaceRoot, "data", "analytics.jsonl"),
    analytics.join("\n") + "\n",
  );
  writeFileSync(
    join(workspaceRoot, "pieces", "p10.md"),
    serializePiece(
      {
        id: "p10",
        client: "acme",
        date: "2026-05-08",
        status: "published",
        type: "reel",
        pillar: "education",
        platforms: ["instagram"],
        locale: "en",
        provider_override: {
          ads: "custom-ads",
        },
      },
      "# Brief\n\nTop performer.\n",
    ),
  );
  // Promotion requires a MEASURED watcher report (claims gate blocks paid
  // spend on unverified pieces) — seed the report generate would have written.
  writeWatcherReport(workspaceRoot, {
    piece_id: "p10",
    tag: "MEASURED",
    passed: true,
    checked: [
      {
        channel: "script.topic_coverage",
        claimed: "script covers brief topic (>=30% key terms)",
        recomputed: "100% key term coverage",
        match: true,
        severity: "block",
      },
    ],
    checked_at: new Date().toISOString(),
  });
  const r = await runPromoteLoop({ root: host, windowDays: 7 });
  expect(r.promoted).toBeGreaterThanOrEqual(1);
  expect(r.losers).toBeGreaterThanOrEqual(1);
  expect(existsSync(join(workspaceRoot, "data", "learnings.md"))).toBe(true);
  const learnings = readFileSync(join(workspaceRoot, "data", "learnings.md"), "utf8");
  expect(learnings).toMatch(/did not perform/);
  const draftPath = join(
    workspaceRoot,
    "outputs",
    "acme",
    "2026-05-08",
    "p10",
    "ads-draft.json",
  );
  expect(existsSync(draftPath)).toBe(true);
  const draft = JSON.parse(readFileSync(draftPath, "utf8"));
  expect(draft.provider).toBe("custom-ads");
});
