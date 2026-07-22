/** Marketing-domain policy declarations for Loop core evolution/replication. */
import { createHash } from "node:crypto";

export type SignalKind = "defect" | "regression" | "improvement" | "evolution";
export interface EvolutionSignal { id: string; kind: SignalKind; summary: string; capability?: string }
export interface GraphChange { operation: "insert_before" | "insert_after" | "refine"; target: string; stage: string }
export interface EvolutionProposal {
  proposal_id: string; fingerprint: string; kind: "improvement" | "evolution";
  signals: string[]; graph_diff: GraphChange[]; alternatives: string[];
  estimated_cost_usd: number | null; cost_unobservable_reason?: string;
  risk: "low" | "medium" | "high"; tests: string[];
  rollout: readonly ["replay", "shadow", "canary"];
  rollback: { action: "restore_pinned_manifest"; manifest_version: string };
}

export interface EvolutionIntake { findings: EvolutionSignal[]; proposals: EvolutionProposal[] }
const REQUIRED_GATES = new Set(["compliance", "safety"]);
const stable = (value: unknown): string => JSON.stringify(value, (_k, v) =>
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
export const sha256 = (value: unknown): string => createHash("sha256").update(stable(value)).digest("hex");

/** Defects/regressions remain findings; only improvements/evolutions can become RFC proposals. */
export function prepareEvolution(signals: EvolutionSignal[], change: GraphChange[], manifestVersion: string): EvolutionIntake {
  const findings = signals.filter((s) => s.kind === "defect" || s.kind === "regression");
  const eligible = signals.filter((s) => s.kind === "improvement" || s.kind === "evolution");
  if (!eligible.length) return { findings, proposals: [] };
  const fingerprint = sha256({ signals: eligible.map((s) => [s.kind, s.summary, s.capability]).sort(), change });
  return { findings, proposals: [{
    proposal_id: `marketing-rfc-${fingerprint.slice(0, 12)}`, fingerprint,
    kind: eligible.some((s) => s.kind === "evolution") ? "evolution" : "improvement",
    signals: eligible.map((s) => s.id).sort(), graph_diff: change, alternatives: ["retain-current-overlay"],
    estimated_cost_usd: null, cost_unobservable_reason: "provider prices unavailable during policy planning",
    risk: change.some((c) => REQUIRED_GATES.has(c.target)) ? "high" : "medium",
    tests: ["composed-graph-validation", "pinned-manifest-replay", "shadow-quality-comparison", "canary-rollback"],
    rollout: ["replay", "shadow", "canary"], rollback: { action: "restore_pinned_manifest", manifest_version: manifestVersion },
  }] };
}

export interface ProposalValidation { accepted: boolean; violations: string[]; requires_independent_approval: true; requires_human_approval: boolean }
export function validateProposal(proposal: EvolutionProposal, activeStages: string[]): ProposalValidation {
  const violations: string[] = [];
  const result = new Set(activeStages);
  for (const change of proposal.graph_diff) {
    if (!result.has(change.target)) violations.push(`orphan-target:${change.target}`);
    if (change.stage === change.target) violations.push(`cycle:${change.stage}`);
    if (REQUIRED_GATES.has(change.target) && change.operation !== "refine") violations.push(`protected-gate:${change.target}`);
  }
  for (const gate of REQUIRED_GATES) if (!result.has(gate)) violations.push(`missing-required-gate:${gate}`);
  return { accepted: violations.length === 0, violations, requires_independent_approval: true, requires_human_approval: proposal.risk !== "low" };
}

export interface ReplicationPolicy { max_agents: number; max_tokens: number; max_media_usd: number; max_ads_usd: number; max_backlog: number; p95_trigger_ms: number; min_confidence: number; available_slots: number; critical_paths: string[] }
export function replicationAdmission(policy: ReplicationPolicy, input: { stage: string; p95_ms: number; confidence: number; backlog: number; requested_replicas: number }): { admitted: number; reason: string } {
  if (!policy.critical_paths.includes(input.stage)) return { admitted: 0, reason: "not-critical-path" };
  if (input.p95_ms < policy.p95_trigger_ms || input.confidence < policy.min_confidence) return { admitted: 0, reason: "threshold-not-met" };
  if (input.backlog > policy.max_backlog) return { admitted: 0, reason: "backlog-budget-exceeded" };
  const admitted = Math.max(0, Math.min(input.requested_replicas, policy.max_agents, policy.available_slots));
  return { admitted, reason: admitted ? "declared-to-core-scheduler" : "no-capacity" };
}

export interface CandidateReceipt { candidate_id: string; strategy: string; producer_id: string; verifier_id: string; fence: string; verified: boolean; quality: number; effect_count: number; received_at_ms: number }
export interface CandidateDecision { winner_id?: string; promotion_owner: string; accepted: string[]; cancelled: string[]; rejected: Array<{ id: string; reason: string }>; fences_to_revoke: string[] }
/** Evaluates isolated receipts. Scheduling, cancellation and fence revocation remain Loop-core effects. */
export function firstVerifiedCandidateWins(receipts: CandidateReceipt[], promotionOwner: string, activeFence: string): CandidateDecision {
  const rejected: CandidateDecision["rejected"] = [];
  const valid = receipts.filter((r) => {
    const reason = r.fence !== activeFence ? "late-or-stale-fence" : r.producer_id === r.verifier_id ? "self-verification" : !r.verified ? "unverified" : r.effect_count !== 0 ? "candidate-has-external-effect" : undefined;
    if (reason) rejected.push({ id: r.candidate_id, reason });
    return !reason;
  }).sort((a, b) => a.received_at_ms - b.received_at_ms || a.candidate_id.localeCompare(b.candidate_id));
  const winner = valid[0];
  return { winner_id: winner?.candidate_id, promotion_owner: promotionOwner, accepted: winner ? [winner.candidate_id] : [], cancelled: valid.slice(1).map((r) => r.candidate_id), rejected, fences_to_revoke: valid.slice(1).map((r) => r.fence) };
}

export function evaluateCanary(baseline: { quality: number; effect_count: number }, canary: { quality: number; effect_count: number }, maxQualityDrop = 0): { promote: boolean; rollback: boolean; reason: string } {
  if (canary.effect_count > baseline.effect_count) return { promote: false, rollback: true, reason: "duplicate-effect-regression" };
  if (canary.quality < baseline.quality - maxQualityDrop) return { promote: false, rollback: true, reason: "quality-regression" };
  return { promote: true, rollback: false, reason: "canary-within-policy" };
}
