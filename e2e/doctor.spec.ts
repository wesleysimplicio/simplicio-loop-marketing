import { test, expect } from "@playwright/test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDoctorReport, DOCTOR_SCHEMA } from "../lib/cli/doctor";
import { runLoop } from "../lib/cli/loop";
import { serializePiece } from "../lib/pieces/frontmatter";
import { loadSchemaRegistry } from "../lib/contracts/registry";
import { validateArtifact } from "../lib/contracts/validate";

test("doctor report on an empty host is healthy and contract-valid", () => {
  const host = mkdtempSync(join(tmpdir(), "me-doctor-empty-"));
  mkdirSync(join(host, ".marketing-engine", "pieces"), { recursive: true });
  const report = buildDoctorReport(host);
  expect(report.schema).toBe(DOCTOR_SCHEMA);
  expect(report.events.present).toBe(false);
  expect(report.loop.journal_present).toBe(false);
  expect(report.savings.chain_ok).toBe(true); // empty chain is intact
  expect(validateArtifact(report, loadSchemaRegistry()).errors).toEqual([]);
});

test("doctor report reflects a real loop run (events, journal, savings, pieces)", async () => {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-doctor-run-"));
  const ws = join(host, ".marketing-engine");
  mkdirSync(join(ws, "pieces"), { recursive: true });
  mkdirSync(join(ws, "data"), { recursive: true });
  mkdirSync(join(ws, "outputs"), { recursive: true });
  writeFileSync(
    join(ws, "pieces", "PIECE-doc-001.md"),
    serializePiece(
      {
        id: "PIECE-doc-001",
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
  // A persistently failing piece so the stall surfaces in the report.
  writeFileSync(join(ws, "outputs", "badclient"), "occupied");
  writeFileSync(
    join(ws, "pieces", "PIECE-doc-fail.md"),
    serializePiece(
      {
        id: "PIECE-doc-fail",
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
  try {
    await runLoop({ root: host, mode: "drain", maxIter: 6 });
  } finally {
    process.chdir(prevCwd);
  }
  const report = buildDoctorReport(host);
  expect(report.events.present).toBe(true);
  expect(report.events.count).toBeGreaterThan(0);
  expect(report.events.stalls).toBe(1);
  expect(report.loop.journal_present).toBe(true);
  expect(report.loop.stalled_items).toEqual(["PIECE-doc-fail"]);
  expect(report.savings.count).toBe(1);
  expect(report.savings.chain_ok).toBe(true);
  expect(report.pieces.scheduled).toBe(1);
  expect(report.pieces.draft).toBe(1);
  expect(validateArtifact(report, loadSchemaRegistry()).errors).toEqual([]);
});

test("doctor names missing live credentials as blocked without exposing values", () => {
  const previousDryRun = process.env.DRY_RUN;
  const previousClaude = process.env.ANTHROPIC_API_KEY;
  process.env.DRY_RUN = "false";
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const report = buildDoctorReport(mkdtempSync(join(tmpdir(), "me-doctor-env-")));
    const credential = report.checks.find((item) => item.id === "provider.claude.credential");
    expect(credential?.status).toBe("blocked");
    expect(credential?.detail).not.toContain("sk-");
    expect(report.has_blocked).toBe(true);
  } finally {
    if (previousDryRun === undefined) delete process.env.DRY_RUN;
    else process.env.DRY_RUN = previousDryRun;
    if (previousClaude === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousClaude;
  }
});

test("doctor reports a named blocked check when a toolchain is unavailable", () => {
  const previous = process.env.MARKETING_ENGINE_DOCTOR_MISSING;
  process.env.MARKETING_ENGINE_DOCTOR_MISSING = "ffmpeg";
  try {
    const report = buildDoctorReport(mkdtempSync(join(tmpdir(), "me-doctor-toolchain-")));
    expect(report.checks).toContainEqual({
      id: "toolchain.ffmpeg",
      status: "blocked",
      detail: "ffmpeg is missing from PATH",
    });
  } finally {
    if (previous === undefined) delete process.env.MARKETING_ENGINE_DOCTOR_MISSING;
    else process.env.MARKETING_ENGINE_DOCTOR_MISSING = previous;
  }
});
