/**
 * gate.ts — Prototype-First gate orchestrator (issue #96).
 *
 *   brief -> N storyboard/copy candidates (local, no provider calls)
 *         -> brand-voice + humanizer + compliance judges (reused, not
 *            reimplemented — lib/skills/brand-voice.ts, lib/skills/humanizer.ts,
 *            lib/compliance/generic.ts)
 *         -> diversity check
 *         -> dry-run publish/ads simulation (zero real network calls)
 *         -> independent judge -> ACCEPT | REVISE | REJECT
 *
 * Hard rules (issue #96 acceptance criteria):
 *  - DRY_RUN cannot be flipped by a candidate/prototype payload. The gate
 *    never reads a DRY_RUN-shaped field from candidate/brief input; it is
 *    scanned for ONLY to detect and reject a tamper attempt. The real
 *    DRY_RUN flag (process.env.DRY_RUN) is never written by this module.
 *  - The dry-run publish/ads simulation (`simulateDryRunPublish`) makes zero
 *    real provider/network calls — it contains no `fetch`/`http` call at
 *    all, so this holds structurally, not just by convention.
 *  - REJECT is logged with reason and zero spend/publish occurs
 *    (`spend_usd` is always the literal 0).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { scoreBrandVoice, type BrandSpec } from "../skills/brand-voice";
import { humanizeSync } from "../skills/humanizer";
import { auditSync } from "../compliance/generic";
import { emitEvent } from "../observability/events";
import { generateCandidates, assessDiversity } from "./candidates";
import {
  PROTOTYPE_GATE_SCHEMA,
  type CandidateEvaluation,
  type DryRunSimulation,
  type PrototypeBriefInput,
  type PrototypeCandidate,
  type PrototypeGateResult,
  type PrototypeVerdict,
} from "./types";

/** Keys that look like an attempt to override the DRY_RUN safety flag from candidate/brief content. */
const TAMPER_KEY_RE = /dry[_-]?run|force[_-]?live|allow[_-]?spend|skip[_-]?gate/i;
const SENSITIVE_RE = /(?:sk-[a-z0-9_-]{12,}|api[_-]?key\s*[:=]|bearer\s+[a-z0-9._-]{12,}|\b\d{3}-\d{2}-\d{4}\b|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b)/i;

export interface SanitizedBrief {
  brief: PrototypeBriefInput;
  tamper_detected: boolean;
  tamper_reasons: string[];
}

function deepScanForTamperKeys(value: unknown, path: string, hits: string[]): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => deepScanForTamperKeys(v, `${path}[${i}]`, hits));
    return;
  }
  if (typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (TAMPER_KEY_RE.test(key)) {
        hits.push(`${path}.${key}`);
      }
      deepScanForTamperKeys(v, `${path}.${key}`, hits);
    }
  }
}

/**
 * Strip an untrusted/candidate-supplied brief down to the known-safe shape
 * before it ever influences the pipeline. Any key that looks like an attempt
 * to override the safety posture (DRY_RUN, force-live, allow-spend,
 * skip-gate) is detected and reported — never honored, regardless of value.
 */
export function sanitizeBriefInput(raw: unknown): SanitizedBrief {
  const tamperHits: string[] = [];
  deepScanForTamperKeys(raw, "$", tamperHits);

  const input = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  const brief: PrototypeBriefInput = {
    piece_id: typeof input.piece_id === "string" ? input.piece_id : "PIECE-prototype-unknown",
    client: typeof input.client === "string" ? input.client : "unknown-client",
    channel: typeof input.channel === "string" ? input.channel : "instagram",
    brief: typeof input.brief === "string" ? input.brief : "",
    pillar: typeof input.pillar === "string" ? input.pillar : undefined,
    vertical: typeof input.vertical === "string" ? input.vertical : undefined,
    variant_count: typeof input.variant_count === "number" ? input.variant_count : undefined,
    before_after_disclaimer:
      typeof input.before_after_disclaimer === "boolean" ? input.before_after_disclaimer : undefined,
    campaign_id: typeof input.campaign_id === "string" ? input.campaign_id : undefined,
    evidence: Array.isArray(input.evidence) ? input.evidence.filter((v): v is string => typeof v === "string") : undefined,
    evidence_required: input.evidence_required === true,
    brand_version: typeof input.brand_version === "string" ? input.brand_version : undefined,
    offer_version: typeof input.offer_version === "string" ? input.offer_version : undefined,
    policy_version: typeof input.policy_version === "string" ? input.policy_version : undefined,
    source_version: typeof input.source_version === "string" ? input.source_version : undefined,
    scheduled_at: typeof input.scheduled_at === "string" ? input.scheduled_at : undefined,
    calendar_conflicts: Array.isArray(input.calendar_conflicts) ? input.calendar_conflicts.filter((v): v is string => typeof v === "string") : undefined,
    audience: typeof input.audience === "string" ? input.audience : undefined,
    daily_budget_usd: typeof input.daily_budget_usd === "number" ? input.daily_budget_usd : undefined,
    spend_ceiling_usd: typeof input.spend_ceiling_usd === "number" ? input.spend_ceiling_usd : undefined,
  };

  return {
    brief,
    tamper_detected: tamperHits.length > 0,
    tamper_reasons:
      tamperHits.length > 0
        ? [`rejected ${tamperHits.length} disallowed override key(s) in candidate/brief payload: ${tamperHits.join(", ")}`]
        : [],
  };
}

export function evaluateCandidate(
  candidate: PrototypeCandidate,
  brief: PrototypeBriefInput,
  brandSpec?: BrandSpec,
): CandidateEvaluation {
  const brand_voice = scoreBrandVoice(candidate.copy, brandSpec);
  const humanized = humanizeSync(candidate.copy);
  const compliance = auditSync({
    piece_id: candidate.candidate_id,
    text: `${candidate.copy}\n${candidate.caption}`,
    vertical: brief.vertical,
    before_after_disclaimer: brief.before_after_disclaimer,
  });
  const reasons: string[] = [];
  if (!compliance.pass) {
    reasons.push(
      `compliance blocked: ${compliance.violations.map((v) => v.rule_id).join(", ")}`,
    );
  }
  const brand_pass = brand_voice.notes.length === 0;
  if (!brand_pass) reasons.push(`brand blocked: ${brand_voice.notes.join(", ")}`);
  const humanization_pass = humanized.ai_tells_remaining === 0;
  if (!humanization_pass) reasons.push("humanization left AI-writing tells");
  const technicalReasons: string[] = [];
  const image = candidate.mock_creative?.image;
  const video = candidate.mock_creative?.video;
  if (image && (image.width < 1080 || image.height < 1080)) technicalReasons.push("mock image below 1080x1080");
  if (video && (video.width !== 1080 || video.height !== 1920 || video.duration_s > 90)) technicalReasons.push("mock video violates vertical platform specs");
  const evidence_pass = brief.evidence_required !== true || Boolean(brief.evidence?.length);
  if (!evidence_pass) reasons.push("missing required evidence; no claim may be fabricated");
  const security_pass = !SENSITIVE_RE.test(JSON.stringify(candidate)) && !SENSITIVE_RE.test(JSON.stringify(brief));
  if (!security_pass) reasons.push("secret or PII pattern detected");
  return {
    candidate_id: candidate.candidate_id,
    brand_voice,
    humanized,
    compliance,
    brand_pass,
    humanization_pass,
    technical_specs: { pass: technicalReasons.length === 0, reasons: technicalReasons },
    evidence_pass,
    security_pass,
    diversity_key: `${candidate.angle}::${candidate.hook}`,
    eligible: compliance.pass && brand_pass && humanization_pass && technicalReasons.length === 0 && evidence_pass && security_pass,
    reasons,
  };
}

/**
 * Dry-run publish/ads simulation. Deliberately contains no `fetch`/`http`
 * call and touches no provider client — it is structurally incapable of a
 * real network call, independent of any env flag. A candidate blocked by the
 * compliance judge never reaches a "would-publish" state.
 */
export function simulateDryRunPublish(
  candidate: PrototypeCandidate,
  eligible: boolean,
  client: string,
  brief?: PrototypeBriefInput,
): DryRunSimulation {
  if (!eligible) {
    return {
      candidate_id: candidate.candidate_id,
      ok: false,
      reason: "blocked by compliance judge — publish/ads simulation not attempted",
    };
  }
  const conflicts = brief?.calendar_conflicts ?? [];
  const requested = Math.max(0, brief?.daily_budget_usd ?? 0);
  const ceiling = Math.max(0, brief?.spend_ceiling_usd ?? 0);
  const budgetPass = requested <= ceiling;
  if (conflicts.length > 0 || !budgetPass) return {
    candidate_id: candidate.candidate_id,
    ok: false,
    reason: conflicts.length > 0 ? "calendar conflict" : "budget exceeds prototype ceiling",
    budget: { requested_usd: requested, ceiling_usd: ceiling, pass: budgetPass },
    calendar: { pass: conflicts.length === 0, conflicts },
  };
  return {
    candidate_id: candidate.candidate_id,
    ok: true,
    simulated_draft_url: `https://prototype-sim.test/${client}/${candidate.candidate_id}`,
    publish_payload: { channel: brief?.channel ?? "unknown", scheduled_at: brief?.scheduled_at ?? null, caption: candidate.caption },
    budget: { requested_usd: requested, ceiling_usd: ceiling, pass: true },
    calendar: { pass: true, conflicts: [] },
  };
}

function pickWinner(
  candidates: PrototypeCandidate[],
  evaluations: CandidateEvaluation[],
): string | undefined {
  const eligible = evaluations.filter((e) => e.eligible);
  if (eligible.length === 0) return undefined;
  const best = eligible.reduce((a, b) => (b.brand_voice.score > a.brand_voice.score ? b : a));
  return candidates.find((c) => c.candidate_id === best.candidate_id)?.candidate_id;
}

export interface RunPrototypeGateOptions {
  root?: string;
  variantCount?: number;
  brandSpec?: BrandSpec;
  diversityThreshold?: number;
}

/** The full Prototype-First pipeline: brief in -> ACCEPT/REVISE/REJECT out. */
export function runPrototypeGate(
  rawBrief: unknown,
  opts: RunPrototypeGateOptions = {},
): PrototypeGateResult {
  const { brief, tamper_detected, tamper_reasons } = sanitizeBriefInput(rawBrief);
  const candidates = generateCandidates(brief, opts.variantCount ?? brief.variant_count);
  const evaluations = candidates.map((c) => evaluateCandidate(c, brief, opts.brandSpec));
  // Diversity is judged on the hook + storyboard (the parts that actually
  // vary by narrative angle), not the full copy — the copy always folds in
  // the same verbatim brief text and channel closer, which would otherwise
  // dominate the similarity score and mask genuine angle diversity.
  const diversity = assessDiversity(
    candidates.map((c) => `${c.hook} ${c.storyboard.map((b) => `${b.beat} ${b.visual}`).join(" ")}`),
    opts.diversityThreshold,
  );
  const simulations = candidates.map((c, i) =>
    simulateDryRunPublish(c, evaluations[i].eligible, brief.client, brief),
  );

  const reasons: string[] = [...tamper_reasons];
  const anyEligible = evaluations.some((e, i) => e.eligible && simulations[i].ok);
  let verdict: PrototypeVerdict;
  if (tamper_detected) {
    verdict = "REJECT";
    reasons.push(
      "integrity violation: candidate/brief payload attempted to override a safety flag — rejected without spend or publish",
    );
  } else if (!anyEligible) {
    verdict = "REJECT";
    reasons.push(
      `all ${evaluations.length} candidate(s) blocked by the compliance judge — zero spend, zero publish`,
    );
  } else if (!diversity.pass) {
    verdict = "REVISE";
    reasons.push(
      `insufficient diversity: ${diversity.distinct_pairs}/${diversity.pairs_checked} candidate pair(s) were genuinely distinct (threshold ${diversity.threshold})`,
    );
  } else {
    verdict = "ACCEPT";
    reasons.push(`${evaluations.filter((e) => e.eligible).length} eligible candidate(s), diversity confirmed`);
  }

  const winner = verdict === "ACCEPT" ? pickWinner(candidates, evaluations) : undefined;

  const result: PrototypeGateResult = {
    schema: PROTOTYPE_GATE_SCHEMA,
    piece_id: brief.piece_id,
    client: brief.client,
    channel: brief.channel,
    verdict,
    winner_candidate_id: winner,
    candidates,
    evaluations,
    simulations,
    diversity,
    spend_usd: 0,
    dry_run: true,
    tamper_detected,
    tamper_reasons,
    reasons,
    checked_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    input_fingerprint: fingerprintBrief(brief),
    metrics: {
      prototype_quality_score: evaluations.length === 0 ? 0 : evaluations.filter((e) => e.eligible).length / evaluations.length,
      real_performance: null,
      real_performance_reason: "not observable before live publication",
      creative_cost_avoided_usd: verdict === "ACCEPT" ? 0 : candidates.length * 5,
      rejection_before_spend: verdict === "REJECT",
    },
  };

  if (opts.root) {
    persistPrototypeGateResult(opts.root, result);
  }

  return result;
}

export function fingerprintBrief(brief: PrototypeBriefInput): string {
  const relevant = { piece_id: brief.piece_id, campaign_id: brief.campaign_id, client: brief.client, channel: brief.channel, brief: brief.brief, brand_version: brief.brand_version, offer_version: brief.offer_version, policy_version: brief.policy_version, source_version: brief.source_version };
  return createHash("sha256").update(JSON.stringify(relevant)).digest("hex");
}

/** Fail-closed freshness/drift check used immediately before a live effect. */
export function validateFreshAccept(root: string, brief: PrototypeBriefInput, now = new Date()): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  try {
    const result = JSON.parse(readFileSync(prototypeGatePath(root, brief.piece_id), "utf8")) as PrototypeGateResult;
    if (result.verdict !== "ACCEPT") reasons.push("prototype verdict is not ACCEPT");
    if (!result.winner_candidate_id) reasons.push("prototype ACCEPT has no winner");
    if (!Number.isFinite(Date.parse(result.expires_at)) || Date.parse(result.expires_at) <= now.getTime()) reasons.push("prototype ACCEPT expired");
    if (result.input_fingerprint !== fingerprintBrief(brief)) reasons.push("prototype invalidated by brand/offer/channel/policy/source drift");
  } catch { reasons.push("prototype ACCEPT receipt missing or unreadable"); }
  return { ok: reasons.length === 0, reasons };
}

export function prototypeGatePath(root: string, pieceId: string): string {
  return resolve(root, "data", "prototype-gate", `${pieceId}.json`);
}

function learningsPath(root: string): string {
  return resolve(root, "data", "prototype-learnings.jsonl");
}

/** Persist the full gate result and, on REJECT, append the durable learning entry. */
export function persistPrototypeGateResult(root: string, result: PrototypeGateResult): void {
  const path = prototypeGatePath(root, result.piece_id);
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(result, null, 2));

  emitEvent(root, {
    kind: "prototype_gate_verdict",
    level: result.verdict === "REJECT" ? "warn" : "info",
    piece_id: result.piece_id,
    client: result.client,
    phase: "prototype-gate",
    verdict: result.verdict,
    data: {
      candidates: result.candidates.length,
      tamper_detected: result.tamper_detected,
      spend_usd: result.spend_usd,
    },
  });

  if (result.verdict === "REJECT") {
    const logPath = learningsPath(root);
    const logDir = dirname(logPath);
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    appendFileSync(
      logPath,
      `${JSON.stringify({
        ts: result.checked_at,
        piece_id: result.piece_id,
        client: result.client,
        verdict: result.verdict,
        reasons: result.reasons,
        spend_usd: result.spend_usd,
        publish_occurred: false,
      })}\n`,
    );
  }
}
