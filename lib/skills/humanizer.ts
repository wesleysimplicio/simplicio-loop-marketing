export interface HumanizeOptions {
  language?: "pt-BR" | "en" | "es";
  platform?: string;
  brand_voice_path?: string;
  preserve_terms?: string[];
}

export interface HumanizeResult {
  text: string;
  changes: string[];
  ai_tells_remaining: number;
  passes_used: number;
}

const AI_TELL_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(?:In conclusion|To summarize|To sum up|In summary)\b[,.]?\s*/gi, label: "removed conclusion intro" },
  { re: /\b(?:Moreover|Furthermore|Additionally)\b[,.]?\s*/g, label: "removed connector" },
  { re: /—/g, label: "replaced em-dash" },
  { re: /\b(?:delve|leverage|unlock the secret|revolutionize)\b/gi, label: "removed AI-tell word" },
  { re: /\b(perhaps|it could be argued|arguably)\b/gi, label: "removed hedge" },
];

const TRIAD_RE = /(\w+),\s*(\w+),\s*and\s+(\w+)/g;

export function humanizeSync(input: string, opts: HumanizeOptions = {}): HumanizeResult {
  let text = input;
  const changes: string[] = [];
  for (const t of AI_TELL_PATTERNS) {
    const before = text;
    text = text.replace(t.re, (m) => (t.re.source.includes("—") ? ", " : ""));
    if (before !== text) changes.push(t.label);
  }
  text = text.replace(TRIAD_RE, (_m, a, b, c) => {
    changes.push(`broke triad ${a}/${b}/${c}`);
    return `${a}. ${b[0].toUpperCase()}${b.slice(1)}. ${c[0].toUpperCase()}${c.slice(1)}`;
  });
  // Ensure preserve terms unchanged: if dropped, re-inject naively at end.
  for (const term of opts.preserve_terms ?? []) {
    if (!text.includes(term) && input.includes(term)) {
      text = `${text} ${term}`;
      changes.push(`re-injected preserve term: ${term}`);
    }
  }
  // Recount remaining tells
  let remaining = 0;
  for (const t of AI_TELL_PATTERNS) {
    const matches = text.match(t.re);
    if (matches) remaining += matches.length;
  }
  return {
    text: text.replace(/\s+/g, " ").trim(),
    changes,
    ai_tells_remaining: remaining,
    passes_used: 1,
  };
}

export async function humanize(
  input: string,
  opts: HumanizeOptions = {},
): Promise<HumanizeResult> {
  // Real implementation would call llm-router for a polished rewrite;
  // sync pass is the deterministic baseline that always runs.
  const first = humanizeSync(input, opts);
  if (first.ai_tells_remaining < 3) return first;
  const second = humanizeSync(first.text, opts);
  return { ...second, passes_used: 2, changes: [...first.changes, ...second.changes] };
}
