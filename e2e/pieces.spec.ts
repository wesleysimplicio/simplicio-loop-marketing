import { test, expect } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  formatPieceId,
  isoWeek,
  nextPieceId,
  _resetIdCounters,
} from "../lib/pieces/id";
import {
  parsePiece,
  serializePiece,
  type PieceFrontmatter,
} from "../lib/pieces/frontmatter";
import {
  ensurePiecesDir,
  listPieces,
  readPiece,
  transitionStatus,
  writePiece,
} from "../lib/pieces/store";

test("isoWeek picks correct year and week", () => {
  expect(isoWeek(new Date("2026-05-08T00:00:00Z"))).toEqual({ year: 2026, week: 19 });
  expect(isoWeek(new Date("2026-01-01T00:00:00Z"))).toEqual({ year: 2026, week: 1 });
});

test("formatPieceId pads correctly", () => {
  expect(formatPieceId(new Date("2026-05-08T00:00:00Z"), 1)).toBe("PIECE-2026W19-001");
  expect(formatPieceId(new Date("2026-05-08T00:00:00Z"), 47)).toBe("PIECE-2026W19-047");
});

test("nextPieceId increments per ISO week", () => {
  _resetIdCounters();
  const a = nextPieceId(new Date("2026-05-08T00:00:00Z"));
  const b = nextPieceId(new Date("2026-05-08T00:00:00Z"));
  expect(a).toBe("PIECE-2026W19-001");
  expect(b).toBe("PIECE-2026W19-002");
});

test("nextPieceId resets sequence on ISO week boundary", () => {
  _resetIdCounters();
  const week19 = nextPieceId(new Date("2026-05-08T00:00:00Z"));
  const week20 = nextPieceId(new Date("2026-05-11T00:00:00Z"));
  expect(week19).toBe("PIECE-2026W19-001");
  expect(week20).toBe("PIECE-2026W20-001");
});

test("parsePiece extracts frontmatter and body", () => {
  const text = `---
id: PIECE-2026W19-001
client: acme
date: 2026-05-08
status: draft
type: reel
pillar: education
platforms: ["instagram", "tiktok"]
locale: en
---

# Brief

This is the brief.
`;
  const parsed = parsePiece(text);
  expect(parsed.frontmatter.id).toBe("PIECE-2026W19-001");
  expect(parsed.frontmatter.platforms).toEqual(["instagram", "tiktok"]);
  expect(parsed.frontmatter.status).toBe("draft");
  expect(parsed.body.startsWith("# Brief")).toBe(true);
});

test("parsePiece rejects missing required keys", () => {
  expect(() =>
    parsePiece(`---\nid: x\n---\nbody\n`),
  ).toThrow(/required frontmatter key missing/);
});

test("parsePiece requires locale explicitly", () => {
  expect(() =>
    parsePiece(`---
id: PIECE-2026W19-001
client: acme
date: 2026-05-08
status: draft
type: reel
pillar: education
platforms: ["instagram"]
---
body
`),
  ).toThrow(/locale/);
});

test("serializePiece round-trips", () => {
  const fm: PieceFrontmatter = {
    id: "PIECE-2026W19-001",
    client: "acme",
    date: "2026-05-08",
    status: "draft",
    type: "reel",
    pillar: "education",
    platforms: ["instagram"],
    locale: "en",
  };
  const text = serializePiece(fm, "# Brief\n\nhello\n");
  const re = parsePiece(text);
  expect(re.frontmatter.id).toBe(fm.id);
  expect(re.frontmatter.platforms).toEqual(fm.platforms);
});

test("store transitions draft → scheduled and rejects illegal jumps", () => {
  const tmp = mkdtempSync(join(tmpdir(), "me-pieces-"));
  const dir = ensurePiecesDir({ piecesDir: tmp });
  expect(dir).toBe(tmp);
  const fm: PieceFrontmatter = {
    id: "PIECE-test-001",
    client: "acme",
    date: "2026-05-08",
    status: "draft",
    type: "reel",
    pillar: "education",
    platforms: ["instagram"],
    locale: "en",
  };
  writePiece({ frontmatter: fm, body: "# Brief\n" }, { piecesDir: tmp });
  transitionStatus("PIECE-test-001", "draft", "scheduled", { piecesDir: tmp });
  const after = readPiece("PIECE-test-001", { piecesDir: tmp });
  expect(after.frontmatter.status).toBe("scheduled");
  expect(() =>
    transitionStatus("PIECE-test-001", "draft", "published", { piecesDir: tmp }),
  ).toThrow(/not allowed|not draft|scheduled/i);
});

test("listPieces filters by status", () => {
  const tmp = mkdtempSync(join(tmpdir(), "me-pieces-"));
  for (const [id, status] of [
    ["PIECE-2026W19-001", "draft"],
    ["PIECE-2026W19-002", "scheduled"],
  ] as const) {
    writeFileSync(
      join(tmp, `${id}.md`),
      serializePiece(
        {
          id,
          client: "acme",
          date: "2026-05-08",
          status,
          type: "reel",
          pillar: "education",
          platforms: ["instagram"],
          locale: "en",
        },
        "x",
      ),
    );
  }
  const drafts = listPieces({ piecesDir: tmp, status: "draft" });
  expect(drafts).toHaveLength(1);
  expect(drafts[0].frontmatter.id).toBe("PIECE-2026W19-001");
});
