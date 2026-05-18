import { test, expect } from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  estimateCost,
  estimateTokens,
  resolveUsageWithFallback,
  TimeoutError,
  withRetry,
} from "../lib/providers/policy";
import { CodexProvider, OllamaProvider } from "../lib/providers/llm";
import { runWithFallback } from "../lib/router";

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

test("resolveUsageWithFallback warns and estimates tokens when SDK usage is missing", () => {
  const writes: string[] = [];
  const originalWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: string | Uint8Array) => {
    writes.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    const usage = resolveUsageWithFallback({
      provider: "codex",
      model: "gpt-5.1",
      prompt: "abcd",
      output: "abcdefgh",
    });
    expect(usage.used_estimate).toBe(true);
    expect(usage.tokens_in).toBe(1);
    expect(usage.tokens_out).toBe(2);
    expect(writes.join("")).toContain("missing usage data");
  } finally {
    process.stderr.write = originalWrite;
  }
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

test("CodexProvider retries once on forced 500 and succeeds on retry", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  let calls = 0;

  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) {
      return new Response("boom", { status: 500 });
    }
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "ok" } }],
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const provider = new CodexProvider();
    const result = await provider.generate("hello world", { task: "script" });
    expect(calls).toBe(2);
    expect(result.attempt).toBe(2);
    expect(result.output).toBe("ok");
    expect(result.tokens).toBeGreaterThan(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  }
});

test("OllamaProvider uses OLLAMA_HOST and OLLAMA_MODEL in the local chat request", async () => {
  const originalFetch = globalThis.fetch;
  const originalHost = process.env.OLLAMA_HOST;
  const originalModel = process.env.OLLAMA_MODEL;
  process.env.OLLAMA_HOST = "http://127.0.0.1:22445/";
  process.env.OLLAMA_MODEL = "llama3.3";
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({
        message: { content: "fallback ok" },
        prompt_eval_count: 12,
        eval_count: 7,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const provider = new OllamaProvider();
    const result = await provider.generate("rewrite this", {
      task: "translation",
      system: "You are concise.",
      max_tokens: 77,
      temperature: 0.2,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://127.0.0.1:22445/api/chat");
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream: boolean;
      options: { temperature: number; num_predict: number };
    };
    expect(body.model).toBe("llama3.3");
    expect(body.messages).toEqual([
      { role: "system", content: "You are concise." },
      { role: "user", content: "rewrite this" },
    ]);
    expect(body.stream).toBe(false);
    expect(body.options).toEqual({ temperature: 0.2, num_predict: 77 });
    expect(result.output).toBe("fallback ok");
    expect(result.tokens).toBe(19);
    expect(result.cost_usd).toBe(0);
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalHost === undefined) {
      delete process.env.OLLAMA_HOST;
    } else {
      process.env.OLLAMA_HOST = originalHost;
    }
    if (originalModel === undefined) {
      delete process.env.OLLAMA_MODEL;
    } else {
      process.env.OLLAMA_MODEL = originalModel;
    }
  }
});

test("OllamaProvider surfaces a descriptive unreachable-host error", async () => {
  const originalFetch = globalThis.fetch;
  const originalHost = process.env.OLLAMA_HOST;
  const originalModel = process.env.OLLAMA_MODEL;
  process.env.OLLAMA_HOST = "http://127.0.0.1:33445";
  process.env.OLLAMA_MODEL = "llama3.2";
  let calls = 0;

  globalThis.fetch = (async () => {
    calls += 1;
    throw new TypeError("fetch failed");
  }) as typeof fetch;

  try {
    const provider = new OllamaProvider();
    await expect(
      provider.generate("hello", { task: "caption" }),
    ).rejects.toThrow(/could not reach http:\/\/127\.0\.0\.1:33445\/api\/chat/i);
    expect(calls).toBe(2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalHost === undefined) {
      delete process.env.OLLAMA_HOST;
    } else {
      process.env.OLLAMA_HOST = originalHost;
    }
    if (originalModel === undefined) {
      delete process.env.OLLAMA_MODEL;
    } else {
      process.env.OLLAMA_MODEL = originalModel;
    }
  }
});

test("runWithFallback logs the final provider retry attempt and usage totals", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  let calls = 0;
  const logDir = mkdtempSync(join(tmpdir(), "me-policy-log-"));
  const logPath = join(logDir, "llm-usage.jsonl");

  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) {
      return new Response("boom", { status: 500 });
    }
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "ok" } }],
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const provider = new CodexProvider();
    const result = await runWithFallback({
      task: "script",
      primaryName: "codex",
      log_path: logPath,
      primary: () => provider.generate("hello world", { task: "script" }),
    });

    expect(calls).toBe(2);
    expect(result.attempts).toBe(2);
    const lines = readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(lines).toHaveLength(1);
    expect(lines[0].provider).toBe("codex");
    expect(lines[0].ok).toBe(true);
    expect(lines[0].attempt).toBe(2);
    expect(lines[0].tokens).toBeGreaterThan(0);
    expect(lines[0].cost_usd).toBeGreaterThan(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  }
});
