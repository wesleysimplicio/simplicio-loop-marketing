import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import {
  parsePiece,
  serializePiece,
  type ParsedPiece,
  type PieceFrontmatter,
} from "./frontmatter";

const ALLOWED_TRANSITIONS: Record<
  PieceFrontmatter["status"],
  Array<PieceFrontmatter["status"]>
> = {
  draft: ["scheduled", "review"],
  scheduled: ["published", "review"],
  published: ["measured", "review"],
  measured: [],
  review: ["draft", "scheduled"],
};

export interface PieceStoreOptions {
  root?: string;
  piecesDir?: string;
}

function piecesDir(opts?: PieceStoreOptions): string {
  if (opts?.piecesDir) return resolve(opts.piecesDir);
  const root = opts?.root ?? process.cwd();
  return resolve(root, "pieces");
}

export function ensurePiecesDir(opts?: PieceStoreOptions): string {
  const dir = piecesDir(opts);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function listPieces(opts?: PieceStoreOptions & {
  status?: PieceFrontmatter["status"];
  client?: string;
}): ParsedPiece[] {
  const dir = piecesDir(opts);
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir).filter(
    (f) => f.endsWith(".md") && !f.startsWith("."),
  );
  const out: ParsedPiece[] = [];
  for (const f of entries) {
    const text = readFileSync(join(dir, f), "utf8");
    try {
      const parsed = parsePiece(text);
      if (opts?.status && parsed.frontmatter.status !== opts.status) continue;
      if (opts?.client && parsed.frontmatter.client !== opts.client) continue;
      out.push(parsed);
    } catch {
      continue;
    }
  }
  return out;
}

export function pieceFilePath(id: string, opts?: PieceStoreOptions): string {
  return join(piecesDir(opts), `${id}.md`);
}

export function readPiece(id: string, opts?: PieceStoreOptions): ParsedPiece {
  const path = pieceFilePath(id, opts);
  if (!existsSync(path)) throw new Error(`piece not found: ${id} (looked at ${path})`);
  return parsePiece(readFileSync(path, "utf8"));
}

export function writePiece(
  piece: ParsedPiece,
  opts?: PieceStoreOptions,
): string {
  ensurePiecesDir(opts);
  const path = pieceFilePath(piece.frontmatter.id, opts);
  writeFileSync(path, serializePiece(piece.frontmatter, piece.body), "utf8");
  return path;
}

export function transitionStatus(
  id: string,
  from: PieceFrontmatter["status"],
  to: PieceFrontmatter["status"],
  opts?: PieceStoreOptions,
): ParsedPiece {
  const piece = readPiece(id, opts);
  if (piece.frontmatter.status !== from) {
    throw new Error(
      `transition: piece ${id} is in status ${piece.frontmatter.status}, not ${from}`,
    );
  }
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(
      `transition: ${from} → ${to} not allowed for piece ${id}; valid: ${allowed.join(", ") || "(none)"}`,
    );
  }
  piece.frontmatter.status = to;
  writePiece(piece, opts);
  return piece;
}

export const list = listPieces;
export const read = readPiece;
export const write = writePiece;
