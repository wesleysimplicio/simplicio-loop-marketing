import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePiece } from "../../lib/pieces/frontmatter.ts";
import { auditSync } from "../../lib/compliance/generic.ts";
import { buildPlatformCaptions, CAPTION_PLATFORMS } from "../../lib/content/captions.ts";

const fixture = new URL("../fixtures/real-content/asolaria-on-metal-piece.md", import.meta.url);

test("near-real pt-BR content passes compliance and fans out without losing locale formatting", () => {
  const source = readFileSync(fixture, "utf8");
  const piece = parsePiece(source);
  assert.equal(piece.frontmatter.locale, "pt-BR");
  assert.match(piece.body, /🔎/u);
  assert.match(piece.body, /\n- o comando executado/);

  const report = auditSync({ piece_id: piece.frontmatter.id, text: piece.body, client: piece.frontmatter.client });
  assert.deepEqual(report.violations, []);
  assert.equal(report.pass, true);

  const captions = buildPlatformCaptions(piece.body.trim(), piece.frontmatter.pillar);
  assert.deepEqual(Object.keys(captions), [...CAPTION_PLATFORMS]);
  assert.ok(CAPTION_PLATFORMS.every((platform) => captions[platform].includes("Simplicio on Metal")));
  assert.ok(CAPTION_PLATFORMS.every((platform) => captions[platform].endsWith("#engineering-evidence")));
});
