import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { readPiece } from "../pieces/store";

interface PromoteOptions {
  root: string;
  windowDays?: number;
  outputsDir?: string;
  analyticsPath?: string;
}

interface AnalyticsRow {
  piece_id: string;
  client?: string;
  channel?: string;
  impressions: number;
  reach?: number;
  saves: number;
  shares?: number;
  comments?: number;
  likes?: number;
  watch_time_s?: number;
  captured_at?: string;
}

interface PieceStats {
  piece_id: string;
  client?: string;
  channel?: string;
  impressions: number;
  saves: number;
  reach: number;
  watch_time_s: number;
  save_rate: number;
}

function engineRoot(root: string): string {
  const nested = resolve(root, ".marketing-engine");
  return existsSync(nested) ? nested : root;
}

function piecesRootFor(opts: PromoteOptions): string {
  return resolve(engineRoot(opts.root), "pieces");
}

function dataRootFor(opts: PromoteOptions): string {
  return resolve(engineRoot(opts.root), "data");
}

function outputsRootFor(opts: PromoteOptions): string {
  return opts.outputsDir ?? resolve(engineRoot(opts.root), "outputs");
}

function safeReadPiece(
  pieceId: string,
  opts: PromoteOptions,
): ReturnType<typeof readPiece> | null {
  try {
    return readPiece(pieceId, { piecesDir: piecesRootFor(opts) });
  } catch {
    return null;
  }
}

export function classify(
  rows: AnalyticsRow[],
  windowDays = 7,
): { winners: PieceStats[]; losers: PieceStats[]; skipped: PieceStats[]; all: PieceStats[] } {
  const cutoff = Date.now() - windowDays * 86400_000;
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
    const first = list[0];
    let impressions = 0;
    let saves = 0;
    let reach = 0;
    let watch_time_s = 0;
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
  const sortable = stats.filter((s) => s.impressions >= 100);
  const skipped = stats.filter((s) => s.impressions < 100);
  sortable.sort((a, b) => b.save_rate - a.save_rate);
  const cut = Math.max(1, Math.ceil(sortable.length * 0.2));
  const winners = sortable.slice(0, cut);
  const losers = sortable.slice(-cut).reverse();
  return { winners, losers, skipped, all: stats };
}

export function reasonForLoss(s: PieceStats): string {
  const reasons: string[] = [];
  if (s.save_rate < 0.01) reasons.push("save_rate < 1%");
  if (s.watch_time_s > 0 && s.watch_time_s / Math.max(s.impressions, 1) < 3) {
    reasons.push("short watch_time per impression");
  }
  if (s.reach && s.impressions && s.reach / s.impressions < 0.5) {
    reasons.push("low reach/impressions ratio");
  }
  return reasons.join("; ") || "weak signal";
}

export function appendLearning(
  root: string,
  entry: { date: string; piece_id: string; channel?: string; reason: string },
): void {
  const path = resolve(root, "data", "learnings.md");
  if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
  const line = `- ${entry.date} | ${entry.piece_id} | ${entry.channel ?? "unknown"} | did not perform: ${entry.reason}\n`;
  appendFileSync(path, line, "utf8");
}

function readAnalytics(path: string): AnalyticsRow[] {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  const rows: AnalyticsRow[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as AnalyticsRow);
    } catch {
      continue;
    }
  }
  return rows;
}

export async function runPromoteLoop(opts: PromoteOptions): Promise<{
  promoted: number;
  losers: number;
  skipped: number;
}> {
  process.env.DRY_RUN = process.env.DRY_RUN ?? "true";
  const analyticsPath =
    opts.analyticsPath ?? resolve(dataRootFor(opts), "analytics.jsonl");
  const outputsRoot = outputsRootFor(opts);
  const rows = readAnalytics(analyticsPath);
  const { winners, losers, skipped } = classify(rows, opts.windowDays);
  const today = new Date().toISOString().slice(0, 10);

  for (const w of winners) {
    const piece = safeReadPiece(w.piece_id, opts);
    const pieceMeta = piece?.frontmatter;
    const client = pieceMeta?.client ?? w.client ?? "unknown";
    const dateStr = pieceMeta?.date?.slice(0, 10) ?? today;
    const adsProvider = pieceMeta?.provider_override?.ads ?? "meta-ads";
    const dir = resolve(outputsRoot, client, dateStr, w.piece_id);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const draftPath = join(dir, "ads-draft.json");
    const draft = {
      piece_id: w.piece_id,
      provider: adsProvider,
      campaign_name: `auto-promote-${w.piece_id}`,
      objective: "OUTCOME_ENGAGEMENT",
      audience_hint: w.channel ?? "unknown",
      daily_budget_usd: 10,
      paused: true,
      source_save_rate: w.save_rate,
      generated_at: new Date().toISOString(),
    };
    const finalPath = existsSync(draftPath)
      ? join(dir, `ads-draft.${Date.now()}.json`)
      : draftPath;
    writeFileSync(finalPath, JSON.stringify(draft, null, 2));
    appendFileSync(
      resolve(dataRootFor(opts), "promotions.jsonl"),
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        piece_id: w.piece_id,
        platform: w.channel,
        provider: adsProvider,
        reason: "top-20-by-save-rate",
        meta_ads_draft_path: finalPath,
      })}\n`,
    );
  }

  for (const l of losers) {
    appendLearning(engineRoot(opts.root), {
      date: today,
      piece_id: l.piece_id,
      channel: l.channel,
      reason: reasonForLoss(l),
    });
  }
  return {
    promoted: winners.length,
    losers: losers.length,
    skipped: skipped.length,
  };
}

export async function cliEntry(argv: string[]): Promise<void> {
  const root = process.cwd();
  let windowDays = 7;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--window" && argv[i + 1]) {
      const v = argv[++i];
      windowDays = Number(v.replace(/d$/, ""));
    }
  }
  const r = await runPromoteLoop({ root, windowDays });
  process.stdout.write(
    `promoted: ${r.promoted} | losers: ${r.losers} | skipped: ${r.skipped}\n`,
  );
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`promote failed: ${String(err)}\n`);
    process.exit(1);
  });
}
