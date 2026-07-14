'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { routeLLM, routeImage, routeVideo, routeLLMFallback, logUsage, runWithFallback } from "../../lib/router.ts";
import { resetMatrixCache } from "../../lib/providers/matrix.ts";

test("routeLLM: an explicit override always wins", () => {
  assert.equal(routeLLM("script", "ollama"), "ollama");
});

test("routeLLM: orchestration honors LLM_DEFAULT env var", () => {
  const prev = process.env.LLM_DEFAULT;
  process.env.LLM_DEFAULT = "codex";
  try {
    assert.equal(routeLLM("orchestration"), "codex");
  } finally {
    if (prev === undefined) delete process.env.LLM_DEFAULT;
    else process.env.LLM_DEFAULT = prev;
  }
});

test("routeLLM: falls back to the matrix default for a known task", () => {
  resetMatrixCache();
  assert.equal(routeLLM("caption"), "deepseek");
});

test("routeLLMFallback: reads the matrix fallback provider", () => {
  resetMatrixCache();
  assert.equal(routeLLMFallback("script"), "codex");
});

test("routeImage/routeVideo: resolve matrix defaults and respect overrides", () => {
  resetMatrixCache();
  assert.equal(routeImage("quote-card"), "gpt-image");
  assert.equal(routeImage("quote-card", "wavespeed"), "wavespeed");
  assert.equal(routeVideo("cinematic-reel"), "higgsfield");
  assert.equal(routeVideo("cinematic-reel", "topview"), "topview");
});

test("logUsage: appends a timestamped JSONL entry to the given path", () => {
  const dir = mkdtempSync(join(tmpdir(), "router-usage-"));
  const path = join(dir, "usage.jsonl");
  try {
    logUsage({ task: "script", provider: "claude", ok: true }, path);
    logUsage({ task: "caption", provider: "deepseek", ok: true }, path);
    const lines = readFileSync(path, "utf8").trim().split("\n");
    assert.equal(lines.length, 2);
    const first = JSON.parse(lines[0]);
    assert.equal(first.task, "script");
    assert.equal(first.provider, "claude");
    assert.ok(typeof first.timestamp === "string");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runWithFallback: returns the primary result without triggering fallback", async () => {
  const dir = mkdtempSync(join(tmpdir(), "router-fallback-"));
  const path = join(dir, "usage.jsonl");
  try {
    const outcome = await runWithFallback({
      task: "script",
      primary: async () => ({ tokens: 10 }),
      primaryName: "claude",
      log_path: path,
    });
    assert.deepEqual(outcome.result, { tokens: 10 });
    assert.equal(outcome.provider_used, "claude");
    assert.equal(outcome.fallback_triggered, false);
    assert.equal(outcome.attempts, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runWithFallback: switches to the fallback provider when the primary keeps failing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "router-fallback-2-"));
  const path = join(dir, "usage.jsonl");
  try {
    const outcome = await runWithFallback({
      task: "script",
      primary: async () => {
        throw new Error("boom: non-retryable");
      },
      fallback: async () => ({ tokens: 5 }),
      primaryName: "claude",
      fallbackName: "codex",
      log_path: path,
      shouldRetry: () => false,
    });
    assert.deepEqual(outcome.result, { tokens: 5 });
    assert.equal(outcome.provider_used, "codex");
    assert.equal(outcome.fallback_triggered, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runWithFallback: throws a combined error when both primary and fallback fail", async () => {
  const dir = mkdtempSync(join(tmpdir(), "router-fallback-3-"));
  const path = join(dir, "usage.jsonl");
  try {
    await assert.rejects(
      runWithFallback({
        task: "script",
        primary: async () => {
          throw new Error("primary down");
        },
        fallback: async () => {
          throw new Error("fallback down");
        },
        primaryName: "claude",
        fallbackName: "codex",
        log_path: path,
        shouldRetry: () => false,
      }),
      /primary \(claude\) failed.*fallback \(codex\) failed/s,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runWithFallback: throws the primary error when no fallback is configured", async () => {
  const dir = mkdtempSync(join(tmpdir(), "router-fallback-4-"));
  const path = join(dir, "usage.jsonl");
  try {
    await assert.rejects(
      runWithFallback({
        task: "script",
        primary: async () => {
          throw new Error("no fallback configured");
        },
        primaryName: "claude",
        log_path: path,
        shouldRetry: () => false,
      }),
      /no fallback configured/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
