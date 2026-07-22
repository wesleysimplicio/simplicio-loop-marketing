import type { ProviderConstraint } from "./types";

export interface ProviderCapabilities {
  brand_strict: boolean;
  estimated_cost_usd: number;
  estimated_latency_ms: number;
  quality: "low" | "medium" | "high";
}

const QUALITY = { low: 0, medium: 1, high: 2 } as const;

/** Pure predicate used by every creative-provider factory. */
export function satisfiesProviderConstraint(
  capabilities: ProviderCapabilities,
  constraint: ProviderConstraint = {},
): boolean {
  return (!constraint.brand_strict || capabilities.brand_strict) &&
    (constraint.budget_cap_usd === undefined ||
      capabilities.estimated_cost_usd <= constraint.budget_cap_usd) &&
    (constraint.max_latency_ms === undefined ||
      capabilities.estimated_latency_ms <= constraint.max_latency_ms) &&
    (constraint.quality_min === undefined ||
      QUALITY[capabilities.quality] >= QUALITY[constraint.quality_min]);
}

export function selectConstrainedProvider(
  preferred: string,
  available: readonly string[],
  capabilities: Readonly<Record<string, ProviderCapabilities>>,
  constraint?: ProviderConstraint,
): string | undefined {
  const candidates = [preferred, ...available.filter((name) => name !== preferred)];
  return candidates.find((name) => {
    const profile = capabilities[name];
    return profile !== undefined && satisfiesProviderConstraint(profile, constraint);
  });
}
