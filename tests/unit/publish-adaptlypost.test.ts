'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AdaptlyPostClient, getPublishClient, type PublishPiece } from "../../lib/publish/adaptlypost.ts";

function piece(overrides: Partial<PublishPiece> = {}): PublishPiece {
  return {
    id: "p1",
    client: "acme",
    platforms: ["instagram"],
    caption: "hello",
    media_paths: [],
    scheduled_at: "2026-05-08T00:00:00.000Z",
    ...overrides,
  };
}

function fastTimers(): () => void {
  const original = globalThis.setTimeout;
  // @ts-expect-error test-only override to skip real backoff delays
  globalThis.setTimeout = ((fn: () => void) => { fn(); return 0 as any; }) as typeof setTimeout;
  return () => { globalThis.setTimeout = original; };
}

test("getPublishClient: returns an AdaptlyPostClient named adaptlypost", () => {
  const client = getPublishClient();
  assert.ok(client instanceof AdaptlyPostClient);
  assert.equal((client as AdaptlyPostClient).name, "adaptlypost");
});

test("schedule: dry-run writes a draft file under outputs/<client>/<date>/<id> and returns a test draft URL", async () => {
  delete process.env.DRY_RUN;
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-adaptlypost-dry-"));
  process.chdir(root);
  try {
    const client = new AdaptlyPostClient();
    const result = await client.schedule(piece());
    assert.equal(result.ok, true);
    assert.equal(result.draft_url, "https://adaptlypost.test/drafts/p1");
    const draftPath = join(root, "outputs", "acme", "2026-05-08", "p1", "adaptlypost-draft.json");
    assert.ok(existsSync(draftPath));
    assert.equal(JSON.parse(readFileSync(draftPath, "utf8")).id, "p1");
  } finally {
    process.chdir(cwd);
  }
});

test("schedule: dry-run defaults client to 'unknown' when omitted", async () => {
  delete process.env.DRY_RUN;
  const cwd = process.cwd();
  const root = mkdtempSync(join(tmpdir(), "me-adaptlypost-dry-nouclient-"));
  process.chdir(root);
  try {
    const client = new AdaptlyPostClient();
    await client.schedule(piece({ client: undefined }));
    assert.ok(existsSync(join(root, "outputs", "unknown", "2026-05-08", "p1", "adaptlypost-draft.json")));
  } finally {
    process.chdir(cwd);
  }
});

test("schedule: live mode without ADAPTLYPOST_API_KEY fails fast with a clear error", async () => {
  process.env.DRY_RUN = "false";
  delete process.env.ADAPTLYPOST_API_KEY;
  try {
    const client = new AdaptlyPostClient();
    const result = await client.schedule(piece());
    assert.equal(result.ok, false);
    assert.match(result.error!, /ADAPTLYPOST_API_KEY missing/);
  } finally {
    delete process.env.DRY_RUN;
  }
});

test("schedule: live mode succeeds on the first attempt and returns the API draft URL", async () => {
  process.env.DRY_RUN = "false";
  process.env.ADAPTLYPOST_API_KEY = "key";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({ id: "abc", url: "https://adaptlypost.com/drafts/abc" }),
  })) as unknown as typeof fetch;
  try {
    const client = new AdaptlyPostClient();
    const result = await client.schedule(piece());
    assert.equal(result.ok, true);
    assert.equal(result.draft_url, "https://adaptlypost.com/drafts/abc");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DRY_RUN;
    delete process.env.ADAPTLYPOST_API_KEY;
  }
});

test("schedule: falls back to a constructed URL from the id when the API omits url", async () => {
  process.env.DRY_RUN = "false";
  process.env.ADAPTLYPOST_API_KEY = "key";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({ id: "xyz" }),
  })) as unknown as typeof fetch;
  try {
    const client = new AdaptlyPostClient();
    const result = await client.schedule(piece());
    assert.equal(result.draft_url, "https://adaptlypost.com/drafts/xyz");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DRY_RUN;
    delete process.env.ADAPTLYPOST_API_KEY;
  }
});

test("schedule: a non-retryable 4xx error breaks immediately without retrying", async () => {
  process.env.DRY_RUN = "false";
  process.env.ADAPTLYPOST_API_KEY = "key";
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    calls += 1;
    return { ok: false, status: 400, text: async () => "bad request" };
  }) as unknown as typeof fetch;
  try {
    const client = new AdaptlyPostClient();
    const result = await client.schedule(piece());
    assert.equal(result.ok, false);
    assert.match(result.error!, /HTTP 400/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DRY_RUN;
    delete process.env.ADAPTLYPOST_API_KEY;
  }
});

test("schedule: retries a 5xx error and succeeds on the next attempt", async () => {
  process.env.DRY_RUN = "false";
  process.env.ADAPTLYPOST_API_KEY = "key";
  const restoreTimers = fastTimers();
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) return { ok: false, status: 503, text: async () => "unavailable" };
    return { ok: true, json: async () => ({ id: "retry-ok" }) };
  }) as unknown as typeof fetch;
  try {
    const client = new AdaptlyPostClient();
    const result = await client.schedule(piece());
    assert.equal(result.ok, true);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    restoreTimers();
    delete process.env.DRY_RUN;
    delete process.env.ADAPTLYPOST_API_KEY;
  }
});

test("schedule: a persistent network exception exhausts retries and returns the last error", async () => {
  process.env.DRY_RUN = "false";
  process.env.ADAPTLYPOST_API_KEY = "key";
  const restoreTimers = fastTimers();
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error("network unreachable");
  }) as unknown as typeof fetch;
  try {
    const client = new AdaptlyPostClient();
    const result = await client.schedule(piece());
    assert.equal(result.ok, false);
    assert.match(result.error!, /network unreachable/);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    restoreTimers();
    delete process.env.DRY_RUN;
    delete process.env.ADAPTLYPOST_API_KEY;
  }
});
