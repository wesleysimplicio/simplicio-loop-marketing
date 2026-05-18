import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { PieceStats } from "./classifier";

export function reasonForLoss(s: PieceStats): string {
  const reasons: string[] = [];
  if (s.save_rate < 0.01) reasons.push("save_rate < 1%");
  if (
    s.watch_time_s > 0 &&
    s.watch_time_s / Math.max(s.impressions, 1) < 3
  ) {
    reasons.push("low watch time per impression");
  }
  if (s.reach && s.impressions && s.reach / s.impressions < 0.5) {
    reasons.push("reach < 50% of impressions");
  }
  if (reasons.length === 0) reasons.push("weak signal");
  return reasons.join("; ");
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
