import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface UsageRow {
  timestamp?: string;
  task?: string;
  provider?: string;
  tokens?: number;
  cost_usd?: number;
  ok?: boolean;
  latency_ms?: number;
  source?: "provider" | "tokenizer" | "unavailable";
  correlation_id?: string;
  campaign_id?: string;
  cache_read_input_tokens?: number;
}

export interface GenerationCostSummary {
  correlation_id: string;
  campaign_id?: string;
  currency: "USD";
  predicted_tokens: number;
  actual_tokens: number;
  unavailable_calls: number;
  cache_reuse_tokens: number;
  cost_usd: number;
}

/** Reconcile estimates and provider usage without reading or returning prompts. */
export function reconcileGenerationCosts(rows: UsageRow[]): GenerationCostSummary[] {
  const groups = new Map<string, GenerationCostSummary>();
  for (const row of rows) {
    const id = row.correlation_id ?? row.campaign_id ?? "unattributed";
    const summary = groups.get(id) ?? {
      correlation_id: id,
      ...(row.campaign_id && { campaign_id: row.campaign_id }),
      currency: "USD" as const,
      predicted_tokens: 0,
      actual_tokens: 0,
      unavailable_calls: 0,
      cache_reuse_tokens: 0,
      cost_usd: 0,
    };
    if (row.source === "provider") summary.actual_tokens += row.tokens ?? 0;
    else if (row.source === "tokenizer") summary.predicted_tokens += row.tokens ?? 0;
    else if (row.source === "unavailable") summary.unavailable_calls += 1;
    summary.cache_reuse_tokens += row.cache_read_input_tokens ?? 0;
    summary.cost_usd += row.cost_usd ?? 0;
    groups.set(id, summary);
  }
  return [...groups.values()];
}

export interface CostSummary {
  total_cost_usd: number;
  total_calls: number;
  by_provider: Record<
    string,
    { calls: number; tokens: number; cost: number; mean_latency_ms: number }
  >;
  by_task: Record<
    string,
    { calls: number; tokens: number; cost: number; mean_latency_ms: number }
  >;
  by_provider_task: Record<
    string,
    { calls: number; tokens: number; cost: number; mean_latency_ms: number }
  >;
  daily: Record<string, number>;
}

export function readUsage(path: string): UsageRow[] {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  const out: UsageRow[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as UsageRow);
    } catch {}
  }
  return out;
}

export function summarize(rows: UsageRow[]): CostSummary {
  const summary: CostSummary = {
    total_cost_usd: 0,
    total_calls: 0,
    by_provider: {},
    by_task: {},
    by_provider_task: {},
    daily: {},
  };
  function bump(
    bucket: Record<string, { calls: number; tokens: number; cost: number; mean_latency_ms: number }>,
    key: string,
    r: UsageRow,
  ): void {
    const cur =
      bucket[key] ?? { calls: 0, tokens: 0, cost: 0, mean_latency_ms: 0 };
    const n = cur.calls + 1;
    cur.mean_latency_ms =
      (cur.mean_latency_ms * cur.calls + (r.latency_ms ?? 0)) / n;
    cur.calls = n;
    cur.tokens += r.tokens ?? 0;
    cur.cost += r.cost_usd ?? 0;
    bucket[key] = cur;
  }
  for (const r of rows) {
    summary.total_cost_usd += r.cost_usd ?? 0;
    summary.total_calls += 1;
    const provider = r.provider ?? "unknown";
    const task = r.task ?? "unknown";
    bump(summary.by_provider, provider, r);
    bump(summary.by_task, task, r);
    bump(summary.by_provider_task, `${provider}/${task}`, r);
    if (r.timestamp) {
      const day = r.timestamp.slice(0, 10);
      summary.daily[day] = (summary.daily[day] ?? 0) + (r.cost_usd ?? 0);
    }
  }
  return summary;
}

export function filterWindow(
  rows: UsageRow[],
  windowDays: number,
  sinceIso?: string,
): UsageRow[] {
  let cutoff: number;
  if (sinceIso) {
    cutoff = Date.parse(sinceIso);
  } else {
    cutoff = Date.now() - windowDays * 86400 * 1000;
  }
  return rows.filter((r) => {
    if (!r.timestamp) return true;
    const t = Date.parse(r.timestamp);
    if (!Number.isFinite(t)) return true;
    return t >= cutoff;
  });
}

export function renderHtml(summary: CostSummary, title = "Cost report"): string {
  const days = Object.keys(summary.daily).sort();
  const maxDaily = Math.max(0.0001, ...Object.values(summary.daily));
  const sparkPoints = days
    .map((d, i) => {
      const x = (i / Math.max(1, days.length - 1)) * 600;
      const y = 100 - (summary.daily[d] / maxDaily) * 90;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const providerRows = Object.entries(summary.by_provider)
    .sort((a, b) => b[1].cost - a[1].cost)
    .map(
      ([p, v]) =>
        `<tr><td>${p}</td><td>${v.calls}</td><td>${v.tokens}</td><td>$${v.cost.toFixed(4)}</td></tr>`,
    )
    .join("");
  const taskRows = Object.entries(summary.by_task)
    .sort((a, b) => b[1].cost - a[1].cost)
    .map(
      ([t, v]) =>
        `<tr><td>${t}</td><td>${v.calls}</td><td>$${v.cost.toFixed(4)}</td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 800px; margin: 2rem auto; color: #222; }
h1 { font-size: 1.4rem; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
td, th { border: 1px solid #ddd; padding: 4px 8px; font-size: 0.9rem; }
.total { font-size: 1.6rem; font-weight: bold; }
svg { display: block; margin: 1rem 0; }
</style></head><body>
<h1>${title}</h1>
<p class="total">$${summary.total_cost_usd.toFixed(4)} <small>(${summary.total_calls} calls)</small></p>
<svg viewBox="0 0 600 110" width="600" height="110"><polyline fill="none" stroke="#3a6df0" stroke-width="2" points="${sparkPoints}" /></svg>
<h2>By provider</h2>
<table><tr><th>Provider</th><th>Calls</th><th>Tokens</th><th>Cost</th></tr>${providerRows}</table>
<h2>By task</h2>
<table><tr><th>Task</th><th>Calls</th><th>Cost</th></tr>${taskRows}</table>
</body></html>`;
}

export function writeReport(
  path: string,
  summary: CostSummary,
  title?: string,
): void {
  writeFileSync(path, renderHtml(summary, title), "utf8");
}

export function usageLogPath(root?: string): string {
  return resolve(root ?? process.cwd(), "data", "llm-usage.jsonl");
}
