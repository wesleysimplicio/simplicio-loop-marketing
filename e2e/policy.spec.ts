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
import { CodexProvider, DeepSeekProvider, OllamaProvider } from "../lib/providers/llm";
import { runWithFallback } from "../lib/router";

test("estimateTokens counts BPE tokens", () => {
  expect(estimateTokens("")).toBe(0);
  expect(estimateTokens("abcd")).toBe(1);
  expect(estimateTokens("a".repeat(400))).toBeGreaterThan(0);
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

test("estimateCost uses the reasoner pricing tier and honors env overrides", () => {
  const originalIn = process.env.DEEPSEEK_REASONER_INPUT_USD_PER_1K;
  const originalOut = process.env.DEEPSEEK_REASONER_OUTPUT_USD_PER_1K;
  process.env.DEEPSEEK_REASONER_INPUT_USD_PER_1K = "0.001";
  process.env.DEEPSEEK_REASONER_OUTPUT_USD_PER_1K = "0.004";

  try {
    const cost = estimateCost({
      provider: "deepseek",
      model: "deepseek-reasoner",
      tokens_in: 1_000,
      tokens_out: 500,
    });
    expect(cost).toBeCloseTo(0.001 + 0.002, 6);
  } finally {
    if (originalIn === undefined) {
      delete process.env.DEEPSEEK_REASONER_INPUT_USD_PER_1K;
    } else {
      process.env.DEEPSEEK_REASONER_INPUT_USD_PER_1K = originalIn;
    }
    if (originalOut === undefined) {
      delete process.env.DEEPSEEK_REASONER_OUTPUT_USD_PER_1K;
    } else {
      process.env.DEEPSEEK_REASONER_OUTPUT_USD_PER_1K = originalOut;
    }
  }
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
    expect(usage.source).toBe("tokenizer");
    expect(usage.encoding).toBe("o200k_base");
    expect(usage.tokens_in).toBeGreaterThan(0);
    expect(usage.tokens_out).toBeGreaterThan(0);
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

test("DeepSeekProvider uses deepseek-chat for caption and sends the expected request shape", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "deepseek-test-key";
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "short caption" } }],
        usage: { prompt_tokens: 2000, completion_tokens: 500 },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const provider = new DeepSeekProvider();
    const result = await provider.generate("draft a caption", {
      task: "caption",
      system: "Be concise.",
      max_tokens: 88,
      temperature: 0.15,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.deepseek.com/chat/completions");
    expect(calls[0]?.init?.headers).toEqual({
      authorization: "Bearer deepseek-test-key",
      "content-type": "application/json",
    });
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      max_tokens: number;
      temperature: number;
    };
    expect(body.model).toBe("deepseek-chat");
    expect(body.messages).toEqual([
      { role: "system", content: "Be concise." },
      { role: "user", content: "draft a caption" },
    ]);
    expect(body.max_tokens).toBe(88);
    expect(body.temperature).toBe(0.15);
    expect(result.output).toBe("short caption");
    expect(result.tokens).toBe(2500);
    expect(result.cost_usd).toBeCloseTo((2 * 0.00014) + (0.5 * 0.00028), 6);
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = originalKey;
    }
  }
});

test("DeepSeekProvider uses deepseek-reasoner for thinking tasks and retries once", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "deepseek-test-key";
  let calls = 0;
  const bodies: Array<{
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens: number;
    temperature: number;
  }> = [];

  globalThis.fetch = (async (_input, init) => {
    calls += 1;
    bodies.push(JSON.parse(String(init?.body)));
    if (calls === 1) {
      return new Response("retry me", { status: 500 });
    }
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "reasoned answer" } }],
        usage: { prompt_tokens: 1200, completion_tokens: 600 },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const provider = new DeepSeekProvider();
    const result = await provider.generate("review this script", {
      task: "script",
      max_tokens: 144,
      temperature: 0.4,
    });

    expect(calls).toBe(2);
    expect(result.attempt).toBe(2);
    expect(bodies[0]?.model).toBe("deepseek-reasoner");
    expect(bodies[1]?.model).toBe("deepseek-reasoner");
    expect(bodies[1]?.messages).toEqual([{ role: "user", content: "review this script" }]);
    expect(result.output).toBe("reasoned answer");
    expect(result.tokens).toBe(1800);
    expect(result.cost_usd).toBeCloseTo((1.2 * 0.00055) + (0.6 * 0.0022), 6);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = originalKey;
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
