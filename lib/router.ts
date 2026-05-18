import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ImageTask, LLMTask, VideoTask } from "./providers/types";
import { imageRow, llmRow, loadProviderMatrix, videoRow } from "./providers/matrix";

export function routeLLM(task: LLMTask, override?: string): string {
  if (override) return override;
  if (task === "orchestration") {
    const env_default = process.env.LLM_DEFAULT;
    if (env_default && env_default.length > 0) return env_default;
  }
  return llmRow(task, loadProviderMatrix()).default ?? "claude";
}

export function routeLLMFallback(task: LLMTask): string | undefined {
  const env_fallback = process.env.LLM_FALLBACK;
  const row = llmRow(task, loadProviderMatrix());
  return row.fallback ?? env_fallback;
}

export function routeImage(task: ImageTask, override?: string): string {
  if (override) return override;
  return imageRow(task, loadProviderMatrix()).default ?? "gpt-image";
}

export function routeVideo(task: VideoTask, override?: string): string {
  if (override) return override;
  return videoRow(task, loadProviderMatrix()).default ?? "higgsfield";
}

export interface UsageEntry {
  task: string;
  provider: string;
  tokens?: number;
  cost_usd?: number;
  ok?: boolean;
  error?: string;
  fallback_used?: boolean;
  attempt?: number;
  latency_ms?: number;
}

interface UsageLogLine extends UsageEntry {
  timestamp: string;
}

interface UsageLikeResult {
  tokens?: number;
  cost_usd?: number;
  latency_ms?: number;
  attempt?: number;
}

export function usageLogPath(): string {
  return resolve(process.cwd(), "data", "llm-usage.jsonl");
}

export function logUsage(entry: UsageEntry, override_path?: string): void {
  const log_path = override_path ?? usageLogPath();
  const dir = dirname(log_path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const line: UsageLogLine = {
    timestamp: new Date().toISOString(),
    task: entry.task,
    provider: entry.provider,
    tokens: entry.tokens,
    cost_usd: entry.cost_usd,
    ok: entry.ok,
    error: entry.error,
    fallback_used: entry.fallback_used,
    attempt: entry.attempt,
    latency_ms: entry.latency_ms,
  };
  appendFileSync(log_path, `${JSON.stringify(line)}\n`, { encoding: "utf8" });
}

function usageFromResult(result: unknown, offset: number): Required<Pick<UsageEntry, "attempt">> &
  Pick<UsageEntry, "tokens" | "cost_usd" | "latency_ms"> {
  if (!result || typeof result !== "object") {
    return { attempt: offset + 1 };
  }

  const usage = result as UsageLikeResult;
  const attempt = typeof usage.attempt === "number" && usage.attempt > 0
    ? usage.attempt
    : 1;

  return {
    attempt: offset + attempt,
    tokens: usage.tokens,
    cost_usd: usage.cost_usd,
    latency_ms: usage.latency_ms,
  };
}

export interface FallbackOptions<T> {
  task: string;
  primary: () => Promise<T>;
  fallback?: () => Promise<T>;
  primaryName: string;
  fallbackName?: string;
  log_path?: string;
  retryBackoffMs?: number;
  shouldRetry?: (err: unknown) => boolean;
}

export interface FallbackResult<T> {
  result: T;
  provider_used: string;
  fallback_triggered: boolean;
  attempts: number;
}

function isRetryableFallbackError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /timeout|ECONN|ETIMEDOUT|fetch failed|5\d\d|429/i.test(msg);
}

async function wait(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWithFallback<T>(
  opts: FallbackOptions<T>,
): Promise<FallbackResult<T>> {
  const retryBackoffMs = opts.retryBackoffMs ?? 2000;
  const shouldRetry = opts.shouldRetry ?? isRetryableFallbackError;
  let primaryAttempts = 0;
  let primaryMessage = "";

  while (primaryAttempts < 2) {
    primaryAttempts += 1;
    const t0 = Date.now();
    try {
      const r = await opts.primary();
      const usage = usageFromResult(r, primaryAttempts - 1);
      logUsage(
        {
          task: opts.task,
          provider: opts.primaryName,
          tokens: usage.tokens,
          cost_usd: usage.cost_usd,
          ok: true,
          fallback_used: false,
          attempt: usage.attempt,
          latency_ms: usage.latency_ms ?? (Date.now() - t0),
        },
        opts.log_path,
      );
      return {
        result: r,
        provider_used: opts.primaryName,
        fallback_triggered: false,
        attempts: usage.attempt,
      };
    } catch (err) {
      primaryMessage = err instanceof Error ? err.message : String(err);
      logUsage(
        {
          task: opts.task,
          provider: opts.primaryName,
          ok: false,
          error: primaryMessage,
          fallback_used: false,
          attempt: primaryAttempts,
          latency_ms: Date.now() - t0,
        },
        opts.log_path,
      );
      if (primaryAttempts < 2 && shouldRetry(err)) {
        await wait(retryBackoffMs);
        continue;
      }
      break;
    }
  }

  if (!opts.fallback || !opts.fallbackName) {
    throw new Error(primaryMessage);
  }

  const fallbackAttempt = primaryAttempts + 1;
  const t1 = Date.now();
  try {
    const r = await opts.fallback();
    const usage = usageFromResult(r, primaryAttempts);
    logUsage(
      {
        task: opts.task,
        provider: opts.fallbackName,
        tokens: usage.tokens,
        cost_usd: usage.cost_usd,
        ok: true,
        fallback_used: true,
        attempt: usage.attempt,
        latency_ms: usage.latency_ms ?? (Date.now() - t1),
      },
      opts.log_path,
    );
    return {
      result: r,
      provider_used: opts.fallbackName,
      fallback_triggered: true,
      attempts: usage.attempt,
    };
  } catch (err) {
    const fallbackMessage = err instanceof Error ? err.message : String(err);
    logUsage(
      {
        task: opts.task,
        provider: opts.fallbackName,
        ok: false,
        error: fallbackMessage,
        fallback_used: true,
        attempt: fallbackAttempt,
        latency_ms: Date.now() - t1,
      },
      opts.log_path,
    );
    throw new Error(
      `primary (${opts.primaryName}) failed after ${primaryAttempts} attempt(s): ${primaryMessage}; fallback (${opts.fallbackName}) failed: ${fallbackMessage}`,
    );
  }
}
