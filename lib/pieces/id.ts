export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function formatPieceId(date: Date, seq: number): string {
  const { year, week } = isoWeek(date);
  const ww = String(week).padStart(2, "0");
  const nnn = String(seq).padStart(3, "0");
  return `PIECE-${year}W${ww}-${nnn}`;
}

const _counters = new Map<string, number>();

export function nextPieceId(date: Date = new Date(), seedSeq?: number): string {
  const { year, week } = isoWeek(date);
  const key = `${year}-W${week}`;
  const next = seedSeq ?? (_counters.get(key) ?? 0) + 1;
  _counters.set(key, next);
  return formatPieceId(date, next);
}

export function _resetIdCounters(): void {
  _counters.clear();
}
