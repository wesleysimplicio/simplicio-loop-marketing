'use strict';

/*
 * Integration test — exercises the "read piece.md -> compliance -> contract
 * validate -> write outputs" slice of the Mandatory Loop (see CLAUDE.md)
 * end-to-end against real modules (lib/pieces, lib/compliance, lib/contracts),
 * with only the filesystem sandboxed to a temp dir. No mocks: this closes the
 * "integration tests" gap flagged by the repo survey, which found no tier
 * distinct from unit specs and Playwright e2e.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePiece, serializePiece, type PieceFrontmatter } from "../../lib/pieces/frontmatter.ts";
import { auditSync, writeReport } from "../../lib/compliance/generic.ts";
import { validateArtifact, type SubsetSchema } from "../../lib/contracts/validate.ts";

const COMPLIANCE_REPORT_SCHEMA: SubsetSchema = {
  type: "object",
  required: ["piece_id", "pass", "violations", "warnings"],
  properties: {
    piece_id: { type: "string" },
    pass: { type: "boolean" },
    violations: { type: "array" },
    warnings: { type: "array" },
  },
};

function makeFrontmatter(overrides: Partial<PieceFrontmatter> = {}): PieceFrontmatter {
  return {
    id: "p-int-1",
    client: "acme",
    date: "2026-07-14",
    status: "draft",
    type: "post",
    pillar: "education",
    platforms: ["instagram", "tiktok"],
    locale: "en",
    ...overrides,
  };
}

test("clean piece round-trips through parse -> compliance -> contract validate with pass:true", () => {
  const dir = mkdtempSync(join(tmpdir(), "piece-pipeline-"));
  try {
    const fm = makeFrontmatter();
    const body = "Try our new dashboard today. Real results, no gimmicks.";
    const serialized = serializePiece(fm, body);

    // Step 1: read piece.md (round-trip through the real parser).
    const parsed = parsePiece(serialized);
    assert.equal(parsed.frontmatter.id, "p-int-1");
    assert.equal(parsed.body.trim(), body);

    // Step 2: compliance gate.
    const report = auditSync({ piece_id: parsed.frontmatter.id, text: parsed.body });
    assert.equal(report.pass, true);
    const reportPath = writeReport(dir, report);

    // Step 3: the persisted report must itself satisfy its contract schema.
    const persisted = JSON.parse(readFileSync(reportPath, "utf8"));
    const validation = validateArtifact(
      { schema: "compliance-report/v1", ...persisted },
      { "compliance-report/v1": COMPLIANCE_REPORT_SCHEMA },
    );
    assert.equal(validation.ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("non-compliant piece blocks the pipeline and the block reason is traceable end-to-end", () => {
  const dir = mkdtempSync(join(tmpdir(), "piece-pipeline-block-"));
  try {
    const fm = makeFrontmatter({ id: "p-int-2" });
    const body = "This treats chronic pain and guarantees results in 7 days.";
    const parsed = parsePiece(serializePiece(fm, body));

    const report = auditSync({ piece_id: parsed.frontmatter.id, text: parsed.body });
    assert.equal(report.pass, false);
    assert.ok(report.violations.length >= 1);

    const reportPath = writeReport(dir, report);
    const persisted = JSON.parse(readFileSync(reportPath, "utf8"));
    const validation = validateArtifact(
      { schema: "compliance-report/v1", ...persisted },
      { "compliance-report/v1": COMPLIANCE_REPORT_SCHEMA },
    );
    // Contract shape still holds even for a failing/blocked report.
    assert.equal(validation.ok, true);
    assert.equal(persisted.pass, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("parsePiece rejects a piece.md missing a required frontmatter key before it ever reaches compliance", () => {
  const fm = makeFrontmatter();
  delete (fm as Partial<PieceFrontmatter>).pillar;
  const serialized = serializePiece(fm as PieceFrontmatter, "body text");
  assert.throws(() => parsePiece(serialized), /pillar/);
});
