import { test, expect } from "@playwright/test";
import {
  parseProvidersMarkdown,
  loadProviderMatrix,
  llmRow,
  imageRow,
  videoRow,
  resetMatrixCache,
} from "../lib/providers/matrix";

test("parses LLM table from PROVIDERS.md markdown", () => {
  const md = `
## LLM Routing

| Task | Default | Fallback | Reason |
|------|---------|----------|--------|
| Caption | deepseek | claude | cheap |
| Script | claude | codex | quality |
`;
  const m = parseProvidersMarkdown(md);
  expect(m.llm.caption?.default).toBe("deepseek");
  expect(m.llm.caption?.fallback).toBe("claude");
  expect(m.llm.script?.default).toBe("claude");
});

test("parses image + video tables", () => {
  const md = `
## Image Routing

| Task | Provider | Reason |
|------|----------|--------|
| Quote card / typography | gpt-image | typo |
| Cinematic / editorial | higgsfield | cinema |

## Video Routing

| Task | Provider | Reason |
|------|----------|--------|
| Cinematic reel | higgsfield | seedance |
`;
  const m = parseProvidersMarkdown(md);
  expect(m.image["quote-card"]?.default).toBe("gpt-image");
  expect(m.image["cinematic"]?.default).toBe("higgsfield");
  expect(m.video["cinematic-reel"]?.default).toBe("higgsfield");
});

test("loads matrix from .specs/architecture/PROVIDERS.md without throwing", () => {
  resetMatrixCache();
  const m = loadProviderMatrix();
  expect(m.llm.caption?.default).toBe("deepseek");
  expect(m.image["quote-card"]?.default).toBe("gpt-image");
  expect(m.video["cinematic-reel"]?.default).toBe("higgsfield");
});

test("lookup helpers fall back to safe defaults on unknown task", () => {
  resetMatrixCache();
  expect(llmRow("unknown" as never).default).toBe("claude");
  expect(imageRow("unknown" as never).default).toBe("gpt-image");
  expect(videoRow("unknown" as never).default).toBe("higgsfield");
});
