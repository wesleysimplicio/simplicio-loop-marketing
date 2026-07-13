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

const BASE_PRICING: Record<string, RateRow> = {
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

const ENV_RATE_OVERRIDES: Partial<Record<string, { in: string; out: string }>> = {
  "deepseek:chat": {
    in: "DEEPSEEK_CHAT_INPUT_USD_PER_1K",
    out: "DEEPSEEK_CHAT_OUTPUT_USD_PER_1K",
  },
  "deepseek:reasoner": {
    in: "DEEPSEEK_REASONER_INPUT_USD_PER_1K",
    out: "DEEPSEEK_REASONER_OUTPUT_USD_PER_1K",
  },
};

const warnedUsageFallbacks = new Set<string>();

function parseOverride(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function pricingKey(provider: string, model?: string): string {
  if (!model) return `${provider}:default`;

  const normalizedProvider = provider.toLowerCase();
  const normalizedModel = model.toLowerCase();

  if (normalizedProvider === "claude") {
    if (normalizedModel.includes("opus")) return "claude:opus";
    if (normalizedModel.includes("sonnet")) return "claude:sonnet";
    if (normalizedModel.includes("haiku")) return "claude:haiku";
  }

  if (normalizedProvider === "deepseek") {
    if (normalizedModel.includes("reasoner")) return "deepseek:reasoner";
    if (normalizedModel.includes("chat")) return "deepseek:chat";
  }

  if (normalizedProvider === "openai") {
    if (normalizedModel.includes("gpt-5.1-mini")) return "openai:gpt-5.1-mini";
    if (normalizedModel.includes("gpt-5.1")) return "openai:gpt-5.1";
  }

  return `${normalizedProvider}:default`;
}

function pricingRow(key: string): RateRow | null {
  const base = BASE_PRICING[key] ?? null;
  if (!base) return null;

  const overrides = ENV_RATE_OVERRIDES[key];
  if (!overrides) return base;

  return {
    in: parseOverride(overrides.in, base.in),
    out: parseOverride(overrides.out, base.out),
  };
}

export function estimateCost(input: CostInput): number {
  const key = pricingKey(input.provider, input.model);
  const row = pricingRow(key) ?? pricingRow(`${input.provider}:default`) ?? null;
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
}): { tokens_in: number; tokens_out: number; used_estimate: boolean; fallback_reason?: string } {
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
    fallback_reason: `usage_missing:${warningKey}`,
  };
}
