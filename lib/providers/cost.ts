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

const warnedUsageFallbacks = new Set<string>();

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

export function resolveUsageWithFallback(input: {
  provider: string;
  model?: string;
  prompt: string;
  output: string;
  tokens_in?: number;
  tokens_out?: number;
}): { tokens_in: number; tokens_out: number; used_estimate: boolean } {
  const hasRealUsage =
    input.tokens_in !== undefined && input.tokens_out !== undefined;

  if (hasRealUsage) {
    return {
      tokens_in: input.tokens_in ?? 0,
      tokens_out: input.tokens_out ?? 0,
      used_estimate: false,
    };
  }

  const warningKey = `${input.provider}:${input.model ?? "default"}`;
  if (!warnedUsageFallbacks.has(warningKey)) {
    warnedUsageFallbacks.add(warningKey);
    process.stderr.write(
      `[providers/cost] WARN: ${warningKey} response missing usage data; falling back to char/4 token estimate\n`,
    );
  }

  return {
    tokens_in: estimateTokens(input.prompt),
    tokens_out: estimateTokens(input.output),
    used_estimate: true,
  };
}
