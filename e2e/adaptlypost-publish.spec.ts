import { test, expect } from "@playwright/test";
import {
  AdaptlyPostClient,
  type PublishPiece,
} from "../lib/publish/adaptlypost";

test("schedule returns ok=true with draft_url containing piece id under DRY_RUN", async () => {
  process.env["DRY_RUN"] = "true";
  const client = new AdaptlyPostClient();
  const piece: PublishPiece = {
    id: "piece-test-001",
    platforms: ["instagram", "tiktok", "linkedin", "x"],
    caption: "synthetic caption",
    media_paths: ["outputs/saas/2026-05-08/piece-test-001/cover.png"],
    scheduled_at: "2026-05-08T14:00:00Z",
  };

  const before = Date.now();
  const result = await client.schedule(piece);
  const elapsed = Date.now() - before;

  expect(result.ok).toBe(true);
  expect(result.draft_url).toContain(piece.id);
  // Effectively instant when DRY_RUN guards the path. Generous bound for CI noise.
  expect(elapsed).toBeLessThan(200);
});

test("schedule includes piece id in synthetic url shape", async () => {
  process.env["DRY_RUN"] = "true";
  const client = new AdaptlyPostClient();
  const piece: PublishPiece = {
    id: "another-piece-42",
    platforms: ["instagram"],
    caption: "x",
    media_paths: [],
    scheduled_at: "2026-05-08T15:00:00Z",
  };
  const result = await client.schedule(piece);
  expect(result.draft_url).toMatch(/another-piece-42/);
});
