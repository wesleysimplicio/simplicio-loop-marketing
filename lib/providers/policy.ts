export interface RetryOptions {
  retries?: number;
  backoffMs?: number;
  timeoutMs?: number;
  isRetryable?: (err: unknown) => boolean;
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`operation timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

function defaultRetryable(err: unknown): boolean {
  if (err instanceof TimeoutError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  if (/timeout|ECONN|ETIMEDOUT|fetch failed|5\d\d|429/i.test(msg)) return true;
  return false;
}

async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race<T>([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 1;
  const backoff = opts.backoffMs ?? 1000;
  const timeout = opts.timeoutMs ?? 60_000;
  const isRetryable = opts.isRetryable ?? defaultRetryable;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn, timeout);
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) break;
      const wait = backoff * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export interface CostInput {
  provider: string;
  model?: string;
  tokens_in: number;
  tokens_out: number;
}

interface RateRow {
  in: number;
  out: number;
}

const PRICING: Record<string, RateRow> = {
  "claude:opus": { in: 0.015, out: 0.075 },
  "claude:sonnet": { in: 0.003, out: 0.015 },
  "claude:haiku": { in: 0.0008, out: 0.004 },
  "claude:default": { in: 0.003, out: 0.015 },
  "codex:default": { in: 0.0025, out: 0.01 },
  "openai:gpt-5.1": { in: 0.0025, out: 0.01 },
  "openai:gpt-5.1-mini": { in: 0.0005, out: 0.002 },
  "openai:default": { in: 0.0025, out: 0.01 },
  "deepseek:chat": { in: 0.00014, out: 0.00028 },
  "deepseek:reasoner": { in: 0.00055, out: 0.0022 },
  "deepseek:default": { in: 0.00014, out: 0.00028 },
  "ollama:default": { in: 0, out: 0 },
};

export function estimateCost(input: CostInput): number {
  const key = input.model
    ? `${input.provider}:${input.model.split("-")[0]}`
    : `${input.provider}:default`;
  const row = PRICING[key] ?? PRICING[`${input.provider}:default`] ?? null;
  if (!row) return 0;
  return (input.tokens_in / 1000) * row.in + (input.tokens_out / 1000) * row.out;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
