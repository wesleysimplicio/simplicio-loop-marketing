/**
 * reply-loop.ts — community comment monitoring and reply drafting
 * (issue #60). Drafts respectful, technical, engineer-voiced replies for
 * human review; never posts autonomously.
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type CommentClassification =
  | "question"
  | "objection"
  | "bug_report"
  | "pricing_concern"
  | "integration_request"
  | "hostile_reply"
  | "spam"
  | "partnership_lead"
  | "buying_signal";

export type RiskLevel = "low" | "medium" | "high";

export interface IncomingComment {
  source_url: string;
  channel: string;
  author_handle: string;
  text: string;
  piece_id?: string;
}

export interface CommentRecord {
  source_url: string;
  channel: string;
  author_handle: string;
  classification: CommentClassification;
  suggested_response: string;
  risk_level: RiskLevel;
  requires_human_approval: boolean;
  evidence_cited: boolean;
}

const CLASSIFICATION_RULES: Array<[RegExp, CommentClassification]> = [
  [/\b(?:lawsuit|breach|gdpr|security\s+vuln|cve-)\b/i, "objection"],
  [/\b(?:bug|error|crash|exception|broken|doesn'?t\s+work)\b/i, "bug_report"],
  [/\b(?:price|pricing|cost|expensive|cheaper|discount)\b/i, "pricing_concern"],
  [/\b(?:integrate|integration|api|webhook|plugin)\b.*\?/i, "integration_request"],
  [/\b(?:partner|partnership|collab|sponsor)\b/i, "partnership_lead"],
  [/\b(?:sign\s*me\s*up|where\s+do\s+i\s+buy|take\s+my\s+money|how\s+do\s+i\s+start)\b/i, "buying_signal"],
  [/\b(?:scam|garbage|trash|idiot|shut\s+up)\b/i, "hostile_reply"],
  [/\b(?:click\s+here|dm\s+me|check\s+my\s+profile|make\s+\$\d+)\b/i, "spam"],
  [/\?\s*$/, "question"],
];

export function classifyComment(text: string): CommentClassification {
  for (const [pattern, classification] of CLASSIFICATION_RULES) {
    if (pattern.test(text)) return classification;
  }
  return "question";
}

const SENSITIVE_PATTERNS = /\b(?:lawsuit|legal|breach|gdpr|refund|chargeback|security\s+vuln|cve-|data\s+leak)\b/i;

export function riskLevelFor(classification: CommentClassification, text: string): RiskLevel {
  if (SENSITIVE_PATTERNS.test(text)) return "high";
  if (classification === "hostile_reply" || classification === "bug_report") return "medium";
  if (classification === "partnership_lead" || classification === "buying_signal") return "medium";
  return "low";
}

export function requiresHumanApproval(riskLevel: RiskLevel, classification: CommentClassification): boolean {
  if (riskLevel === "high" || riskLevel === "medium") return true;
  if (classification === "spam") return true; // never auto-post to spam, even to refute
  return false;
}

/**
 * Drafts a reply. When `evidence` is provided the draft cites it; when it
 * isn't, the draft says explicitly that evidence is missing rather than
 * inventing a claim — this keeps drafts consistent with the claims-gate
 * discipline used elsewhere in the loop (lib/gate/claims-gate.ts).
 */
export function draftReply(
  comment: IncomingComment,
  classification: CommentClassification,
  evidence?: string,
): { text: string; evidence_cited: boolean } {
  const opening = `Hey @${comment.author_handle}, thanks for the note.`;
  switch (classification) {
    case "bug_report":
      return {
        text: evidence
          ? `${opening} Confirmed — ${evidence}. We're on it; will follow up here once it ships.`
          : `${opening} We haven't been able to reproduce this yet — could you share steps/logs? Don't have evidence to confirm the root cause yet.`,
        evidence_cited: Boolean(evidence),
      };
    case "pricing_concern":
      return {
        text: evidence
          ? `${opening} Fair concern — ${evidence}`
          : `${opening} Fair concern — we don't have a public benchmark to point to yet, so take our pricing claim with that caveat.`,
        evidence_cited: Boolean(evidence),
      };
    case "objection":
      return {
        text: `${opening} This needs a careful, sourced answer — flagging for the team to respond with specifics rather than guessing here.`,
        evidence_cited: false,
      };
    case "hostile_reply":
      return {
        text: `${opening} Understand the frustration. Happy to dig into specifics if you want to share what went wrong.`,
        evidence_cited: false,
      };
    case "spam":
      return {
        text: "",
        evidence_cited: false,
      };
    case "integration_request":
      return {
        text: evidence
          ? `${opening} ${evidence}`
          : `${opening} Not shipped yet — we don't have a timeline to share, but noting the request.`,
        evidence_cited: Boolean(evidence),
      };
    case "partnership_lead":
    case "buying_signal":
      return {
        text: `${opening} Appreciate it — routing this to the team for a direct follow-up.`,
        evidence_cited: false,
      };
    default:
      return {
        text: evidence
          ? `${opening} ${evidence}`
          : `${opening} Good question — we don't have a verified answer documented yet, will confirm and get back to you.`,
        evidence_cited: Boolean(evidence),
      };
  }
}

export function processComment(comment: IncomingComment, evidence?: string): CommentRecord {
  const classification = classifyComment(comment.text);
  const risk_level = riskLevelFor(classification, comment.text);
  const { text, evidence_cited } = draftReply(comment, classification, evidence);
  return {
    source_url: comment.source_url,
    channel: comment.channel,
    author_handle: comment.author_handle,
    classification,
    suggested_response: text,
    risk_level,
    requires_human_approval: requiresHumanApproval(risk_level, classification),
    evidence_cited,
  };
}

function commentsLogPath(root: string): string {
  return resolve(root, "data", "community-comments.jsonl");
}

export function recordComment(root: string, record: CommentRecord): string {
  const path = commentsLogPath(root);
  if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`);
  return path;
}

/**
 * Feeds recurring objections and unanswered questions back into
 * data/learnings.md so future content pieces can address them proactively.
 */
export function recordObjectionLearning(root: string, record: CommentRecord): void {
  if (record.classification !== "objection" && record.classification !== "pricing_concern") return;
  const path = resolve(root, "data", "learnings.md");
  if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
  const line = `- ${new Date().toISOString()} | community-objection | ${record.channel} | ${record.classification}: ${record.source_url}\n`;
  appendFileSync(path, line);
}
