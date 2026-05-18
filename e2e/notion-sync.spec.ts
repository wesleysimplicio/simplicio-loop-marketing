import { test, expect } from "@playwright/test";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { syncToLocal } from "../lib/calendar/notion";
import { cliEntry as syncCliEntry } from "../lib/cli/sync";
import { runGenerateLoop } from "../lib/cli/generate";
import { runPromoteLoop } from "../lib/cli/promote";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(__filename, "..", "..");
const MATRIX_PATH = resolve(REPO_ROOT, ".specs", "architecture", "PROVIDERS.md");

async function withCwd<T>(cwd: string, run: () => Promise<T> | T): Promise<T> {
  const original = process.cwd();
  process.chdir(cwd);
  try {
    return await run();
  } finally {
    process.chdir(original);
  }
}

function notionRow(overrides?: Partial<{
  id: string;
  title: string;
  date: string;
  pillar: string;
  type: string;
  status: string;
  platforms: string[];
}>): Record<string, unknown> {
  const row = {
    id: overrides?.id ?? "notion-page-1",
    title: overrides?.title ?? "Launch the new carousel",
    date: overrides?.date ?? "2026-05-18",
    pillar: overrides?.pillar ?? "education",
    type: overrides?.type ?? "carousel",
    status: overrides?.status ?? "draft",
    platforms: overrides?.platforms ?? ["instagram", "linkedin"],
  };

  return {
    id: row.id,
    properties: {
      Title: { title: [{ plain_text: row.title }] },
      Date: { date: { start: row.date } },
      Pillar: { select: { name: row.pillar } },
      Type: { select: { name: row.type } },
      Status: { select: { name: row.status } },
      Platforms: {
        multi_select: row.platforms.map((platform) => ({ name: platform })),
      },
    },
  };
}

test.describe("notion sync", () => {
  test.afterEach(() => {
    delete process.env.DRY_RUN;
    delete process.env.NOTION_TOKEN;
    delete process.env.NOTION_CALENDAR_DB_ID;
    delete process.env.MARKETING_ENGINE_HOST_ROOT;
  });

  test("sync CLI pulls Notion rows into .marketing-engine pieces with the template", async () => {
    const host = mkdtempSync(join(tmpdir(), "me-notion-cli-"));
    mkdirSync(join(host, ".marketing-engine", "pieces"), { recursive: true });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          results: [notionRow({ id: "page-123", status: "scheduled" })],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      )) as typeof fetch;

    process.env.DRY_RUN = "false";
    process.env.NOTION_TOKEN = "token";
    process.env.NOTION_CALENDAR_DB_ID = "calendar-db";

    try {
      await withCwd(host, async () => {
        await syncCliEntry([]);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const files = readdirSync(join(host, ".marketing-engine", "pieces")).filter((file) =>
      file.endsWith(".md")
    );
    expect(files).toHaveLength(1);

    const created = readFileSync(
      join(host, ".marketing-engine", "pieces", files[0] ?? ""),
      "utf8",
    );
    expect(created).toContain("id: PIECE-2026W21-001");
    expect(created).toContain("client: unknown");
    expect(created).toContain("date: 2026-05-18");
    expect(created).toContain("status: scheduled");
    expect(created).toContain('platforms: ["instagram", "linkedin"]');
    expect(created).toContain("notion_page_id: page-123");
    expect(created).toContain("Launch the new carousel");
  });

  test("syncToLocal preserves local edits and appends the remote diff block", async () => {
    const host = mkdtempSync(join(tmpdir(), "me-notion-conflict-"));
    const piecesDir = join(host, ".marketing-engine", "pieces");
    mkdirSync(piecesDir, { recursive: true });
    const piecePath = join(piecesDir, "PIECE-2026W21-001.md");

    writeFileSync(
      piecePath,
      `---
id: PIECE-2026W21-001
client: acme
date: 2026-05-18
status: draft
type: carousel
pillar: education
platforms: ["instagram"]
locale: en
notion_page_id: page-123
notion_last_remote_hash: old-hash
---
# Brief

Keep this local brief.
`,
      "utf8",
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          results: [
            notionRow({
              id: "page-123",
              title: "Remote title changed",
              status: "scheduled",
              platforms: ["instagram", "tiktok"],
            }),
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      )) as typeof fetch;

    try {
      const result = await syncToLocal(host, {
        token: "token",
        databaseId: "calendar-db",
        client: "acme",
      });
      expect(result).toEqual({ created: 0, skipped: 1 });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const updated = readFileSync(piecePath, "utf8");
    expect(updated).toContain("id: PIECE-2026W21-001");
    expect(updated).toContain("Keep this local brief.");
    expect(updated).toContain("<!-- notion-sync conflict");
    expect(updated).toContain("remote_title: Remote title changed");
    expect(updated).toContain('remote_platforms: ["instagram", "tiktok"]');
    expect(updated).toContain("notion_page_id: page-123");
  });

  test("generate loop back-syncs scheduled status for linked Notion pieces", async () => {
    const host = mkdtempSync(join(tmpdir(), "me-notion-generate-"));
    const workspace = join(host, ".marketing-engine");
    mkdirSync(join(workspace, "pieces"), { recursive: true });
    mkdirSync(join(workspace, "data"), { recursive: true });

    writeFileSync(
      join(workspace, "pieces", "PIECE-2026W21-001.md"),
      `---
id: PIECE-2026W21-001
client: acme
date: 2026-05-18
status: draft
type: carousel
pillar: education
platforms: ["instagram"]
locale: en
notion_page_id: page-123
---
# Brief

Ship the campaign draft.
`,
      "utf8",
    );

    const calls: Array<{ url: string; body: string | undefined }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      calls.push({ url: String(input), body: init?.body ? String(init.body) : undefined });
      return new Response(
        JSON.stringify({
          object: "page",
          id: "page-123",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;

    process.env.NOTION_TOKEN = "token";

    try {
      const summary = await runGenerateLoop({
        root: host,
        matrixPath: MATRIX_PATH,
      });
      expect(summary.advanced).toBe(1);
      expect(summary.failures).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.notion.com/v1/pages/page-123");
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      properties: { Status: { select: { name: "scheduled" } } },
    });

    const updatedPiece = readFileSync(
      join(workspace, "pieces", "PIECE-2026W21-001.md"),
      "utf8",
    );
    expect(updatedPiece).toContain("status: scheduled");
  });

  test("promote loop marks linked published pieces as measured and back-syncs Notion", async () => {
    const host = mkdtempSync(join(tmpdir(), "me-notion-promote-"));
    const workspace = join(host, ".marketing-engine");
    mkdirSync(join(workspace, "pieces"), { recursive: true });
    mkdirSync(join(workspace, "data"), { recursive: true });

    writeFileSync(
      join(workspace, "pieces", "PIECE-2026W21-001.md"),
      `---
id: PIECE-2026W21-001
client: acme
date: 2026-05-18
status: published
type: reel
pillar: education
platforms: ["instagram"]
locale: en
notion_page_id: page-123
provider_override:
  ads: null
---
# Brief

Already published.
`,
      "utf8",
    );
    writeFileSync(
      join(workspace, "data", "analytics.jsonl"),
      JSON.stringify({
        piece_id: "PIECE-2026W21-001",
        client: "acme",
        channel: "instagram",
        impressions: 800,
        saves: 120,
        reach: 700,
        captured_at: new Date().toISOString(),
      }) + "\n",
      "utf8",
    );

    const calls: Array<{ url: string; body: string | undefined }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      calls.push({ url: String(input), body: init?.body ? String(init.body) : undefined });
      return new Response(
        JSON.stringify({
          object: "page",
          id: "page-123",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;

    process.env.NOTION_TOKEN = "token";

    try {
      const summary = await runPromoteLoop({
        root: host,
        windowDays: 7,
      });
      expect(summary.promoted).toBe(1);
      expect(summary.losers).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls[0]?.url).toBe("https://api.notion.com/v1/pages/page-123");
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      properties: { Status: { select: { name: "measured" } } },
    });

    const updatedPiece = readFileSync(
      join(workspace, "pieces", "PIECE-2026W21-001.md"),
      "utf8",
    );
    expect(updatedPiece).toContain("status: measured");
  });
});
