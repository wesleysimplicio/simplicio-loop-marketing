/**
 * claims-gate.ts — Claims discipline for the marketing loop
 *
 * Every marketing output is tagged with its verification status:
 *   MEASURED  — verified by independent watcher pass
 *   CANON     — sourced from canonical brand/pillar/compliance specs
 *   UNVERIFIED — no verification performed
 *
 * The gate prevents promotion of UNVERIFIED pieces and ensures
 * claims discipline before any paid media spend.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import type { ClaimsTag, WatcherReport } from "./watcher-gate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClaimsGateConfig {
  /** Paths to canonical brand/pillar/voice docs for CANON tagging */
  canonicalPaths?: string[];
  /** Whether to require watcher gate for all pieces (default: true) */
  requireGate?: boolean;
  /** Whether to block UNVERIFIED pieces in promote loop (default: true) */
  blockUnverified?: boolean;
}

export interface ClaimsRule {
  rule_id: string;
  description: string;
  /** If true, matching this rule blocks the piece */
  blocking: boolean;
}

// ---------------------------------------------------------------------------
// Claims rules
// ---------------------------------------------------------------------------

export const CLAIMS_RULES: ClaimsRule[] = [
  {
    rule_id: "claims.unverified.no_promote",
    description: "Pieces tagged UNVERIFIED cannot be promoted to paid media",
    blocking: true,
  },
  {
    rule_id: "claims.watcher_failure_review",
    description: "Pieces with failed watcher checks must route to review",
    blocking: true,
  },
  {
    rule_id: "claims.canonical_requires_source",
    description: "CANON tag requires explicit citation of brand/pillar spec",
    blocking: false,
  },
  {
    rule_id: "claims.measured_requires_report",
    description: "MEASURED tag requires a persisted watcher report",
    blocking: true,
  },
];

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Determine if a piece qualifies for CANON tag.
 * A piece is CANON if every claim in it can be traced back to
 * a canonical brand/pillar/compliance spec.
 *
 * For now, CANON is an opt-in tag set via frontmatter. The function
 * exists so the classification logic is centralized.
 */
export function isCanonPiece(pieceBody: string, _canonicalPaths?: string[]): boolean {
  // A piece with explicit references to brand/pillar sources can be CANON.
  // Currently requires frontmatter: claims_tag: CANON
  // The actual check here validates that the body references canonical sources.
  const hasCanonicalRefs =
    /see\s+(?:brand|pillar|voice|compliance)\s+(?:doc|guide|spec|docs)/i.test(
      pieceBody,
    ) || /sourced?\s+from\s+(?:brand|pillar)/i.test(pieceBody);
  return hasCanonicalRefs;
}

// ---------------------------------------------------------------------------
// Gate enforcement
// ---------------------------------------------------------------------------

export interface GateEnforcementResult {
  piece_id: string;
  tag: ClaimsTag;
  blocked: boolean;
  reasons: string[];
}

/**
 * Enforce claims-gate rules before promotion.
 * Returns a result indicating whether the piece is blocked.
 */
export function enforceClaimsGate(
  pieceId: string,
  report: WatcherReport | null,
  config?: ClaimsGateConfig,
): GateEnforcementResult {
  const requireGate = config?.requireGate ?? true;
  const blockUnverified = config?.blockUnverified ?? true;
  const reasons: string[] = [];

  // No report at all
  if (!report && requireGate) {
    return {
      piece_id: pieceId,
      tag: "UNVERIFIED",
      blocked: true,
      reasons: [
        `Gate: no watcher report found for ${pieceId}`,
        "Rule: claims.unverified.no_promote — UNVERIFIED pieces cannot be promoted",
      ],
    };
  }

  if (!report) {
    // Gate not required, treat as UNVERIFIED but don't block
    return {
      piece_id: pieceId,
      tag: "UNVERIFIED",
      blocked: false,
      reasons: [],
    };
  }

  const tag = report.tag;

  // Block UNVERIFIED
  if (tag === "UNVERIFIED") {
    if (blockUnverified) {
      const failures = report.checked
        .filter((c) => !c.match)
        .map((c) => `${c.channel}: ${c.recomputed}`);
      reasons.push(
        `Gate: ${pieceId} is UNVERIFIED`,
        `Rule: claims.unverified.no_promote — ${failures.length} watcher check(s) failed`,
        ...failures.map((f) => `  - ${f}`),
      );
    }
  }

  // MEASURED requires a report (already satisfied if report exists)
  if (tag === "MEASURED" && !report) {
    reasons.push(
      `Gate: ${pieceId} tagged MEASURED but has no persisted report`,
      "Rule: claims.measured_requires_report",
    );
  }

  return {
    piece_id: pieceId,
    tag,
    blocked: reasons.length > 0 && blockUnverified,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

export function writeGateEnforcement(
  root: string,
  result: GateEnforcementResult,
): string {
  const dir = resolve(root, "data", "gate");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${result.piece_id}.enforcement.json`);
  writeFileSync(path, JSON.stringify(result, null, 2));
  return path;
}

export function readGateEnforcement(
  root: string,
  pieceId: string,
): GateEnforcementResult | null {
  const path = resolve(root, "data", "gate", `${pieceId}.enforcement.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as GateEnforcementResult;
  } catch {
    return null;
  }
}

void dirname;
void join;
