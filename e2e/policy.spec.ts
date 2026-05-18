import { test, expect } from "@playwright/test";
import {
  estimateCost,
  estimateTokens,
  TimeoutError,
  withRetry,
} from "../lib/providers/policy";

test("estimateTokens approximates char/4", () => {
  expect(estimateTokens("")).toBe(0);
  expect(estimateTokens("abcd")).toBe(1);
  expect(estimateTokens("a".repeat(400))).toBe(100);
});

test("estimateCost knows claude opus rates", () => {
  const cost = estimateCost({
    provider: "claude",
    model: "opus-4-7",
    tokens_in: 1000,
    tokens_out: 1000,
  });
  expect(cost).toBeCloseTo(0.015 + 0.075, 5);
});

test("estimateCost falls back to provider default model", () => {
  const cost = estimateCost({
    provider: "deepseek",
    tokens_in: 10_000,
    tokens_out: 10_000,
  });
  expect(cost).toBeCloseTo((10 * 0.00014) + (10 * 0.00028), 6);
});

test("withRetry retries once on retryable error", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls === 1) throw new Error("HTTP 500 boom");
      return "ok";
    },
    { retries: 1, backoffMs: 1, timeoutMs: 5000 },
  );
  expect(result).toBe("ok");
  expect(calls).toBe(2);
});

test("withRetry surfaces non-retryable error immediately", async () => {
  let calls = 0;
  await expect(
    withRetry(
      async () => {
        calls++;
        throw new Error("validation failed");
      },
      { retries: 2, backoffMs: 1, timeoutMs: 5000 },
    ),
  ).rejects.toThrow(/validation/);
  expect(calls).toBe(1);
});

test("withRetry honors timeout", async () => {
  let caught: unknown;
  try {
    await withRetry(
      () => new Promise<string>((resolve) => setTimeout(() => resolve("late"), 200)),
      { retries: 0, backoffMs: 1, timeoutMs: 50 },
    );
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(TimeoutError);
});
