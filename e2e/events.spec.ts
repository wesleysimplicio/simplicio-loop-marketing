import { test, expect } from "@playwright/test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  emitEvent,
  eventsPath,
  eventsSummary,
  EVENT_SCHEMA,
  runId,
} from "../lib/observability/events";
import { runGenerateLoop } from "../lib/cli/generate";
import { serializePiece } from "../lib/pieces/frontmatter";

test("emitEvent writes a versioned JSONL record under the root", () => {
  const root = mkdtempSync(join(tmpdir(), "me-events-"));
  const ev = emitEvent(root, {
    kind: "piece_start",
    piece_id: "PIECE-ev-001",
    client: "acme",
    phase: "generate",
  });
  expect(ev.schema).toBe(EVENT_SCHEMA);
  expect(ev.run_id).toBe(runId());
  const path = eventsPath(root);
  expect(existsSync(path)).toBe(true);
  const lines = readFileSync(path, "utf8").trim().split("\n");
  expect(lines).toHaveLength(1);
  const parsed = JSON.parse(lines[0]);
  expect(parsed).toMatchObject({
    schema: "marketing-event/v1",
    kind: "piece_start",
    piece_id: "PIECE-ev-001",
    client: "acme",
    phase: "generate",
    level: "info",
  });
  expect(typeof parsed.ts).toBe("string");
});

test("kill-switch SIMPLICIO_DISABLE_RUN_LOG=1 suppresses the JSONL write", () => {
  const root = mkdtempSync(join(tmpdir(), "me-events-kill-"));
  process.env.SIMPLICIO_DISABLE_RUN_LOG = "1";
  try {
    emitEvent(root, { kind: "piece_start", piece_id: "PIECE-ev-002" });
    expect(existsSync(eventsPath(root))).toBe(false);
  } finally {
    delete process.env.SIMPLICIO_DISABLE_RUN_LOG;
  }
});

test("emitEvent rotates the log past the size threshold", () => {
  const root = mkdtempSync(join(tmpdir(), "me-events-rot-"));
  const path = eventsPath(root);
  mkdirSync(join(root, ".simplicio"), { recursive: true });
  // Pre-fill beyond the (env-overridden) rotation threshold.
  process.env.SIMPLICIO_EVENTS_MAX_BYTES = "1024";
  try {
    writeFileSync(path, "x".repeat(2048));
    emitEvent(root, { kind: "loop_iteration" });
    expect(existsSync(`${path}.1`)).toBe(true);
    expect(statSync(path).size).toBeLessThan(1024);
    const line = JSON.parse(readFileSync(path, "utf8").trim());
    expect(line.kind).toBe("loop_iteration");
  } finally {
    delete process.env.SIMPLICIO_EVENTS_MAX_BYTES;
  }
});

test("emitEvent fails open when the root is not writable", () => {
  // A file path (not dir) as root makes mkdir/append fail internally.
  const root = mkdtempSync(join(tmpdir(), "me-events-ro-"));
  const bogus = join(root, "not-a-dir");
  writeFileSync(bogus, "occupied");
  expect(() =>
    emitEvent(join(bogus, "nested"), { kind: "piece_start" }),
  ).not.toThrow();
});

test("generate loop emits piece_start, gate and manifest events", async () => {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-events-gen-"));
  const workspaceRoot = join(host, ".marketing-engine");
  mkdirSync(join(workspaceRoot, "pieces"), { recursive: true });
  mkdirSync(join(workspaceRoot, "data"), { recursive: true });
  writeFileSync(
    join(workspaceRoot, "pieces", "PIECE-ev-100.md"),
    serializePiece(
      {
        id: "PIECE-ev-100",
        client: "acme",
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
  try {
    const summary = await runGenerateLoop({ root: host });
    expect(summary.advanced).toBe(1);
  } finally {
    process.chdir(prevCwd);
  }
  const s = eventsSummary(host);
  expect(s.count).toBeGreaterThanOrEqual(4);
  expect(s.by_kind.piece_start).toBe(1);
  expect(s.by_kind.gate_pass).toBe(1);
  expect(s.by_kind.manifest_written).toBe(1);
  expect(s.by_kind.piece_advanced).toBe(1);
  expect(s.last.length).toBeGreaterThan(0);
});
