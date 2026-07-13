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
  tokens_in?: number;
  tokens_out?: number;
  used_estimate?: boolean;
  prompt_format?: "toon" | "json";
  savings_tokens_est?: number;
  cache_status?: "hit" | "enabled" | "not_requested" | "unsupported";
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  fallback_reason?: string;
  piece_id?: string;
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
  tokens_in?: number;
  tokens_out?: number;
  used_estimate?: boolean;
  prompt_format?: "toon" | "json";
  savings_tokens_est?: number;
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
    ...entry,
  };
  appendFileSync(log_path, `${JSON.stringify(line)}\n`, { encoding: "utf8" });
}

function usageFromResult(result: unknown, offset: number): UsageLikeResult & { attempt: number } {
  if (!result || typeof result !== "object") return { attempt: offset + 1 };
  const usage = result as UsageLikeResult;
  const attempt = typeof usage.attempt === "number" && usage.attempt > 0 ? usage.attempt : 1;
  return { ...usage, attempt: offset + attempt };
}

export interface FallbackOptions<T> {
  task: string;
  primary: () => Promise<T>;
  fallback?: () => Promise<T>;
  primaryName: string;
  fallbackName?: string;
  log_path?: string;
  piece_id?: string;
  prompt_format?: "toon" | "json";
  savings_tokens_est?: number;
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
          ...usage,
          tokens: usage.tokens,
          cost_usd: usage.cost_usd,
          ok: true,
          fallback_used: false,
          attempt: usage.attempt,
          latency_ms: usage.latency_ms ?? (Date.now() - t0),
          piece_id: opts.piece_id,
          prompt_format: opts.prompt_format ?? usage.prompt_format,
          savings_tokens_est: usage.savings_tokens_est ?? opts.savings_tokens_est,
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
          fallback_reason: `primary_failed:${primaryMessage.split(":")[0]}`,
          piece_id: opts.piece_id,
          prompt_format: opts.prompt_format,
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
        ...usage,
        tokens: usage.tokens,
        cost_usd: usage.cost_usd,
        ok: true,
        fallback_used: true,
        attempt: usage.attempt,
        latency_ms: usage.latency_ms ?? (Date.now() - t1),
        piece_id: opts.piece_id,
        prompt_format: opts.prompt_format ?? usage.prompt_format,
        savings_tokens_est: usage.savings_tokens_est ?? opts.savings_tokens_est,
        fallback_reason: `primary_failed:${primaryMessage.split(":")[0]}`,
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
        fallback_reason: `primary_failed:${primaryMessage.split(":")[0]}`,
        piece_id: opts.piece_id,
        prompt_format: opts.prompt_format,
      },
      opts.log_path,
    );
    throw new Error(
      `primary (${opts.primaryName}) failed after ${primaryAttempts} attempt(s): ${primaryMessage}; fallback (${opts.fallbackName}) failed: ${fallbackMessage}`,
    );
  }
}
