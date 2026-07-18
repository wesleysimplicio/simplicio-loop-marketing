/**
 * types.ts — Prototype-First gate (issue #96, simplicio-loop epic #568).
 *
 * Slots between brief/ICP and real production/publish: storyboard + hook/copy
 * candidates are generated locally (no provider/network calls), run through
 * the repo's existing brand/humanizer/compliance judges, diversity-checked,
 * dry-run publish-simulated, and given an independent ACCEPT/REVISE/REJECT
 * verdict. Prototype agents never receive publish/ads/calendar credentials or
 * spend authority — see docs/architecture-map.md and issue #86 (extension
 * boundary: "protótipos permanecem sem credenciais, publish ou spend
 * authority").
 */

import type { BrandVoiceScore } from "../skills/brand-voice";
import type { HumanizeResult } from "../skills/humanizer";
import type { ComplianceReport } from "../compliance/generic";

export interface PrototypeBriefInput {
  piece_id: string;
  client: string;
  channel: string;
  brief: string;
  pillar?: string;
  vertical?: string;
  /** How many storyboard/copy candidates to generate. Clamped to [2, 5]. */
  variant_count?: number;
  before_after_disclaimer?: boolean;
}

export interface StoryboardBeat {
  beat: string;
  visual: string;
}

export interface PrototypeCandidate {
  candidate_id: string;
  piece_id: string;
  angle: string;
  hook: string;
  storyboard: StoryboardBeat[];
  copy: string;
  caption: string;
}

export interface CandidateEvaluation {
  candidate_id: string;
  brand_voice: BrandVoiceScore;
  humanized: HumanizeResult;
  compliance: ComplianceReport;
  /** Normalized text signature used by the diversity check. */
  diversity_key: string;
  /** true only when the compliance judge passed (no blocking violations). */
  eligible: boolean;
  reasons: string[];
}

export type PrototypeVerdict = "ACCEPT" | "REVISE" | "REJECT";

export interface DryRunSimulation {
  candidate_id: string;
  ok: boolean;
  simulated_draft_url?: string;
  reason?: string;
}

export interface DiversityResult {
  pairs_checked: number;
  distinct_pairs: number;
  pass: boolean;
  threshold: number;
}

export const PROTOTYPE_GATE_SCHEMA = "marketing-prototype-gate/v1";

export interface PrototypeGateResult {
  schema: typeof PROTOTYPE_GATE_SCHEMA;
  piece_id: string;
  client: string;
  channel: string;
  verdict: PrototypeVerdict;
  winner_candidate_id?: string;
  candidates: PrototypeCandidate[];
  evaluations: CandidateEvaluation[];
  simulations: DryRunSimulation[];
  diversity: DiversityResult;
  /** Always 0 — prototypes never carry spend authority. */
  spend_usd: 0;
  /** Always true — the gate never touches a real provider/publish surface. */
  dry_run: true;
  tamper_detected: boolean;
  tamper_reasons: string[];
  reasons: string[];
  checked_at: string;
}
