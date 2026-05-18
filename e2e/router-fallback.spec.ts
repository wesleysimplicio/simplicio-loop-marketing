import { test, expect } from "@playwright/test";
import { mkdtempSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runWithFallback } from "../lib/router";

test("runWithFallback returns primary success and logs ok=true", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "me-fallback-"));
  const log = join(tmp, "usage.jsonl");
  const r = await runWithFallback({
    task: "test-task",
    primaryName: "primary",
    fallbackName: "fb",
    primary: async () => "primary-result",
    fallback: async () => "fb-result",
    log_path: log,
  });
  expect(r.result).toBe("primary-result");
  expect(r.provider_used).toBe("primary");
  expect(r.fallback_triggered).toBe(false);
  const lines = readFileSync(log, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  expect(lines).toHaveLength(1);
  expect(lines[0].ok).toBe(true);
});

test("runWithFallback triggers fallback on primary error and logs both", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "me-fallback-"));
  const log = join(tmp, "usage.jsonl");
  const r = await runWithFallback({
    task: "test-task",
    primaryName: "primary",
    fallbackName: "fb",
    primary: async () => {
      throw new Error("synthetic primary fail");
    },
    fallback: async () => "fb-result",
    log_path: log,
  });
  expect(r.result).toBe("fb-result");
  expect(r.fallback_triggered).toBe(true);
  expect(r.attempts).toBe(2);
  const lines = readFileSync(log, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  expect(lines).toHaveLength(2);
  expect(lines[0].ok).toBe(false);
  expect(lines[0].provider).toBe("primary");
  expect(lines[1].ok).toBe(true);
  expect(lines[1].fallback_used).toBe(true);
  expect(lines[1].provider).toBe("fb");
});

test("runWithFallback retries primary once for retryable errors before fallback", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "me-fallback-retry-"));
  const log = join(tmp, "usage.jsonl");
  let primaryAttempts = 0;
  const r = await runWithFallback({
    task: "test-task",
    primaryName: "primary",
    fallbackName: "fb",
    retryBackoffMs: 0,
    primary: async () => {
      primaryAttempts += 1;
      throw new Error("HTTP 503 synthetic primary fail");
    },
    fallback: async () => "fb-result",
    log_path: log,
  });
  expect(primaryAttempts).toBe(2);
  expect(r.result).toBe("fb-result");
  expect(r.fallback_triggered).toBe(true);
  expect(r.attempts).toBe(3);
  const lines = readFileSync(log, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  expect(lines).toHaveLength(3);
  expect(lines[0].provider).toBe("primary");
  expect(lines[0].attempt).toBe(1);
  expect(lines[1].provider).toBe("primary");
  expect(lines[1].attempt).toBe(2);
  expect(lines[2].provider).toBe("fb");
  expect(lines[2].attempt).toBe(3);
  expect(lines[2].fallback_used).toBe(true);
});

test("runWithFallback re-throws when both primary and fallback fail", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "me-fallback-"));
  const log = join(tmp, "usage.jsonl");
  let caught: Error | null = null;
  try {
    await runWithFallback({
      task: "test-task",
      primaryName: "primary",
      fallbackName: "fb",
      primary: async () => {
        throw new Error("primary boom");
      },
      fallback: async () => {
        throw new Error("fb boom");
      },
      log_path: log,
    });
  } catch (err) {
    caught = err as Error;
  }
  expect(caught).toBeTruthy();
  expect(caught?.message).toContain("primary");
  expect(caught?.message).toContain("fb");
  if (existsSync(log)) {
    const lines = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines).toHaveLength(2);
    expect(lines.every((l) => l.ok === false)).toBe(true);
    unlinkSync(log);
  }
});

test("runWithFallback without fallback re-throws primary error", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "me-fallback-"));
  const log = join(tmp, "usage.jsonl");
  let caught: Error | null = null;
  try {
    await runWithFallback({
      task: "no-fb",
      primaryName: "primary",
      primary: async () => {
        throw new Error("alone");
      },
      log_path: log,
    });
  } catch (err) {
    caught = err as Error;
  }
  expect(caught?.message).toContain("alone");
});
