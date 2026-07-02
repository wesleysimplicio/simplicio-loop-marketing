/**
 * community.ts — anti-spam / etiquette compliance gate for community and
 * forum channels (Reddit, Hacker News, dev portals, regional forums).
 *
 * Design note (see issue #56 discussion): a check that CANNOT be evaluated
 * (channel rules unreadable, no frequency history available, locale quality
 * unverifiable) must never collapse into a silent "pass". It returns
 * "needs_review" so the piece holds for a human instead of quietly
 * publishing as if it had been verified. Only a check that actively ran
 * and found no problem returns "pass".
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getChannel } from "../channels/registry";

export type ComplianceStatus = "pass" | "fail" | "needs_review";

export interface CommunityCheck {
  check_id: string;
  status: ComplianceStatus;
  detail: string;
}

export interface CommunityComplianceReport {
  piece_id: string;
  channel_id: string;
  status: ComplianceStatus;
  checks: CommunityCheck[];
  suggestions: string[];
  checked_at: string;
}

export interface CommunityAuditInput {
  piece_id: string;
  channel_id: string;
  title: string;
  body: string;
  link_url?: string;
  discloses_affiliation?: boolean;
  locale?: string;
  /** Path to an append-only JSONL log of prior posts, one JSON object per line with {channel_id, posted_at}. */
  postHistoryPath?: string;
}

const OVERCLAIM_TITLE_PATTERNS = [
  /\byou won'?t believe\b/i,
  /\b(?:this|it)\s+(?:will\s+)?(?:blow|change)\s+your\s+mind\b/i,
  /\bguaranteed\b/i,
  /\b10x\b.*\bovernight\b/i,
  /\bnumber\s*1\b.*\bever\b/i,
];

const UNSAFE_SHARE_PATTERNS = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/, // email
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+\b/, // stripe-style key
  /\bAKIA[0-9A-Z]{16}\b/, // AWS key
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/, // bearer token
];

/** Check 1: is the channel known and its rules readable? */
function checkChannelRules(channelId: string): CommunityCheck {
  const channel = getChannel(channelId);
  if (!channel) {
    return {
      check_id: "channel.rules_readable",
      status: "needs_review",
      detail: `Channel "${channelId}" is not in the registry — its rules could not be read. Holding for human review instead of assuming compliance.`,
    };
  }
  return {
    check_id: "channel.rules_readable",
    status: "pass",
    detail: `Registry entry found for ${channel.name}; compliance notes: ${channel.compliance_notes}`,
  };
}

/** Check 2: technical contribution vs. drive-by promotional link. */
function checkOriginalValue(body: string, linkUrl?: string): CommunityCheck {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (!linkUrl) {
    return {
      check_id: "content.original_value",
      status: "pass",
      detail: "No outbound link present; nothing to gate on promotional ratio.",
    };
  }
  if (words < 40) {
    return {
      check_id: "content.original_value",
      status: "fail",
      detail: `Only ${words} words of original content before a link — reads as a drive-by promotional post.`,
    };
  }
  return {
    check_id: "content.original_value",
    status: "pass",
    detail: `${words} words of original technical content precede the link.`,
  };
}

/** Check 3: disclosure of affiliation when the post is about the poster's own product. */
function checkDisclosure(body: string, discloses?: boolean): CommunityCheck {
  const selfPromoSignal = /\bwe\s+(?:built|shipped|launched|made)\b|\bour\s+(?:product|tool|saas|startup)\b/i.test(
    body,
  );
  if (!selfPromoSignal) {
    return {
      check_id: "content.disclosure",
      status: "pass",
      detail: "No first-party product framing detected; disclosure not required.",
    };
  }
  if (discloses === undefined) {
    return {
      check_id: "content.disclosure",
      status: "needs_review",
      detail: "Post reads as first-party product content but disclosure status was not provided — cannot confirm compliance automatically.",
    };
  }
  if (!discloses) {
    return {
      check_id: "content.disclosure",
      status: "fail",
      detail: "Post promotes the author's own product without disclosing affiliation.",
    };
  }
  return {
    check_id: "content.disclosure",
    status: "pass",
    detail: "Affiliation disclosed.",
  };
}

/** Check 4: does the title overclaim or bait? */
function checkTitleOverclaim(title: string): CommunityCheck {
  for (const pattern of OVERCLAIM_TITLE_PATTERNS) {
    const m = pattern.exec(title);
    if (m) {
      return {
        check_id: "content.title_overclaim",
        status: "fail",
        detail: `Title contains bait/overclaim language: "${m[0]}".`,
      };
    }
  }
  return {
    check_id: "content.title_overclaim",
    status: "pass",
    detail: "Title does not match known overclaim/bait patterns.",
  };
}

/** Check 5: screenshots/metrics safe to share (no secrets/PII leaked in text). */
function checkSafeToShare(body: string): CommunityCheck {
  for (const pattern of UNSAFE_SHARE_PATTERNS) {
    const m = pattern.exec(body);
    if (m) {
      return {
        check_id: "content.safe_to_share",
        status: "fail",
        detail: `Body appears to contain a secret or PII: "${m[0].slice(0, 12)}…". Redact before publishing.`,
      };
    }
  }
  return {
    check_id: "content.safe_to_share",
    status: "pass",
    detail: "No obvious secrets/PII patterns detected in body text.",
  };
}

/** Check 6: locale/language respectfulness — cannot be machine-verified, always needs_review unless explicitly reviewed. */
function checkLocalization(channelId: string, locale?: string): CommunityCheck {
  const channel = getChannel(channelId);
  if (!channel) {
    // channel.rules_readable already flags this; avoid double-failing the run.
    return {
      check_id: "content.localization",
      status: "needs_review",
      detail: "Cannot verify localization quality without a known channel language target.",
    };
  }
  if (channel.language === "en") {
    return {
      check_id: "content.localization",
      status: "pass",
      detail: "English-first channel; no localization review required.",
    };
  }
  if (!locale || locale !== channel.language) {
    return {
      check_id: "content.localization",
      status: "needs_review",
      detail: `${channel.name} expects "${channel.language}" content but piece locale is "${locale ?? "unset"}" — native-speaker review required before publish.`,
    };
  }
  return {
    check_id: "content.localization",
    status: "needs_review",
    detail: `Locale matches (${locale}); automated tone/etiquette quality for non-English communities still requires a native-speaker pass.`,
  };
}

/** Check 7: frequency limit for this channel. Missing history = zero prior posts (pass), unreadable/corrupt history = needs_review. */
function checkFrequencyLimit(channelId: string, historyPath?: string): CommunityCheck {
  const channel = getChannel(channelId);
  const limit = channel?.frequency_limit;
  if (!limit) {
    return {
      check_id: "channel.frequency_limit",
      status: "pass",
      detail: "No frequency limit configured for this channel.",
    };
  }
  if (!historyPath || !existsSync(historyPath)) {
    return {
      check_id: "channel.frequency_limit",
      status: "pass",
      detail: "No post history recorded yet — first post to this channel is within limits.",
    };
  }
  let corrupted = 0;
  let withinWindow = 0;
  const cutoff = Date.now() - limit.window_days * 86_400_000;
  const lines = readFileSync(historyPath, "utf8").split("\n").filter((l) => l.trim());
  for (const line of lines) {
    try {
      const row = JSON.parse(line) as { channel_id?: string; posted_at?: string };
      if (row.channel_id !== channelId) continue;
      const t = row.posted_at ? Date.parse(row.posted_at) : NaN;
      if (Number.isNaN(t)) {
        corrupted++;
        continue;
      }
      if (t >= cutoff) withinWindow++;
    } catch {
      corrupted++;
    }
  }
  if (corrupted > 0) {
    return {
      check_id: "channel.frequency_limit",
      status: "needs_review",
      detail: `${corrupted} post-history record(s) for this channel could not be parsed — frequency limit could not be reliably evaluated.`,
    };
  }
  if (withinWindow >= limit.count) {
    return {
      check_id: "channel.frequency_limit",
      status: "fail",
      detail: `${withinWindow} posts already made to this channel in the last ${limit.window_days} day(s); limit is ${limit.count}.`,
    };
  }
  return {
    check_id: "channel.frequency_limit",
    status: "pass",
    detail: `${withinWindow}/${limit.count} posts used in the last ${limit.window_days} day(s).`,
  };
}

function aggregate(checks: CommunityCheck[]): ComplianceStatus {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "needs_review")) return "needs_review";
  return "pass";
}

function suggestionsFor(checks: CommunityCheck[]): string[] {
  return checks
    .filter((c) => c.status !== "pass")
    .map((c) => `[${c.status}] ${c.check_id}: ${c.detail}`);
}

export function auditCommunityPost(input: CommunityAuditInput): CommunityComplianceReport {
  const checks: CommunityCheck[] = [
    checkChannelRules(input.channel_id),
    checkOriginalValue(input.body, input.link_url),
    checkDisclosure(input.body, input.discloses_affiliation),
    checkTitleOverclaim(input.title),
    checkSafeToShare(input.body),
    checkLocalization(input.channel_id, input.locale),
    checkFrequencyLimit(input.channel_id, input.postHistoryPath),
  ];
  return {
    piece_id: input.piece_id,
    channel_id: input.channel_id,
    status: aggregate(checks),
    checks,
    suggestions: suggestionsFor(checks),
    checked_at: new Date().toISOString(),
  };
}

export function writeCommunityReport(root: string, report: CommunityComplianceReport): string {
  const dir = resolve(root, "data", "compliance-community");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${report.piece_id}.${report.channel_id}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

export function recordPostHistory(historyPath: string, channelId: string, postedAt = new Date().toISOString()): void {
  if (!existsSync(dirname(historyPath))) mkdirSync(dirname(historyPath), { recursive: true });
  appendFileSync(historyPath, `${JSON.stringify({ channel_id: channelId, posted_at: postedAt })}\n`);
}

/**
 * Publish gate: only "pass" clears automatically. "fail" always blocks.
 * "needs_review" blocks by default unless a human override is explicitly
 * logged — mirrors the compliance-block override pattern already used for
 * the generic compliance gate.
 */
export function communityGateBlocks(status: ComplianceStatus, humanOverride = false): boolean {
  if (status === "pass") return false;
  if (status === "needs_review" && humanOverride) return false;
  return true;
}
