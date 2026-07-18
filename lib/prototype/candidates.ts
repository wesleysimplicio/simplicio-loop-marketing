/**
 * candidates.ts — local, deterministic storyboard/hook/copy candidate
 * generation for the Prototype-First gate (issue #96).
 *
 * Pure and provider-agnostic: no LLM/image/video provider call, no network
 * I/O. Real asset generation (image/video/landing skeleton) is explicitly
 * OUT of scope for this pass — see issue #96 "Passo a passo" step 2 — this
 * module only produces the storyboard + hook/copy layer for real, deferring
 * mock-image/mock-video/landing-skeleton candidate kinds.
 */

import type { PrototypeBriefInput, PrototypeCandidate, StoryboardBeat, DiversityResult } from "./types";

/** Distinct narrative angles used to force genuine diversity across candidates. */
export const ANGLES = [
  "problem-agitate-solve",
  "curiosity-gap",
  "social-proof",
  "contrarian-take",
  "data-point",
] as const;

export type Angle = (typeof ANGLES)[number];

const MIN_VARIANTS = 2;
const MAX_VARIANTS = 5;

export function clampVariantCount(n: number | undefined): number {
  if (!Number.isFinite(n)) return MIN_VARIANTS;
  return Math.max(MIN_VARIANTS, Math.min(MAX_VARIANTS, Math.trunc(n as number)));
}

function hookFor(angle: Angle, brief: PrototypeBriefInput): string {
  switch (angle) {
    case "problem-agitate-solve":
      return `Stop losing time to the problem behind: ${briefTopic(brief)}.`;
    case "curiosity-gap":
      return `The one thing nobody tells you about ${briefTopic(brief)}.`;
    case "social-proof":
      return `Why teams like ${brief.client} are rethinking ${briefTopic(brief)}.`;
    case "contrarian-take":
      return `Everyone says X about ${briefTopic(brief)}. Here's why that's backwards.`;
    case "data-point":
      return `A number that changes how you think about ${briefTopic(brief)}.`;
    default:
      return `Let's talk about ${briefTopic(brief)}.`;
  }
}

function briefTopic(brief: PrototypeBriefInput): string {
  const trimmed = brief.brief.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : "your next move";
}

function storyboardFor(angle: Angle, brief: PrototypeBriefInput): StoryboardBeat[] {
  const topic = briefTopic(brief);
  switch (angle) {
    case "problem-agitate-solve":
      return [
        { beat: "open on the friction", visual: `close-up of the pain point tied to ${topic}` },
        { beat: "agitate the cost of inaction", visual: "quick cuts, tension building" },
        { beat: "reveal the resolution", visual: `product/solution beat for ${brief.client}` },
      ];
    case "curiosity-gap":
      return [
        { beat: "tease the gap", visual: "text-on-screen question, no answer yet" },
        { beat: "build anticipation", visual: "b-roll relevant to the topic" },
        { beat: "pay off the curiosity", visual: `reveal shot naming ${topic}` },
      ];
    case "social-proof":
      return [
        { beat: "show the crowd", visual: "testimonial-style framing" },
        { beat: "name the shift", visual: `side-by-side before/after framing for ${topic}` },
        { beat: "invite the viewer in", visual: `CTA card for ${brief.client}` },
      ];
    case "contrarian-take":
      return [
        { beat: "state the common belief", visual: "bold text-on-screen claim" },
        { beat: "flip it", visual: "reveal counter-evidence" },
        { beat: "land the new frame", visual: `product tie-in for ${topic}` },
      ];
    case "data-point":
      return [
        { beat: "drop the number", visual: "animated stat card" },
        { beat: "explain why it matters", visual: `context beat for ${topic}` },
        { beat: "close with the takeaway", visual: `CTA card for ${brief.client}` },
      ];
    default:
      return [{ beat: "intro", visual: topic }];
  }
}

function copyFor(angle: Angle, hook: string, brief: PrototypeBriefInput): string {
  const closer = `Learn more about how ${brief.client} approaches this on ${brief.channel}.`;
  // The raw brief text is folded in verbatim (not paraphrased) so that any
  // compliance-relevant language already present in the brief — including a
  // forbidden claim planted by an upstream source — reaches the judges
  // unmodified instead of being silently dropped by the mock generator.
  return `${hook} ${brief.brief.trim()} ${closer}`.replace(/\s+/g, " ").trim();
}

function captionFor(angle: Angle, brief: PrototypeBriefInput): string {
  return `${briefTopic(brief)} — ${angle.replace(/-/g, " ")} #${brief.pillar ?? "general"}`;
}

/**
 * Generate N>=2 genuinely distinct storyboard/hook/copy candidates for a
 * brief. Distinctness comes from varying the narrative angle, not from
 * random noise — the same brief always produces the same N candidates
 * (deterministic), which keeps the gate's ACCEPT/REVISE/REJECT verdict
 * reproducible and testable.
 */
export function generateCandidates(
  brief: PrototypeBriefInput,
  count?: number,
): PrototypeCandidate[] {
  const n = clampVariantCount(count ?? brief.variant_count);
  const candidates: PrototypeCandidate[] = [];
  for (let i = 0; i < n; i++) {
    const angle = ANGLES[i % ANGLES.length];
    const hook = hookFor(angle, brief);
    candidates.push({
      candidate_id: `${brief.piece_id}-cand-${i + 1}`,
      piece_id: brief.piece_id,
      angle,
      hook,
      storyboard: storyboardFor(angle, brief),
      copy: copyFor(angle, hook, brief),
      caption: captionFor(angle, brief),
    });
  }
  return candidates;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9à-ú\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function jaccard(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 1 : intersection / union;
}

/**
 * A pair of candidates is "distinct" when their text similarity is below
 * `threshold`. The gate passes when at least one distinct pair exists among
 * ELIGIBLE candidates — two near-identical rewrites of the same angle (a
 * common LLM failure mode) must not read as real diversity.
 */
export function assessDiversity(
  texts: string[],
  threshold = 0.6,
): DiversityResult {
  let pairsChecked = 0;
  let distinctPairs = 0;
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      pairsChecked++;
      const similarity = jaccard(texts[i], texts[j]);
      if (similarity < threshold) distinctPairs++;
    }
  }
  const pass = texts.length >= 2 && distinctPairs > 0;
  return { pairs_checked: pairsChecked, distinct_pairs: distinctPairs, pass, threshold };
}
