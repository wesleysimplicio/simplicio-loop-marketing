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
import { runLoop, cliEntry } from "../lib/cli/loop";
import { serializePiece, type PieceFrontmatter } from "../lib/pieces/frontmatter";
import {
  fingerprint,
  itemVerdict,
  readJournal,
  recordAttempt,
} from "../lib/loop/journal";
import { savingsSummary } from "../lib/observability/savings";
import { eventsSummary } from "../lib/observability/events";
import { readBoard } from "../lib/yool/board";

function makeHost(): { host: string; ws: string; piecesDir: string } {
  const host = mkdtempSync(join(tmpdir(), "me-loop-"));
  const ws = join(host, ".marketing-engine");
  const piecesDir = join(ws, "pieces");
  mkdirSync(piecesDir, { recursive: true });
  mkdirSync(join(ws, "data"), { recursive: true });
  mkdirSync(join(ws, "outputs"), { recursive: true });
  return { host, ws, piecesDir };
}

function writeGoodPiece(piecesDir: string, id: string): void {
  const fm: PieceFrontmatter = {
    id,
    client: "acme",
    date: "2026-05-08",
    status: "draft",
    type: "reel",
    pillar: "education",
    platforms: ["instagram"],
    locale: "en",
  };
  writeFileSync(
    join(piecesDir, `${id}.md`),
    serializePiece(fm, "# Brief\n\nLaunch our new product.\n"),
  );
}

test("journal fingerprints are stable across volatile fragments", () => {
  const a = fingerprint("ENOTDIR: not a directory, mkdir '/tmp/me-loop-abc123/outputs/x/2026-05-08'");
  const b = fingerprint("ENOTDIR: not a directory, mkdir '/tmp/me-loop-zzz999/outputs/x/2026-05-08'");
  expect(a).toBe(b);
  const c = fingerprint("compliance-block:PIECE-1");
  expect(a).not.toBe(c);
});

test("itemVerdict flags STALLED after K identical failures and resets on progress", () => {
  const { host } = makeHost();
  for (let i = 1; i <= 3; i++) {
    recordAttempt(host, {
      item_id: "P1",
      attempt: i,
      action: "generate",
      gate: "fail",
      failure_text: "same failure at /tmp/x:42",
    });
  }
  expect(itemVerdict(host, "P1").verdict).toBe("STALLED");
  // A different failure breaks the streak.
  recordAttempt(host, {
    item_id: "P1",
    attempt: 4,
    action: "generate",
    gate: "fail",
    failure_text: "brand new failure mode",
  });
  expect(itemVerdict(host, "P1").verdict).toBe("PROGRESS");
});

test("drain mode: advances good pieces, stalls the persistent failure, books savings", async () => {
  process.env.DRY_RUN = "true";
  const { host, ws, piecesDir } = makeHost();
  writeGoodPiece(piecesDir, "PIECE-loop-001");
  writeGoodPiece(piecesDir, "PIECE-loop-002");
  // Persistent generic failure: the piece's client output path is occupied
  // by a FILE, so mkdir fails identically on every attempt and the piece
  // stays in draft — exactly the shape the stall detector exists for.
  writeFileSync(join(ws, "outputs", "badclient"), "occupied");
  writeFileSync(
    join(piecesDir, "PIECE-loop-fail.md"),
    serializePiece(
      {
        id: "PIECE-loop-fail",
        client: "badclient",
        date: "2026-05-08",
        status: "draft",
        type: "reel",
        pillar: "education",
        platforms: ["instagram"],
        locale: "en",
      },
      "# Brief\n\nLaunch our new product.\n",
    ),
  );

  const prevCwd = process.cwd();
  process.chdir(host);
  let summary;
  try {
    summary = await runLoop({ root: host, mode: "drain", maxIter: 6 });
  } finally {
    process.chdir(prevCwd);
  }

  expect(summary.advanced).toBe(2);
  expect(summary.failures).toBe(3); // K=3 identical failures, then stall
  expect(summary.skipped_stalled).toBe(1);
  expect(summary.stopped_reason).toBe("all_stalled");

  // Good pieces really advanced.
  for (const id of ["PIECE-loop-001", "PIECE-loop-002"]) {
    expect(readFileSync(join(piecesDir, `${id}.md`), "utf8")).toMatch(/status: scheduled/);
    expect(
      existsSync(join(ws, "outputs", "acme", "2026-05-08", id, "manifest.json")),
    ).toBe(true);
  }
  // Failing piece stayed draft — never silently advanced.
  expect(readFileSync(join(piecesDir, "PIECE-loop-fail.md"), "utf8")).toMatch(/status: draft/);

  // Journal: 3 identical-fingerprint fails + 1 skip for the stalled piece.
  const journal = readJournal(host).filter((r) => r.item_id === "PIECE-loop-fail");
  expect(journal.filter((r) => r.gate === "fail")).toHaveLength(3);
  expect(new Set(journal.filter((r) => r.gate === "fail").map((r) => r.fingerprint)).size).toBe(1);
  expect(journal.filter((r) => r.gate === "skipped")).toHaveLength(1);

  // The skip booked an ESTIMATED savings receipt on an intact chain.
  const savings = savingsSummary(host);
  expect(savings.count).toBe(1);
  expect(savings.by_source["loop:journal-skip"].count).toBe(1);
  expect(savings.chain.ok).toBe(true);

  // Events: loop lifecycle + stall.
  const events = eventsSummary(host, 50);
  expect(events.by_kind.loop_start).toBe(1);
  expect(events.by_kind.loop_complete).toBe(1);
  expect(events.by_kind.stall_detected).toBe(1);

  // Yool board: good pieces done, failing piece blocked.
  const board = readBoard(ws);
  const byId = new Map(board.map((t) => [t.id, t]));
  expect(byId.get("piece.plan:PIECE-loop-001")?.status).toBe("done");
  expect(byId.get("piece.plan:PIECE-loop-002")?.status).toBe("done");
  expect(byId.get("piece.plan:PIECE-loop-fail")?.status).toBe("blocked");
});

test("drain mode stops with 'drained' when every piece advances", async () => {
  process.env.DRY_RUN = "true";
  const { host, piecesDir } = makeHost();
  writeGoodPiece(piecesDir, "PIECE-loop-101");
  const prevCwd = process.cwd();
  process.chdir(host);
  let summary;
  try {
    summary = await runLoop({ root: host, mode: "drain", maxIter: 5 });
  } finally {
    process.chdir(prevCwd);
  }
  expect(summary.advanced).toBe(1);
  expect(summary.stopped_reason).toBe("drained");
});

test("converge mode stops after the first item lands", async () => {
  process.env.DRY_RUN = "true";
  const { host, piecesDir } = makeHost();
  writeGoodPiece(piecesDir, "PIECE-loop-201");
  writeGoodPiece(piecesDir, "PIECE-loop-202");
  const prevCwd = process.cwd();
  process.chdir(host);
  let summary;
  try {
    summary = await runLoop({ root: host, mode: "converge", maxIter: 5 });
  } finally {
    process.chdir(prevCwd);
  }
  expect(summary.advanced).toBe(1);
  expect(summary.stopped_reason).toBe("converged");
  // The second piece is untouched — converge is depth, not breadth.
  expect(readFileSync(join(piecesDir, "PIECE-loop-202.md"), "utf8")).toMatch(/status: draft/);
});

test("cliEntry prints the machine-readable summary line on stdout", async () => {
  process.env.DRY_RUN = "true";
  const { host, piecesDir } = makeHost();
  writeGoodPiece(piecesDir, "PIECE-loop-301");
  const prevCwd = process.cwd();
  const chunks: string[] = [];
  const origWrite = process.stdout.write.bind(process.stdout);
  process.chdir(host);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  try {
    await cliEntry(["--max-iter", "3", "--mode", "drain"]);
  } finally {
    process.stdout.write = origWrite;
    process.chdir(prevCwd);
  }
  const line = chunks.join("");
  expect(line).toMatch(/loop: mode=drain iterations=\d+ processed=\d+ advanced=1/);
  expect(line).toMatch(/stop=drained/);
});
