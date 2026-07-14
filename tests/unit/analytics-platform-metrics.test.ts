'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";

// These three modules (meta.ts, tiktok.ts, youtube.ts) share the same
// dry-run/live-fetch shape; cover both branches for each.

test("analytics/meta: dry-run returns deterministic seeded metrics", async () => {
  delete process.env.DRY_RUN;
  const { fetchMetrics } = await import("../../lib/analytics/meta.ts");
  const r24 = await fetchMetrics("piece-abc", "24h");
  const r48 = await fetchMetrics("piece-abc", "48h");
  const r7d = await fetchMetrics("piece-abc", "7d");
  assert.equal(r24.window, "24h");
  assert.equal(r48.reach, r24.reach * 2);
  assert.equal(r7d.reach, r24.reach * 7);
  assert.ok(r24.reach >= 0 && r24.engagement >= 0);
});

test("analytics/meta: live path throws without credentials, then succeeds with mocked fetch", async () => {
  process.env.DRY_RUN = "false";
  const { fetchMetrics } = await import("../../lib/analytics/meta.ts");
  delete process.env.META_ACCESS_TOKEN;
  delete process.env.META_PAGE_ID;
  await assert.rejects(() => fetchMetrics("p1", "24h"), /META_ACCESS_TOKEN/);

  process.env.META_ACCESS_TOKEN = "tok";
  process.env.META_PAGE_ID = "page1";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({
        data: [
          { name: "reach", values: [{ value: 100 }] },
          { name: "impressions", values: [{ value: 200 }] },
          { name: "saved", values: [{ value: 5 }] },
          { name: "profile_visits", values: [{ value: 3 }] },
        ],
      }),
    })) as unknown as typeof fetch;
  try {
    const result = await fetchMetrics("p1", "24h");
    assert.equal(result.reach, 100);
    assert.equal(result.engagement, 200);
    assert.equal(result.saves, 5);
    assert.equal(result.profile_visits, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = (async () => ({ ok: false, status: 500, text: async () => "boom" })) as unknown as typeof fetch;
  try {
    await assert.rejects(() => fetchMetrics("p1", "24h"), /HTTP 500/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DRY_RUN;
    delete process.env.META_ACCESS_TOKEN;
    delete process.env.META_PAGE_ID;
  }
});

test("analytics/tiktok: dry-run returns deterministic seeded metrics", async () => {
  delete process.env.DRY_RUN;
  const { fetchMetrics } = await import("../../lib/analytics/tiktok.ts");
  const r24 = await fetchMetrics("piece-xyz", "24h");
  const r48 = await fetchMetrics("piece-xyz", "48h");
  assert.equal(r48.reach, r24.reach * 2);
  assert.equal(r24.window, "24h");
  assert.ok(r24.reach >= 0 && r24.engagement >= 0);
});

test("analytics/tiktok: live path throws without token, then succeeds with mocked fetch", async () => {
  process.env.DRY_RUN = "false";
  const { fetchMetrics } = await import("../../lib/analytics/tiktok.ts");
  delete process.env.TIKTOK_ACCESS_TOKEN;
  await assert.rejects(() => fetchMetrics("p1", "24h"), /TIKTOK_ACCESS_TOKEN/);

  process.env.TIKTOK_ACCESS_TOKEN = "tok";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({
        data: { videos: [{ video_views: 42, likes: 10, shares: 2 }] },
      }),
    })) as unknown as typeof fetch;
  try {
    const result = await fetchMetrics("p1", "24h");
    assert.equal(result.reach, 42);
    assert.equal(result.engagement, 12);
    assert.equal(result.saves, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = (async () => ({ ok: false, status: 503, text: async () => "down" })) as unknown as typeof fetch;
  try {
    await assert.rejects(() => fetchMetrics("p1", "24h"), /HTTP 503/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DRY_RUN;
    delete process.env.TIKTOK_ACCESS_TOKEN;
  }
});

test("analytics/youtube: dry-run returns deterministic seeded metrics", async () => {
  delete process.env.DRY_RUN;
  const { fetchMetrics } = await import("../../lib/analytics/youtube.ts");
  const r24 = await fetchMetrics("piece-yt", "24h");
  const r48 = await fetchMetrics("piece-yt", "48h");
  const r7d = await fetchMetrics("piece-yt", "7d");
  assert.equal(r48.reach, r24.reach * 2);
  assert.equal(r7d.reach, r24.reach * 7);
});

test("analytics/youtube: live path throws without key, then succeeds with mocked fetch", async () => {
  process.env.DRY_RUN = "false";
  const { fetchMetrics } = await import("../../lib/analytics/youtube.ts");
  delete process.env.YOUTUBE_API_KEY;
  await assert.rejects(() => fetchMetrics("p1", "24h"), /YOUTUBE_API_KEY/);

  process.env.YOUTUBE_API_KEY = "key";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({
        items: [
          {
            statistics: {
              viewCount: "1000",
              likeCount: "50",
              favoriteCount: "4",
              commentCount: "6",
            },
          },
        ],
      }),
    })) as unknown as typeof fetch;
  try {
    const result = await fetchMetrics("p1", "24h");
    assert.equal(result.reach, 1000);
    assert.equal(result.engagement, 56);
    assert.equal(result.saves, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = (async () => ({ ok: false, status: 404, text: async () => "nope" })) as unknown as typeof fetch;
  try {
    await assert.rejects(() => fetchMetrics("p1", "24h"), /HTTP 404/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DRY_RUN;
    delete process.env.YOUTUBE_API_KEY;
  }
});
