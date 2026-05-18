import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { writePiece } from "../pieces/store";
import { parsePiece } from "../pieces/frontmatter";
import type { PieceFrontmatter } from "../pieces/frontmatter";

interface NotionPiece {
  id: string;
  title?: string;
  date: string;
  pillar?: string;
  type?: string;
  status?: PieceFrontmatter["status"];
  platforms: string[];
}

interface NotionResponse {
  results?: Array<{
    id: string;
    properties?: Record<string, unknown>;
  }>;
}

function selectName(prop: unknown): string | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as { select?: { name?: string }; status?: { name?: string } };
  return p.select?.name ?? p.status?.name;
}
function multiSelectNames(prop: unknown): string[] {
  if (!prop || typeof prop !== "object") return [];
  const p = prop as { multi_select?: Array<{ name?: string }> };
  return (p.multi_select ?? []).map((x) => x.name ?? "").filter(Boolean);
}
function titleText(prop: unknown): string | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as { title?: Array<{ plain_text?: string }> };
  return p.title?.map((x) => x.plain_text ?? "").join("");
}
function dateStart(prop: unknown): string | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as { date?: { start?: string } };
  return p.date?.start;
}

export async function pullCalendar(opts?: {
  token?: string;
  databaseId?: string;
}): Promise<NotionPiece[]> {
  const token = opts?.token ?? process.env.NOTION_TOKEN;
  const dbId = opts?.databaseId ?? process.env.NOTION_CALENDAR_DB_ID;
  if (!token || !dbId) {
    throw new Error(
      "notion: NOTION_TOKEN and NOTION_CALENDAR_DB_ID required for sync",
    );
  }
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "notion-version": "2022-06-28",
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`notion: HTTP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as NotionResponse;
  const out: NotionPiece[] = [];
  for (const row of data.results ?? []) {
    const props = row.properties ?? {};
    const date = dateStart(props["Date"]);
    if (!date) continue;
    out.push({
      id: row.id,
      title: titleText(props["Title"]),
      date,
      pillar: selectName(props["Pillar"]),
      type: selectName(props["Type"]),
      status: selectName(props["Status"]) as PieceFrontmatter["status"] | undefined,
      platforms: multiSelectNames(props["Platforms"]),
    });
  }
  return out;
}

export async function syncToLocal(
  root: string,
  opts?: { token?: string; databaseId?: string; client?: string },
): Promise<{ created: number; skipped: number }> {
  const remote = await pullCalendar(opts);
  const piecesDir = resolve(root, "pieces");
  if (!existsSync(piecesDir)) mkdirSync(piecesDir, { recursive: true });
  let created = 0;
  let skipped = 0;
  for (const r of remote) {
    const filename = resolve(piecesDir, `${r.id}.md`);
    if (existsSync(filename)) {
      const existing = parsePiece(readFileSync(filename, "utf8"));
      const annotation = `\n<!-- notion-sync ${new Date().toISOString()}: remote title=${r.title}, status=${r.status} -->\n`;
      writeFileSync(filename, existing.body + annotation);
      skipped++;
      continue;
    }
    const fm: PieceFrontmatter = {
      id: r.id,
      client: opts?.client ?? "unknown",
      date: r.date,
      status: r.status ?? "draft",
      type: r.type ?? "reel",
      pillar: r.pillar ?? "education",
      platforms: r.platforms,
      locale: "en",
    };
    writePiece(
      { frontmatter: fm, body: `# Brief\n\n${r.title ?? ""}\n` },
      { piecesDir },
    );
    created++;
  }
  return { created, skipped };
}

export async function pushStatus(
  pieceNotionId: string,
  newStatus: PieceFrontmatter["status"],
  opts?: { token?: string },
): Promise<void> {
  const token = opts?.token ?? process.env.NOTION_TOKEN;
  if (!token) throw new Error("notion: NOTION_TOKEN required");
  const res = await fetch(`https://api.notion.com/v1/pages/${pieceNotionId}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "notion-version": "2022-06-28",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      properties: { Status: { select: { name: newStatus } } },
    }),
  });
  if (!res.ok) {
    throw new Error(`notion push: HTTP ${res.status}: ${await res.text()}`);
  }
}
