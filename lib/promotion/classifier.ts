export interface AnalyticsRow {
  piece_id: string;
  client?: string;
  channel?: string;
  impressions: number;
  reach?: number;
  saves: number;
  shares?: number;
  comments?: number;
  watch_time_s?: number;
  captured_at?: string;
}

export interface PieceStats {
  piece_id: string;
  client?: string;
  channel?: string;
  impressions: number;
  saves: number;
  reach: number;
  watch_time_s: number;
  save_rate: number;
}

export interface Classification {
  winners: PieceStats[];
  losers: PieceStats[];
  skipped: PieceStats[];
  all: PieceStats[];
}

export function classify(
  rows: AnalyticsRow[],
  windowDays = 7,
  minImpressions = 100,
): Classification {
  const cutoff = Date.now() - windowDays * 86400 * 1000;
  const byPiece = new Map<string, AnalyticsRow[]>();
  for (const r of rows) {
    if (r.captured_at) {
      const t = Date.parse(r.captured_at);
      if (Number.isFinite(t) && t < cutoff) continue;
    }
    const list = byPiece.get(r.piece_id) ?? [];
    list.push(r);
    byPiece.set(r.piece_id, list);
  }
  const stats: PieceStats[] = [];
  for (const [piece_id, list] of byPiece) {
    let impressions = 0;
    let saves = 0;
    let reach = 0;
    let watch_time_s = 0;
    const first = list[0];
    for (const r of list) {
      impressions = Math.max(impressions, r.impressions);
      saves = Math.max(saves, r.saves);
      reach = Math.max(reach, r.reach ?? 0);
      watch_time_s = Math.max(watch_time_s, r.watch_time_s ?? 0);
    }
    stats.push({
      piece_id,
      client: first.client,
      channel: first.channel,
      impressions,
      saves,
      reach,
      watch_time_s,
      save_rate: saves / Math.max(impressions, 1),
    });
  }
  const sortable = stats.filter((s) => s.impressions >= minImpressions);
  const skipped = stats.filter((s) => s.impressions < minImpressions);
  sortable.sort((a, b) => b.save_rate - a.save_rate);
  const cut = Math.max(1, Math.ceil(sortable.length * 0.2));
  const winners = sortable.slice(0, cut);
  const losers = sortable.slice(-cut).reverse();
  return { winners, losers, skipped, all: stats };
}
