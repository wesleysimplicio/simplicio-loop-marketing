export type LLMTask =
  | "orchestration"
  | "code"
  | "caption"
  | "script"
  | "compliance"
  | "translation"
  | "humanization";

export type ImageTask =
  | "quote-card"
  | "ugc-ad"
  | "cinematic"
  | "carousel"
  | "batch-ab"
  | "inpaint"
  | "face-swap"
  | "before-after";

export type VideoTask =
  | "cinematic-reel"
  | "motion-control"
  | "ugc-product"
  | "product-demo"
  | "talking-head"
  | "batch-hooks"
  | "motion-typography"
  | "data-viz-reel"
  | "programmatic-short";

export interface GenerationResult<T = string> {
  ok: boolean;
  provider: string;
  task: string;
  output?: T;
  error?: string;
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

export interface ProviderConstraint {
  brand_strict?: boolean;
  budget_cap_usd?: number;
  max_latency_ms?: number;
  quality_min?: "low" | "medium" | "high";
}
