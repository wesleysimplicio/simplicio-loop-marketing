export type CaptionPlatform = "instagram" | "tiktok" | "linkedin" | "x";

export interface CaptionVariant {
  platform: CaptionPlatform;
  text: string;
  char_count: number;
  cta: string;
}

export const CAPTION_RULES: Readonly<Record<CaptionPlatform, { max_chars: number; cta: string }>> = {
  instagram: { max_chars: 2_200, cta: "Veja o link na bio." },
  tiktok: { max_chars: 150, cta: "Veja mais no perfil." },
  linkedin: { max_chars: 3_000, cta: "Saiba mais no link." },
  x: { max_chars: 280, cta: "Saiba mais." },
};

const ALIASES: Readonly<Record<string, CaptionPlatform>> = {
  instagram: "instagram", ig: "instagram", ig_long: "instagram", ig_short: "instagram",
  tiktok: "tiktok", linkedin: "linkedin", x: "x", twitter: "x",
};

export function normalizeCaptionPlatform(value: string): CaptionPlatform | undefined {
  return ALIASES[value.trim().toLowerCase()];
}

function fit(body: string, cta: string, max: number): string {
  const suffix = `\n\n${cta}`;
  if (suffix.length >= max) return cta.slice(0, max);
  const room = max - suffix.length;
  const trimmed = body.trim();
  const copy = trimmed.length <= room ? trimmed : `${trimmed.slice(0, Math.max(0, room - 1)).trimEnd()}…`;
  return `${copy}${suffix}`;
}

/** Deterministic fan-out: aliases and duplicates resolve to one canonical variant. */
export function fanOutCaptions(baseText: string, platforms: readonly string[]): CaptionVariant[] {
  const requested = new Set<CaptionPlatform>();
  for (const raw of platforms) {
    const platform = normalizeCaptionPlatform(raw);
    if (platform) requested.add(platform);
  }
  return [...requested].map((platform) => {
    const rule = CAPTION_RULES[platform];
    const text = fit(baseText, rule.cta, rule.max_chars);
    return { platform, text, char_count: text.length, cta: rule.cta };
  });
}
