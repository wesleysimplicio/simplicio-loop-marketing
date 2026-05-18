import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface UsageRow {
  task?: string;
  provider?: string;
  cost_usd?: number;
}
interface AnalyticsRow {
  piece_id?: string;
  saves?: number;
  watch_time_s?: number;
}
interface RunRow {
  piece_id?: string;
  providers_used?: string[];
  cost_estimate_usd?: number;
}

export interface AbRow {
  task: string;
  provider: string;
  n: number;
  mean_save_rate: number;
  mean_watch_time_s: number;
  mean_cost_usd: number;
  cost_per_save: number;
  low_sample: boolean;
}

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const out: T[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {}
  }
  return out;
}

export function buildReport(root: string): AbRow[] {
  const runs = readJsonl<RunRow>(resolve(root, "data", "runs.jsonl"));
  const analytics = readJsonl<AnalyticsRow>(resolve(root, "data", "analytics.jsonl"));
  const usage = readJsonl<UsageRow>(resolve(root, "data", "llm-usage.jsonl"));
  void usage;

  const pieceProviders = new Map<string, string[]>();
  for (const r of runs) {
    if (r.piece_id && r.providers_used) {
      pieceProviders.set(r.piece_id, r.providers_used);
    }
  }
  const pieceSaves = new Map<string, { saves: number; watch: number; impressions: number }>();
  for (const a of analytics) {
    if (!a.piece_id) continue;
    const cur = pieceSaves.get(a.piece_id) ?? { saves: 0, watch: 0, impressions: 0 };
    cur.saves = Math.max(cur.saves, a.saves ?? 0);
    cur.watch = Math.max(cur.watch, a.watch_time_s ?? 0);
    pieceSaves.set(a.piece_id, cur);
  }
  // (task,provider) buckets
  const bucket = new Map<
    string,
    { n: number; sum_save_rate: number; sum_watch: number; sum_cost: number; sum_saves: number }
  >();
  for (const r of runs) {
    if (!r.piece_id || !r.providers_used) continue;
    const s = pieceSaves.get(r.piece_id);
    if (!s) continue;
    for (const provider of r.providers_used) {
      const key = `script/${provider}`;
      const cur =
        bucket.get(key) ?? {
          n: 0,
          sum_save_rate: 0,
          sum_watch: 0,
          sum_cost: 0,
          sum_saves: 0,
        };
      cur.n += 1;
      cur.sum_save_rate += s.saves / Math.max(s.impressions || 1, 1);
      cur.sum_watch += s.watch;
      cur.sum_cost += r.cost_estimate_usd ?? 0;
      cur.sum_saves += s.saves;
      bucket.set(key, cur);
    }
  }
  const rows: AbRow[] = [];
  for (const [key, v] of bucket) {
    const [task, provider] = key.split("/");
    rows.push({
      task,
      provider,
      n: v.n,
      mean_save_rate: v.sum_save_rate / v.n,
      mean_watch_time_s: v.sum_watch / v.n,
      mean_cost_usd: v.sum_cost / v.n,
      cost_per_save: v.sum_cost / Math.max(v.sum_saves, 1),
      low_sample: v.n < 10,
    });
  }
  rows.sort((a, b) => a.cost_per_save - b.cost_per_save);
  return rows;
}
