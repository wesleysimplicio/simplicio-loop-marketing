import { createHash } from "node:crypto";

export interface CoreStageContext<T = unknown> {
  run_id: string;
  task_id: string;
  attempt: number;
  fence_token: string;
  tenant_id: string;
  input: T;
  cancelled?: boolean;
}

export interface StageResult<T = unknown> {
  schema: "marketing-stage-result/v1";
  handler: string;
  input_hash: string;
  idempotency_key: string;
  verdict: "pass" | "blocked" | "cancelled";
  output?: T;
  reason?: string;
  metrics: { llm_calls: number; tokens: number | null; cost_usd: number | null; unobserved_reason?: string };
}

export type MarketingHandler<T = unknown, R = unknown> = (context: CoreStageContext<T>) => Promise<StageResult<R>>;

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value, Object.keys((value ?? {}) as object).sort())).digest("hex");
}

export function stageIdentity(handler: string, context: CoreStageContext): { input_hash: string; idempotency_key: string } {
  const input_hash = stableHash({ tenant_id: context.tenant_id, input: context.input });
  return { input_hash, idempotency_key: `${context.run_id}:${context.task_id}:${handler}:${input_hash}` };
}

/** Wrap a small domain operation without assuming who schedules it. */
export function defineHandler<T, R>(handler: string, operation: (input: T) => Promise<R> | R, options: { deterministic: boolean }): MarketingHandler<T, R> {
  return async (context) => {
    const identity = stageIdentity(handler, context);
    if (context.cancelled) return { schema: "marketing-stage-result/v1", handler, ...identity, verdict: "cancelled", reason: "core cancellation observed", metrics: { llm_calls: 0, tokens: null, cost_usd: null, unobserved_reason: "stage not executed" } };
    const output = await operation(context.input);
    return {
      schema: "marketing-stage-result/v1", handler, ...identity, verdict: "pass", output,
      metrics: options.deterministic
        ? { llm_calls: 0, tokens: 0, cost_usd: 0 }
        : { llm_calls: 1, tokens: null, cost_usd: null, unobserved_reason: "provider did not report usage" },
    };
  };
}

export interface EffectAuthority {
  intent: string;
  authorization: string;
  idempotency_key: string;
  fence_token: string;
}

export interface EffectStore<R> {
  get(idempotencyKey: string): Promise<R | undefined>;
  confirm(idempotencyKey: string, fenceToken: string, result: R): Promise<void>;
}

/** Intent → authorization → confirmation. The core owns fences and persistence. */
export async function executeFencedEffect<R>(authority: EffectAuthority, store: EffectStore<R>, effect: () => Promise<R>): Promise<{ result: R; deduplicated: boolean }> {
  if (!authority.intent || !authority.authorization || !authority.idempotency_key || !authority.fence_token) throw new Error("effect-authority-required");
  const prior = await store.get(authority.idempotency_key);
  if (prior !== undefined) return { result: prior, deduplicated: true };
  const result = await effect();
  await store.confirm(authority.idempotency_key, authority.fence_token, result);
  return { result, deduplicated: false };
}

export const deterministicCaptionFormat = defineHandler<{ caption: string; pillar: string }, Record<string, string>>(
  "marketing.caption-format",
  ({ caption, pillar }) => Object.fromEntries(["instagram", "tiktok", "linkedin", "x"].map((platform) => {
    const max = platform === "x" ? 240 : platform === "tiktok" ? 150 : 1500;
    return [platform, `${caption.slice(0, max)} #${pillar}`];
  })),
  { deterministic: true },
);
