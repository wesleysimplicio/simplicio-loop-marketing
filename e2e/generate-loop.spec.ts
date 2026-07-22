import { test, expect } from "@playwright/test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { cliEntry, runGenerateLoop } from "../lib/cli/generate";
import { serializePiece, type PieceFrontmatter } from "../lib/pieces/frontmatter";
import { resetMatrixCache } from "../lib/providers/matrix";
import { readHbp } from "../lib/formats/binary";
import { readHbi } from "../lib/formats/binary";

test("generate loop processes a draft piece end-to-end with mocks under DRY_RUN", async () => {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-gen-"));
  const workspaceRoot = join(host, ".marketing-engine");
  const piecesDir = join(workspaceRoot, "pieces");
  const outputsDir = join(workspaceRoot, "outputs");
  mkdirSync(piecesDir, { recursive: true });
  mkdirSync(outputsDir, { recursive: true });
  mkdirSync(join(workspaceRoot, "data"), { recursive: true });
  // Copy PROVIDERS.md so loader sees the real matrix (we point the loader at the embedded defaults via missing file).
  resetMatrixCache();

  const fm: PieceFrontmatter = {
    id: "PIECE-test-001",
    client: "acme",
    date: "2026-05-08",
    status: "draft",
    type: "reel",
    pillar: "education",
    platforms: ["instagram", "tiktok"],
    locale: "en",
  };
  writeFileSync(
    join(piecesDir, "PIECE-test-001.md"),
    serializePiece(fm, "# Brief\n\nLaunch our new product.\n"),
  );
  const prevCwd = process.cwd();
  process.chdir(host);
  try {
    const summary = await runGenerateLoop({ root: host });
    expect(summary.inspected).toBe(1);
    expect(summary.advanced).toBe(1);
    const pieceDir = resolve(outputsDir, "acme", "2026-05-08", "PIECE-test-001");
    expect(existsSync(join(pieceDir, "manifest.hbi"))).toBe(true);
    expect(existsSync(join(pieceDir, "script.md"))).toBe(true);
    expect(existsSync(join(pieceDir, "captions.json"))).toBe(true);
    expect(existsSync(join(pieceDir, "compliance.json"))).toBe(true);
    const manifest = readHbi<Record<string, any>>(join(pieceDir, "manifest.hbi"));
    expect(manifest.piece_id).toBe("PIECE-test-001");
    expect(manifest.providers.llm).toBeDefined();
    expect(manifest.prompts.script).toContain("Launch our new product.");
    expect(manifest.prompts.caption).toContain("Caption for:");
    expect(manifest.compliance_report_path).toContain("/data/compliance/");
    expect(manifest.qa_report_path).toContain("/qa-tech-specs.json");
    expect(Array.isArray(manifest.outputs)).toBe(true);
    expect(manifest.outputs).toContain(join(pieceDir, "script.md"));
    expect(typeof manifest.cost_estimate_usd).toBe("number");
    expect(existsSync(manifest.compliance_report_path)).toBe(true);
    expect(existsSync(manifest.qa_report_path)).toBe(true);
    const runsLog = readHbp<Record<string, any>>(join(workspaceRoot, "data", "runs.hbp"));
    expect(runsLog).toHaveLength(1);
    expect(runsLog[0]).toMatchObject({
      piece_id: "PIECE-test-001",
      client: "acme",
      status: "success",
    });
    expect(Array.isArray(runsLog[0].providers_used)).toBe(true);
    expect(typeof runsLog[0].timestamp).toBe("string");
    const usage = readFileSync(join(workspaceRoot, "data", "llm-usage.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(usage.length).toBeGreaterThanOrEqual(2);
    expect(usage.map((line) => line.task)).toEqual(["script", "caption"]);
    expect(usage.every((line) => typeof line.provider === "string")).toBe(true);
    expect(usage.every((line) => typeof line.tokens_in === "number" && typeof line.tokens_out === "number")).toBe(true);
    expect(usage.map((line) => line.prompt_format)).toEqual(["toon", "json"]);
    expect(usage.every((line) => line.piece_id === "PIECE-test-001")).toBe(true);
    const updated = readFileSync(
      join(piecesDir, "PIECE-test-001.md"),
      "utf8",
    );
    expect(updated).toMatch(/status: scheduled/);
    expect(updated).toMatch(/compliance_report:/);
  } finally {
    process.chdir(prevCwd);
  }
});

test("generate loop blocks pieces failing compliance and does not transition", async () => {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-gen-block-"));
  const workspaceRoot = join(host, ".marketing-engine");
  const piecesDir = join(workspaceRoot, "pieces");
  mkdirSync(piecesDir, { recursive: true });
  mkdirSync(join(workspaceRoot, "data"), { recursive: true });

  const fm: PieceFrontmatter = {
    id: "PIECE-test-002",
    client: "acme",
    date: "2026-05-08",
    status: "draft",
    type: "carousel",
    pillar: "education",
    platforms: ["instagram"],
    locale: "en",
  };
  writeFileSync(
    join(piecesDir, "PIECE-test-002.md"),
    serializePiece(
      fm,
      "# Brief\n\nWe guarantee 12% return per year, risk-free clinically proven.\n",
    ),
  );
  const prevCwd = process.cwd();
  process.chdir(host);
  try {
    const summary = await runGenerateLoop({ root: host });
    expect(summary.blocked).toBeGreaterThanOrEqual(1);
    const updated = readFileSync(
      join(piecesDir, "PIECE-test-002.md"),
      "utf8",
    );
    expect(updated).toMatch(/status: review/);
    expect(updated).toMatch(/compliance_block:/);
    expect(existsSync(join(workspaceRoot, "data", "compliance-blocked", "PIECE-test-002.json"))).toBe(true);
  } finally {
    process.chdir(prevCwd);
  }
});

test("generate loop blocks pieces failing qa tech specs and moves them to review", async () => {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-gen-qa-"));
  const workspaceRoot = join(host, ".marketing-engine");
  const piecesDir = join(workspaceRoot, "pieces");
  mkdirSync(piecesDir, { recursive: true });
  mkdirSync(join(workspaceRoot, "data"), { recursive: true });

  const fm: PieceFrontmatter = {
    id: "PIECE-test-003",
    client: "acme",
    date: "2026-05-08",
    status: "draft",
    type: "quote-card",
    pillar: "education",
    platforms: ["instagram", "tiktok"],
    locale: "en",
  };
  writeFileSync(
    join(piecesDir, "PIECE-test-003.md"),
    serializePiece(fm, "# Brief\n\nSquare-safe quote for two very different placements.\n"),
  );
  const prevCwd = process.cwd();
  process.chdir(host);
  try {
    const summary = await runGenerateLoop({ root: host });
    expect(summary.blocked).toBeGreaterThanOrEqual(1);
    const pieceDir = resolve(
      join(workspaceRoot, "outputs"),
      "acme",
      "2026-05-08",
      "PIECE-test-003",
    );
    expect(existsSync(join(pieceDir, "qa-tech-specs.json"))).toBe(true);
    const updated = readFileSync(join(piecesDir, "PIECE-test-003.md"), "utf8");
    expect(updated).toMatch(/status: review/);
  } finally {
    process.chdir(prevCwd);
  }
});

test("cliEntry honors MAX_ITER when reading host .marketing-engine pieces", async () => {
  process.env.DRY_RUN = "true";
  process.env.MAX_ITER = "1";
  const host = mkdtempSync(join(tmpdir(), "me-gen-max-"));
  const workspaceRoot = join(host, ".marketing-engine");
  const piecesDir = join(workspaceRoot, "pieces");
  mkdirSync(piecesDir, { recursive: true });
  mkdirSync(join(workspaceRoot, "data"), { recursive: true });

  for (const id of ["PIECE-test-101", "PIECE-test-102"]) {
    writeFileSync(
      join(piecesDir, `${id}.md`),
      serializePiece(
        {
          id,
          client: "acme",
          date: "2026-05-08",
          status: "draft",
          type: "quote-card",
          pillar: "education",
          platforms: ["instagram"],
          locale: "en",
        },
        "# Brief\n\nLaunch our new product.\n",
      ),
    );
  }

  const prevCwd = process.cwd();
  process.chdir(host);
  try {
    await cliEntry([]);
    const first = readFileSync(join(piecesDir, "PIECE-test-101.md"), "utf8");
    const second = readFileSync(join(piecesDir, "PIECE-test-102.md"), "utf8");
    const scheduledCount = [first, second].filter((text) =>
      /status: scheduled/.test(text)
    ).length;
    const draftCount = [first, second].filter((text) => /status: draft/.test(text)).length;
    expect(scheduledCount).toBe(1);
    expect(draftCount).toBe(1);
    const runsLog = readHbp(join(workspaceRoot, "data", "runs.hbp"));
    expect(runsLog).toHaveLength(1);
  } finally {
    delete process.env.MAX_ITER;
    process.chdir(prevCwd);
  }
});
