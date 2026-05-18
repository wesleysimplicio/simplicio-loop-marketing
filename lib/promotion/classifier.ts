const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MIN_IMPRESSIONS = 100;

export interface AnalyticsRow {
  piece_id: string;
  channel: string;
  platform?: string;
  impressions: number;
  reach?: number;
  saves?: number;
  shares?: number;
  comments?: number;
  likes?: number;
  watch_time_s?: number;
  captured_at: string;
}

export interface PieceStats {
  piece_id: string;
  channel: string;
  platform?: string;
  impressions: number;
  reach: number;
  saves: number;
  shares: number;
  comments: number;
  likes: number;
  watch_time_s: number;
  latest_captured_at: string;
  save_rate: number;
  comment_ratio: number;
  reason?: string;
  skipped_reason?: "insufficient_impressions";
}

export interface ClassifyResult {
  winners: PieceStats[];
  losers: PieceStats[];
  skipped: PieceStats[];
}

function isWithinWindow(capturedAt: string, windowDays: number): boolean {
  const capturedAtMs = new Date(capturedAt).getTime();

  if (Number.isNaN(capturedAtMs)) {
    return false;
  }

  return capturedAtMs >= Date.now() - windowDays * DAY_IN_MS;
}

function toPieceStats(rows: AnalyticsRow[]): PieceStats {
  const latest = rows.reduce((currentLatest, row) => {
    if (new Date(row.captured_at).getTime() > new Date(currentLatest.captured_at).getTime()) {
      return row;
    }
    return currentLatest;
  }, rows[0]!);

  const impressions = rows.reduce((total, row) => total + row.impressions, 0);
  const reach = rows.reduce((total, row) => total + (row.reach ?? 0), 0);
  const saves = rows.reduce((total, row) => total + (row.saves ?? 0), 0);
  const shares = rows.reduce((total, row) => total + (row.shares ?? 0), 0);
  const comments = rows.reduce((total, row) => total + (row.comments ?? 0), 0);
  const likes = rows.reduce((total, row) => total + (row.likes ?? 0), 0);
  const watch_time_s = rows.reduce((total, row) => total + (row.watch_time_s ?? 0), 0);

  return {
    piece_id: latest.piece_id,
    channel: latest.channel,
    platform: latest.platform,
    impressions,
    reach,
    saves,
    shares,
    comments,
    likes,
    watch_time_s,
    latest_captured_at: latest.captured_at,
    save_rate: saves / Math.max(impressions, 1),
    comment_ratio: comments / Math.max(likes, 1),
  };
}

function bySaveRateDescending(a: PieceStats, b: PieceStats): number {
  return b.save_rate - a.save_rate;
}

function buildReason(stats: PieceStats): string {
  const signals: string[] = [];
  const reachRate = stats.reach / Math.max(stats.impressions, 1);
  const watchTimePerImpression = stats.watch_time_s / Math.max(stats.impressions, 1);

  if (watchTimePerImpression < 2) {
    signals.push("weak watch time");
  }

  if (reachRate < 0.4) {
    signals.push("low reach");
  }

  if (stats.comment_ratio > 0.5) {
    signals.push("negative comment ratio");
  }

  if (signals.length === 0) {
    signals.push("weak retention");
  }

  if (signals.length === 1) {
    return `low save rate with ${signals[0]}`;
  }

  if (signals.length === 2) {
    return `low save rate with ${signals[0]} and ${signals[1]}`;
  }

  return `low save rate with ${signals.slice(0, -1).join(", ")}, and ${signals.at(-1)}`;
}

export function classify(rows: AnalyticsRow[], windowDays = 7): ClassifyResult {
  const grouped = new Map<string, AnalyticsRow[]>();

  for (const row of rows) {
    if (!isWithinWindow(row.captured_at, windowDays)) {
      continue;
    }

    const entry = grouped.get(row.piece_id);
    if (entry) {
      entry.push(row);
      continue;
    }

    grouped.set(row.piece_id, [row]);
  }

  const eligible: PieceStats[] = [];
  const skipped: PieceStats[] = [];

  for (const groupRows of grouped.values()) {
    const stats = toPieceStats(groupRows);

    if (stats.impressions < MIN_IMPRESSIONS) {
      skipped.push({
        ...stats,
        skipped_reason: "insufficient_impressions",
      });
      continue;
    }

    eligible.push(stats);
  }

  eligible.sort(bySaveRateDescending);
  skipped.sort(bySaveRateDescending);

  if (eligible.length === 0) {
    return { winners: [], losers: [], skipped };
  }

  const segmentSize = Math.max(1, Math.ceil(eligible.length * 0.2));
  const winners = eligible.slice(0, segmentSize);
  const loserStart = Math.max(segmentSize, eligible.length - segmentSize);
  const losers = eligible.slice(loserStart).map((stats) => ({
    ...stats,
    reason: buildReason(stats),
  }));

  return {
    winners,
    losers,
    skipped,
  };
}
