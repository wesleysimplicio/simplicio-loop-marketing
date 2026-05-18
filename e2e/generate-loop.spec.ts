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
import { runGenerateLoop } from "../lib/cli/generate";
import { serializePiece, type PieceFrontmatter } from "../lib/pieces/frontmatter";
import { resetMatrixCache } from "../lib/providers/matrix";

test("generate loop processes a draft piece end-to-end with mocks under DRY_RUN", async () => {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-gen-"));
  const piecesDir = join(host, "pieces");
  const outputsDir = join(host, "outputs");
  mkdirSync(piecesDir, { recursive: true });
  mkdirSync(outputsDir, { recursive: true });
  mkdirSync(join(host, "data"), { recursive: true });
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
    const summary = await runGenerateLoop({
      root: host,
      piecesDir,
      outputsDir,
    });
    expect(summary.inspected).toBe(1);
    expect(summary.advanced).toBe(1);
    const pieceDir = resolve(outputsDir, "acme", "2026-05-08", "PIECE-test-001");
    expect(existsSync(join(pieceDir, "manifest.json"))).toBe(true);
    expect(existsSync(join(pieceDir, "script.md"))).toBe(true);
    expect(existsSync(join(pieceDir, "captions.json"))).toBe(true);
    expect(existsSync(join(pieceDir, "compliance.json"))).toBe(true);
    const manifest = JSON.parse(
      readFileSync(join(pieceDir, "manifest.json"), "utf8"),
    );
    expect(manifest.piece_id).toBe("PIECE-test-001");
    expect(manifest.providers.llm).toBeDefined();
    expect(manifest.prompts.script).toContain("Launch our new product.");
    expect(manifest.prompts.caption).toContain("Caption for:");
    expect(manifest.compliance_report_path).toContain("compliance.json");
    expect(Array.isArray(manifest.outputs)).toBe(true);
    expect(manifest.outputs).toContain(join(pieceDir, "script.md"));
    expect(typeof manifest.cost_estimate_usd).toBe("number");
    const runsLog = readFileSync(join(host, "data", "runs.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(runsLog).toHaveLength(1);
    expect(runsLog[0]).toMatchObject({
      piece_id: "PIECE-test-001",
      client: "acme",
      status: "success",
    });
    expect(Array.isArray(runsLog[0].providers_used)).toBe(true);
    expect(typeof runsLog[0].timestamp).toBe("string");
    const usage = readFileSync(join(host, "data", "llm-usage.jsonl"), "utf8");
    expect(usage.length).toBeGreaterThan(0);
    const updated = readFileSync(
      join(piecesDir, "PIECE-test-001.md"),
      "utf8",
    );
    expect(updated).toMatch(/status: scheduled/);
  } finally {
    process.chdir(prevCwd);
  }
});

test("generate loop blocks pieces failing compliance and does not transition", async () => {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-gen-block-"));
  const piecesDir = join(host, "pieces");
  mkdirSync(piecesDir, { recursive: true });
  mkdirSync(join(host, "data"), { recursive: true });

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
    const summary = await runGenerateLoop({
      root: host,
      piecesDir,
      outputsDir: join(host, "outputs"),
    });
    expect(summary.blocked).toBeGreaterThanOrEqual(1);
    const updated = readFileSync(
      join(piecesDir, "PIECE-test-002.md"),
      "utf8",
    );
    expect(updated).toMatch(/status: draft/);
    expect(updated).toMatch(/compliance_block:/);
  } finally {
    process.chdir(prevCwd);
  }
});
