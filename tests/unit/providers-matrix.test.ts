'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseProvidersMarkdown,
  llmRow,
  imageRow,
  videoRow,
  loadProviderMatrix,
  resetMatrixCache,
} from "../../lib/providers/matrix.ts";

test("parseProvidersMarkdown: parses LLM rows with default + fallback", () => {
  const md = `
## LLM Routing

| Task | Default | Fallback | Reason |
| --- | --- | --- | --- |
| script | Claude | Codex | quality |
`;
  const matrix = parseProvidersMarkdown(md);
  assert.equal(matrix.llm.script.default, "claude");
  assert.equal(matrix.llm.script.fallback, "codex");
  assert.equal(matrix.llm.script.reason, "quality");
});

test("parseProvidersMarkdown: parses image/video rows without a fallback column", () => {
  const md = `
## Image Routing

| Task | Default | Reason |
| --- | --- | --- |
| Quote Card / Typography | GPT-Image | crisp text |

## Video Routing

| Task | Default | Reason |
| --- | --- | --- |
| Cinematic Reel | Higgsfield | motion quality |
`;
  const matrix = parseProvidersMarkdown(md);
  assert.equal(matrix.image["quote-card"].default, "gpt-image");
  assert.equal(matrix.video["cinematic-reel"].default, "higgsfield");
});

test("parseProvidersMarkdown: a dash fallback cell is treated as absent", () => {
  const md = `
## LLM Routing

| Task | Default | Fallback |
| --- | --- | --- |
| code | Claude | - |
`;
  const matrix = parseProvidersMarkdown(md);
  assert.equal(matrix.llm.code.fallback, undefined);
});

test("llmRow/imageRow/videoRow: fall back to a sane default for unknown tasks", () => {
  const matrix = { llm: {}, image: {}, video: {} };
  assert.equal(llmRow("unknown-task", matrix).default, "claude");
  assert.equal(imageRow("unknown-task", matrix).default, "gpt-image");
  assert.equal(videoRow("unknown-task", matrix).default, "higgsfield");
});

test("loadProviderMatrix: falls back to embedded defaults when PROVIDERS.md is missing", () => {
  resetMatrixCache();
  const matrix = loadProviderMatrix("/nonexistent/path/PROVIDERS.md");
  assert.equal(matrix.llm.script.default, "claude");
  assert.equal(matrix.image.carousel.default, "gpt-image");
  resetMatrixCache();
});
