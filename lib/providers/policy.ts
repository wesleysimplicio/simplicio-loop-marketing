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

export {
  estimateCost,
  estimateTokens,
  resolveUsageWithFallback,
  type CostInput,
} from "./cost";
