'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { withRetry, TimeoutError } from "../../lib/providers/policy.ts";

test("withRetry: returns the result on first success without retrying", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("withRetry: retries a retryable error and eventually succeeds", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("ETIMEDOUT while calling provider");
      return "recovered";
    },
    { retries: 3, backoffMs: 1 },
  );
  assert.equal(result, "recovered");
  assert.equal(calls, 3);
});

test("withRetry: exhausts retries and throws the last error", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls += 1;
          throw new Error("500 server error");
        },
        { retries: 2, backoffMs: 1 },
      ),
    /500 server error/,
  );
  assert.equal(calls, 3);
});

test("withRetry: does not retry a non-retryable error", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls += 1;
          throw new Error("validation failed: bad input");
        },
        { retries: 5, backoffMs: 1 },
      ),
    /validation failed/,
  );
  assert.equal(calls, 1);
});

test("withRetry: honors a custom isRetryable predicate", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 2) throw new Error("custom-retryable");
      return "ok";
    },
    { retries: 2, backoffMs: 1, isRetryable: (err) => String(err).includes("custom-retryable") },
  );
  assert.equal(result, "ok");
  assert.equal(calls, 2);
});

test("withRetry: times out a hanging function and treats TimeoutError as retryable", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls === 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "too-late";
      }
      return "fast";
    },
    { retries: 1, backoffMs: 1, timeoutMs: 5 },
  );
  assert.equal(result, "fast");
  assert.equal(calls, 2);
});

test("TimeoutError: carries the timeout duration in its message and name", () => {
  const err = new TimeoutError(1234);
  assert.equal(err.name, "TimeoutError");
  assert.match(err.message, /1234ms/);
});
