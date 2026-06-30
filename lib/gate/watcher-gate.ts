/**
 * watcher-gate.ts — N-Nest style gate verification
 *
 * Every generated output passes through a watcher that independently
 * re-computes key claims and verifies they match what the agent reported.
 *
 * Asolaria N-Nest pattern:
 *   Agent + watcher PID per node.
 *   Gate verifies reported == watcher.recomputed.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClaimsTag = "MEASURED" | "CANON" | "UNVERIFIED";

export interface WatcherReport {
  piece_id: string;
  tag: ClaimsTag;
  passed: boolean;
  checked: WatcherCheck[];
  checked_at: string;
}

export interface WatcherCheck {
  channel: string;
  claimed: string;
  recomputed: string;
  match: boolean;
  severity: "block" | "warn";
}

export interface WatcherInput {
  piece_id: string;
  script: string;
  caption: string;
  brief: string;
  platform: string;
  pillar?: string;
}

export interface ClaimsGateResult {
  piece_id: string;
  tag: ClaimsTag;
  blocked: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Core checks
// ---------------------------------------------------------------------------

/**
 * Run a set of watcher checks on a marketing output.
 * Each check independently recomputes a value and compares to what the agent
 * produced.
 */
export function runWatcherChecks(input: WatcherInput): WatcherCheck[] {
  const checks: WatcherCheck[] = [];

  // 1. Caption has pillar hashtag
  const pillar = input.pillar ?? "general";
  const pillarTag = `#${pillar}`;
  const hasPillarTag = input.caption.includes(pillarTag);
  checks.push({
    channel: "caption.pillar_hashtag",
    claimed: `caption contains #${pillar}`,
    recomputed: hasPillarTag
      ? `found #${pillar} in caption`
      : `#${pillar} not found in caption`,
    match: hasPillarTag,
    severity: "warn",
  });

  // 2. Script contains the brief topic
  const briefWords = input.brief
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const matchCount = briefWords.filter((w) =>
    input.script.toLowerCase().includes(w),
  ).length;
  const topicCoverage =
    briefWords.length > 0 ? matchCount / briefWords.length : 1;
  const topicSufficient = topicCoverage >= 0.3;
  checks.push({
    channel: "script.topic_coverage",
    claimed: `script covers brief topic (>=30% key terms)`,
    recomputed: topicSufficient
      ? `${Math.round(topicCoverage * 100)}% key term coverage`
      : `only ${Math.round(topicCoverage * 100)}% key term coverage`,
    match: topicSufficient,
    severity: "block",
  });

  // 3. Caption length fits platform constraints
  const platformMax: Record<string, number> = {
    instagram: 2200,
    tiktok: 150,
    x: 240,
    linkedin: 3000,
    facebook: 63206,
    youtube: 5000,
  };
  const maxLen = platformMax[input.platform.toLowerCase()] ?? 2200;
  const captionFits = input.caption.length <= maxLen;
  checks.push({
    channel: "caption.length",
    claimed: `caption fits ${input.platform} max (${maxLen})`,
    recomputed: captionFits
      ? `${input.caption.length} chars within ${maxLen} limit`
      : `${input.caption.length} chars exceeds ${maxLen} limit`,
    match: captionFits,
    severity: "block",
  });

  // 4. No placeholder text leaked
  const placeholders = [
    /\[.*?\]/,
    /\bTODO\b/i,
    /\bFIXME\b/i,
    /\bINSERT\b/i,
    /\blorem ipsum\b/i,
  ];
  for (const ph of placeholders) {
    const m = ph.exec(input.script);
    if (m) {
      checks.push({
        channel: "script.placeholder",
        claimed: "no placeholder text in script",
        recomputed: `found placeholder: "${m[0]}"`,
        match: false,
        severity: "block",
      });
      break;
    }
  }
  if (checks.every((c) => c.channel !== "script.placeholder")) {
    checks.push({
      channel: "script.placeholder",
      claimed: "no placeholder text in script",
      recomputed: "no placeholders detected",
      match: true,
      severity: "block",
    });
  }

  // 5. Hard-sell / overpromise language check (claims discipline)
  const overpromisePatterns = [
    /\bguaranteed?\s+(?:results?|success|growth|revenue)\b/i,
    /\balways\s+works\b/i,
    /\b100%\s+(?:guarantee|guaranteed|effective|free)\b/i,
    /\binstant\s+(?:results?|success|growth)\b/i,
  ];
  let foundOverpromise = false;
  for (const op of overpromisePatterns) {
    const m = op.exec(input.script) || op.exec(input.caption);
    if (m) {
      foundOverpromise = true;
      checks.push({
        channel: "claims.overpromise",
        claimed: "no overpromise language",
        recomputed: `found overpromise: "${m[0]}"`,
        match: false,
        severity: "block",
      });
      break;
    }
  }
  if (!foundOverpromise) {
    checks.push({
      channel: "claims.overpromise",
      claimed: "no overpromise language",
      recomputed: "no overpromise patterns detected",
      match: true,
      severity: "block",
    });
  }

  return checks;
}

/**
 * Determine the claims tag based on watcher checks.
 *
 * MEASURED — all block checks pass
 * UNVERIFIED — any block check fails (watcher found discrepancies)
 * CANON — reserved: content sourced from canonical brand/pillar docs
 */
export function determineTag(checks: WatcherCheck[]): {
  tag: ClaimsTag;
  passed: boolean;
} {
  const blocks = checks.filter((c) => c.severity === "block");
  const allBlocksPass = blocks.every((c) => c.match);
  if (allBlocksPass) {
    return { tag: "MEASURED", passed: true };
  }
  return { tag: "UNVERIFIED", passed: false };
}

// ---------------------------------------------------------------------------
// Full watcher gate run
// ---------------------------------------------------------------------------

export function runGate(input: WatcherInput): WatcherReport {
  const checks = runWatcherChecks(input);
  const { tag, passed } = determineTag(checks);
  return {
    piece_id: input.piece_id,
    tag,
    passed,
    checked: checks,
    checked_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function writeWatcherReport(
  root: string,
  report: WatcherReport,
): string {
  const dir = resolve(root, "data", "gate");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${report.piece_id}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

export function readWatcherReport(
  root: string,
  pieceId: string,
): WatcherReport | null {
  const path = resolve(root, "data", "gate", `${pieceId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as WatcherReport;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Promote-time gate check — blocks UNVERIFIED pieces
// ---------------------------------------------------------------------------

export function checkClaimsGate(
  pieceId: string,
  report: WatcherReport | null,
): ClaimsGateResult {
  if (!report) {
    return {
      piece_id: pieceId,
      tag: "UNVERIFIED",
      blocked: true,
      reason: "No watcher report found — gate verification required before promotion",
    };
  }
  if (report.tag === "UNVERIFIED") {
    const failures = report.checked
      .filter((c) => !c.match)
      .map((c) => `  - ${c.channel}: ${c.recomputed}`);
    return {
      piece_id: pieceId,
      tag: "UNVERIFIED",
      blocked: true,
      reason: `Watcher gate failed for ${pieceId}:\n${failures.join("\n")}\n\nFix issues and re-run generate to re-verify.`,
    };
  }
  return {
    piece_id: pieceId,
    tag: report.tag,
    blocked: false,
  };
}

void dirname;
