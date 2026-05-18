export interface BrandSpec {
  voice_axes?: {
    tone?: number;
    formality?: number;
    energy?: number;
    warmth?: number;
  };
  lexicon?: {
    use?: string[];
    avoid?: string[];
  };
}

export interface BrandVoiceScore {
  score: number;
  axes: { tone: number; formality: number; energy: number; warmth: number };
  notes: string[];
}

function clamp(v: number, lo = 1, hi = 5): number {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreBrandVoice(
  text: string,
  brand?: BrandSpec,
): BrandVoiceScore {
  const notes: string[] = [];
  const exclam = (text.match(/!/g) ?? []).length;
  const youCount = (text.match(/\byou(?:r)?\b/gi) ?? []).length;
  const formalIndicators = (text.match(/\b(?:therefore|whereby|hereby|herein)\b/gi) ?? []).length;
  const energy = clamp(1 + exclam * 0.7 + (text.length < 120 ? 1 : 0));
  const tone = clamp(3 - youCount * 0.3 + formalIndicators * 0.5);
  const formality = clamp(2 + formalIndicators * 0.5);
  const warmth = clamp(3 + youCount * 0.1);
  const target = brand?.voice_axes ?? {};
  const axes = { tone, formality, energy, warmth };
  let total = 0;
  let counted = 0;
  for (const k of ["tone", "formality", "energy", "warmth"] as const) {
    const t = target[k];
    if (t === undefined) continue;
    counted++;
    const distance = Math.abs(axes[k] - t) / 4;
    total += 1 - distance;
  }
  const score = counted === 0 ? 0.5 : total / counted;
  const avoid = brand?.lexicon?.avoid ?? [];
  for (const a of avoid) {
    if (text.toLowerCase().includes(a.toLowerCase())) {
      notes.push(`contains banned term: ${a}`);
    }
  }
  return { score, axes, notes };
}
