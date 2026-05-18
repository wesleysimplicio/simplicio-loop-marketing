import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parsePiece, serializePiece } from "../pieces/frontmatter";
import type { PieceFrontmatter } from "../pieces/frontmatter";
import { isoWeek, nextPieceId } from "../pieces/id";
import { renderPieceTemplate } from "../pieces/template";

export interface NotionPiece {
  id: string;
  title?: string;
  date: string;
  pillar?: string;
  type?: string;
  status?: PieceFrontmatter["status"];
  platforms: string[];
}

function serializeInlineList(values: string[]): string {
  return `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;
}

interface NotionResponse {
  results?: Array<{
    id: string;
    properties?: Record<string, unknown>;
  }>;
}

function engineRoot(root: string): string {
  const nested = resolve(root, ".marketing-engine");
  return existsSync(nested) ? nested : root;
}

function remoteFingerprint(piece: NotionPiece): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: piece.id,
        title: piece.title ?? "",
        date: piece.date,
        pillar: piece.pillar ?? "",
        type: piece.type ?? "",
        status: piece.status ?? "",
        platforms: piece.platforms,
      }),
    )
    .digest("hex");
}

function nextSequenceForWeek(piecesDir: string, date: Date): number {
  const { year, week } = isoWeek(date);
  const prefix = `PIECE-${year}W${String(week).padStart(2, "0")}-`;
  let maxSeq = 0;

  for (const file of readdirSync(piecesDir)) {
    if (!file.startsWith(prefix) || !file.endsWith(".md")) continue;
    const seq = Number(file.slice(prefix.length, prefix.length + 3));
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return maxSeq + 1;
}

function findLinkedPiecePath(piecesDir: string, notionPageId: string): string | null {
  if (!existsSync(piecesDir)) return null;
  const legacyPath = resolve(piecesDir, `${notionPageId}.md`);
  if (existsSync(legacyPath)) return legacyPath;

  for (const file of readdirSync(piecesDir)) {
    if (!file.endsWith(".md") || file.startsWith(".")) continue;
    const fullPath = resolve(piecesDir, file);
    try {
      const parsed = parsePiece(readFileSync(fullPath, "utf8"));
      if (parsed.frontmatter.notion_page_id === notionPageId) {
        return fullPath;
      }
      if (parsed.frontmatter.id === notionPageId) {
        return fullPath;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function conflictBlock(
  piece: NotionPiece,
  syncedAt: string,
  remoteHash: string,
): string {
  return [
    "",
    "<!-- notion-sync conflict",
    `synced_at: ${syncedAt}`,
    `remote_hash: ${remoteHash}`,
    `remote_page_id: ${piece.id}`,
    `remote_title: ${piece.title ?? ""}`,
    `remote_date: ${piece.date}`,
    `remote_pillar: ${piece.pillar ?? ""}`,
    `remote_type: ${piece.type ?? ""}`,
    `remote_status: ${piece.status ?? ""}`,
    `remote_platforms: ${serializeInlineList(piece.platforms)}`,
    "-->",
    "",
  ].join("\n");
}

function resolveNotionPageId(
  pieceId: string,
  root?: string,
): { pageId: string; filePath?: string } {
  const cwd = root ?? process.env.MARKETING_ENGINE_HOST_ROOT ?? process.cwd();
  const piecesDir = resolve(engineRoot(cwd), "pieces");
  const directPath = resolve(piecesDir, `${pieceId}.md`);

  if (existsSync(directPath)) {
    const parsed = parsePiece(readFileSync(directPath, "utf8"));
    return {
      pageId: parsed.frontmatter.notion_page_id ?? pieceId,
      filePath: directPath,
    };
  }

  const linkedPath = findLinkedPiecePath(piecesDir, pieceId);
  if (linkedPath) {
    const parsed = parsePiece(readFileSync(linkedPath, "utf8"));
    return {
      pageId: parsed.frontmatter.notion_page_id ?? pieceId,
      filePath: linkedPath,
    };
  }

  return { pageId: pieceId };
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
  opts?: { token?: string; databaseId?: string; client?: string; now?: Date },
): Promise<{ created: number; skipped: number }> {
  const remote = await pullCalendar(opts);
  const piecesDir = resolve(engineRoot(root), "pieces");
  if (!existsSync(piecesDir)) mkdirSync(piecesDir, { recursive: true });
  const syncedAt = (opts?.now ?? new Date()).toISOString();
  let created = 0;
  let skipped = 0;

  for (const r of remote) {
    const remoteHash = remoteFingerprint(r);
    const existingPath = findLinkedPiecePath(piecesDir, r.id);

    if (existingPath) {
      const existing = parsePiece(readFileSync(existingPath, "utf8"));
      if (existing.frontmatter.notion_last_remote_hash === remoteHash) {
        skipped++;
        continue;
      }

      const block = conflictBlock(r, syncedAt, remoteHash);
      const body = existing.body.includes(block)
        ? existing.body
        : `${existing.body.replace(/\s*$/, "")}\n${block}`;
      const nextFrontmatter: PieceFrontmatter = {
        ...existing.frontmatter,
        notion_page_id: r.id,
        notion_last_remote_hash: remoteHash,
        notion_last_synced_at: syncedAt,
      };
      writeFileSync(existingPath, serializePiece(nextFrontmatter, body), "utf8");
      skipped++;
      continue;
    }

    const date = new Date(`${r.date}T00:00:00Z`);
    const pieceId = nextPieceId(date, nextSequenceForWeek(piecesDir, date));
    const content = renderPieceTemplate({
      id: pieceId,
      client: opts?.client ?? "unknown",
      campaign: null,
      date: r.date,
      status: r.status ?? "draft",
      type: r.type ?? "reel",
      pillar: r.pillar ?? "education",
      platforms: r.platforms,
      locale: "en",
      brief: r.title ?? "Imported from Notion calendar.",
      extraFrontmatter: {
        notion_page_id: r.id,
        notion_last_synced_at: syncedAt,
        notion_last_remote_hash: remoteHash,
      },
    });
    writeFileSync(resolve(piecesDir, `${pieceId}.md`), content, "utf8");
    created++;
  }

  return { created, skipped };
}

export async function pushStatus(
  pieceId: string,
  newStatus: PieceFrontmatter["status"],
  opts?: { token?: string; root?: string },
): Promise<void> {
  const token = opts?.token ?? process.env.NOTION_TOKEN;
  if (!token) throw new Error("notion: NOTION_TOKEN required");
  const { pageId } = resolveNotionPageId(pieceId, opts?.root);
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
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
