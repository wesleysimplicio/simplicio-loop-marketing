import { encodingForModel, getEncoding, getEncodingNameForModel, type Tiktoken } from "js-tiktoken";

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

export interface TokenEstimate {
  tokens: number;
  encoding: string;
  fallback_reason?: string;
}

const tokenizerCache = new Map<string, Tiktoken>();

/** Count BPE tokens without retaining or returning the input text. */
export function estimateTokens(
  text: string,
  model?: string,
  tokenizer: (encoding: string, model?: string) => Tiktoken = loadTokenizer,
): number {
  return estimateTokenDetails(text, model, tokenizer).tokens;
}

function loadTokenizer(encoding: string, model?: string): Tiktoken {
  const key = model ? `model:${model}` : `encoding:${encoding}`;
  const cached = tokenizerCache.get(key);
  if (cached) return cached;
  const loaded = model && encoding !== "o200k_base"
    ? encodingForModel(model as Parameters<typeof encodingForModel>[0])
    : getEncoding(encoding as Parameters<typeof getEncoding>[0]);
  tokenizerCache.set(key, loaded);
  return loaded;
}

export function estimateTokenDetails(
  text: string,
  model?: string,
  tokenizer: (encoding: string, model?: string) => Tiktoken = loadTokenizer,
): TokenEstimate {
  if (!text) return { tokens: 0, encoding: resolveEncoding(model).encoding };
  const resolved = resolveEncoding(model);
  try {
    const encoder = tokenizer(resolved.encoding, resolved.exact ? model : undefined);
    return {
      tokens: encoder.encode(text).length,
      encoding: resolved.encoding,
      ...(!resolved.exact && { fallback_reason: "model_encoding_unknown" }),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown";
    return {
      tokens: 0,
      encoding: resolved.encoding,
      fallback_reason: `tokenizer_failed:${reason}`,
    };
  }
}

function resolveEncoding(model?: string): { encoding: string; exact: boolean } {
  if (!model) return { encoding: "o200k_base", exact: false };
  try {
    return {
      encoding: getEncodingNameForModel(model as Parameters<typeof getEncodingNameForModel>[0]),
      exact: true,
    };
  } catch {
    return { encoding: "o200k_base", exact: false };
  }
}

export function resolveUsageWithFallback(input: {
  provider: string;
  model?: string;
  prompt: string;
  output: string;
  tokens_in?: number;
  tokens_out?: number;
  tokenizer?: (encoding: string, model?: string) => Tiktoken;
}): { tokens_in: number; tokens_out: number; used_estimate: boolean; source: "provider" | "tokenizer" | "unavailable"; encoding?: string; fallback_reason?: string } {
  const hasRealUsage =
    input.tokens_in !== undefined && input.tokens_out !== undefined;

  if (hasRealUsage) {
    return {
      tokens_in: input.tokens_in ?? 0,
      tokens_out: input.tokens_out ?? 0,
      used_estimate: false,
      source: "provider",
    };
  }

  const warningKey = `${input.provider}:${input.model ?? "default"}`;
  if (!warnedUsageFallbacks.has(warningKey)) {
    warnedUsageFallbacks.add(warningKey);
    process.stderr.write(
      `[providers/cost] WARN: ${warningKey} response missing usage data; falling back to BPE tokenization\n`,
    );
  }

  const prompt = estimateTokenDetails(input.prompt, input.model, input.tokenizer);
  const output = estimateTokenDetails(input.output, input.model, input.tokenizer);
  const tokenizerFailure = prompt.fallback_reason?.startsWith("tokenizer_failed") || output.fallback_reason?.startsWith("tokenizer_failed");
  return {
    tokens_in: prompt.tokens,
    tokens_out: output.tokens,
    used_estimate: true,
    source: tokenizerFailure ? "unavailable" : "tokenizer",
    encoding: prompt.encoding,
    fallback_reason: tokenizerFailure
      ? prompt.fallback_reason ?? output.fallback_reason
      : `usage_missing:${warningKey}${prompt.fallback_reason ? `:${prompt.fallback_reason}` : ""}`,
  };
}
