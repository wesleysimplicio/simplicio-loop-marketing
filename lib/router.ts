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

export interface FallbackOptions<T> {
  task: string;
  primary: () => Promise<T>;
  fallback?: () => Promise<T>;
  primaryName: string;
  fallbackName?: string;
  log_path?: string;
}

export interface FallbackResult<T> {
  result: T;
  provider_used: string;
  fallback_triggered: boolean;
  attempts: number;
}

export async function runWithFallback<T>(
  opts: FallbackOptions<T>,
): Promise<FallbackResult<T>> {
  const t0 = Date.now();
  try {
    const r = await opts.primary();
    logUsage(
      {
        task: opts.task,
        provider: opts.primaryName,
        ok: true,
        fallback_used: false,
        attempt: 1,
        latency_ms: Date.now() - t0,
      },
      opts.log_path,
    );
    return {
      result: r,
      provider_used: opts.primaryName,
      fallback_triggered: false,
      attempts: 1,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logUsage(
      {
        task: opts.task,
        provider: opts.primaryName,
        ok: false,
        error: msg,
        fallback_used: false,
        attempt: 1,
        latency_ms: Date.now() - t0,
      },
      opts.log_path,
    );
    if (!opts.fallback || !opts.fallbackName) {
      throw err;
    }
    const t1 = Date.now();
    try {
      const r = await opts.fallback();
      logUsage(
        {
          task: opts.task,
          provider: opts.fallbackName,
          ok: true,
          fallback_used: true,
          attempt: 2,
          latency_ms: Date.now() - t1,
        },
        opts.log_path,
      );
      return {
        result: r,
        provider_used: opts.fallbackName,
        fallback_triggered: true,
        attempts: 2,
      };
    } catch (err2) {
      const msg2 = err2 instanceof Error ? err2.message : String(err2);
      logUsage(
        {
          task: opts.task,
          provider: opts.fallbackName,
          ok: false,
          error: msg2,
          fallback_used: true,
          attempt: 2,
          latency_ms: Date.now() - t1,
        },
        opts.log_path,
      );
      throw new Error(
        `primary (${opts.primaryName}) failed: ${msg}; fallback (${opts.fallbackName}) failed: ${msg2}`,
      );
    }
  }
}
