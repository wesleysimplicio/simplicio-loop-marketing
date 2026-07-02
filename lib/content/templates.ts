/**
 * templates.ts — content template rendering with explicit missing-evidence
 * marking (issue #57).
 *
 * Every content template under .specs/pieces/templates/ declares
 * `requires_evidence` fields in its frontmatter. When a caller renders the
 * template without supplying one of those fields, the placeholder is
 * replaced with an explicit "[EVIDENCE MISSING: ...]" marker instead of
 * being silently dropped or hallucinated — the watcher gate
 * (lib/gate/watcher-gate.ts) and community compliance gate
 * (lib/compliance/community.ts) both treat unfilled/fabricated evidence as
 * a block, so templates must make the gap visible up front.
 */

import { readFileSync } from "node:fs";

export type TemplateId =
  | "dev-article"
  | "social-derivative"
  | "video-script"
  | "reddit-forum-answer"
  | "launch-thread";

const FRONTMATTER_RE = /```yaml\s*\n([\s\S]*?)```/;

export interface TemplateMeta {
  template_id: string;
  requires_evidence: string[];
  source_template?: string;
}

export function parseTemplateMeta(templateText: string): TemplateMeta {
  const match = FRONTMATTER_RE.exec(templateText);
  if (!match) return { template_id: "unknown", requires_evidence: [] };
  const lines = match[1].split("\n");
  let templateId = "unknown";
  let sourceTemplate: string | undefined;
  const requiresEvidence: string[] = [];
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("template_id:")) {
      templateId = trimmed.slice("template_id:".length).trim();
      inList = false;
    } else if (trimmed.startsWith("source_template:")) {
      sourceTemplate = trimmed.slice("source_template:".length).trim();
      inList = false;
    } else if (trimmed.startsWith("requires_evidence:")) {
      inList = true;
    } else if (inList && trimmed.startsWith("-")) {
      requiresEvidence.push(trimmed.slice(1).trim());
    } else if (trimmed && !trimmed.startsWith("-")) {
      inList = false;
    }
  }
  return { template_id: templateId, requires_evidence: requiresEvidence, source_template: sourceTemplate };
}

export function loadTemplate(path: string): { text: string; meta: TemplateMeta } {
  const text = readFileSync(path, "utf8");
  return { text, meta: parseTemplateMeta(text) };
}

/**
 * Fills `{{field}}` placeholders from `data`. Any field listed in the
 * template's `requires_evidence` that is missing/empty in `data` is
 * rendered as an explicit missing-evidence marker rather than left blank
 * or fabricated.
 */
export function renderTemplate(
  templateText: string,
  meta: TemplateMeta,
  data: Record<string, string>,
): { rendered: string; missing_evidence: string[] } {
  const missing: string[] = [];
  const rendered = templateText.replace(/\{\{(\w+)\}\}/g, (_, field: string) => {
    const value = data[field];
    if (value && value.trim()) return value;
    if (meta.requires_evidence.includes(field)) {
      missing.push(field);
      return `[EVIDENCE MISSING: no ${field.replace(/_/g, " ")} provided]`;
    }
    return "";
  });
  return { rendered, missing_evidence: missing };
}

export interface LocalizedRenderResult {
  language: string;
  rendered: string;
  missing_evidence: string[];
  needs_native_review: boolean;
}

/**
 * English-first render, followed by an optional localized adaptation.
 * The localized pass reuses the SAME evidence — translation must not
 * introduce new claims — and is always flagged needs_native_review unless
 * the target language is English, matching
 * lib/compliance/community.ts's content.localization check.
 */
export function renderEnglishFirst(
  templateText: string,
  meta: TemplateMeta,
  data: Record<string, string>,
  localizedData?: { language: string; overrides: Record<string, string> },
): { english: LocalizedRenderResult; localized?: LocalizedRenderResult } {
  const englishResult = renderTemplate(templateText, meta, data);
  const english: LocalizedRenderResult = {
    language: "en",
    rendered: englishResult.rendered,
    missing_evidence: englishResult.missing_evidence,
    needs_native_review: false,
  };

  if (!localizedData) return { english };

  const merged = { ...data, ...localizedData.overrides };
  const localizedResult = renderTemplate(templateText, meta, merged);
  const localized: LocalizedRenderResult = {
    language: localizedData.language,
    rendered: localizedResult.rendered,
    missing_evidence: localizedResult.missing_evidence,
    needs_native_review: localizedData.language !== "en",
  };
  return { english, localized };
}
