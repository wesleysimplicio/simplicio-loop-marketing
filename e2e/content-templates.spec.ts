import { test, expect } from "@playwright/test";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadTemplate,
  renderTemplate,
  renderEnglishFirst,
} from "../lib/content/templates";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "..", ".specs", "pieces", "templates");

test("all five content templates exist and declare requires_evidence", () => {
  const ids = [
    "dev-article",
    "social-derivative",
    "video-script",
    "reddit-forum-answer",
    "launch-thread",
  ];
  for (const id of ids) {
    const { meta } = loadTemplate(resolve(TEMPLATES_DIR, `${id}.md`));
    expect(meta.template_id).toBe(id);
    expect(meta.requires_evidence.length).toBeGreaterThan(0);
  }
});

test("renderTemplate marks missing evidence explicitly instead of leaving it blank", () => {
  const { text, meta } = loadTemplate(resolve(TEMPLATES_DIR, "dev-article.md"));
  const { rendered, missing_evidence } = renderTemplate(text, meta, {
    title: "How we fixed a latency spike",
    hook_paragraph: "Last month p99 latency doubled overnight.",
    problem_description: "Queue backpressure under load.",
    solution_description: "Redesigned the consumer pool.",
    next_steps: "Load-testing the new design at 2x traffic.",
    cta_line: "Repo linked below.",
    // failure_or_tradeoff and screenshot_or_metric intentionally omitted
  });
  expect(missing_evidence.sort()).toEqual(["failure_or_tradeoff", "screenshot_or_metric"]);
  expect(rendered).toContain("[EVIDENCE MISSING: no failure or tradeoff provided]");
  expect(rendered).toContain("[EVIDENCE MISSING: no screenshot or metric provided]");
});

test("renderTemplate fills evidence fields when supplied, no missing markers", () => {
  const { text, meta } = loadTemplate(resolve(TEMPLATES_DIR, "launch-thread.md"));
  const { rendered, missing_evidence } = renderTemplate(text, meta, {
    what_it_does_plainly: "A CLI that generates and gates marketing content.",
    how_its_built: "Provider-agnostic router over LLM/image/video adapters.",
    architecture_or_metric_summary: "Generate loop processed 40 pieces in dry-run in under a minute.",
    what_was_hard_or_rejected: "First tried a monolithic prompt; split into copy+caption stages instead.",
    link_and_cta: "github.com/example/repo",
  });
  expect(missing_evidence).toHaveLength(0);
  expect(rendered).toContain("Generate loop processed 40 pieces");
});

test("renderEnglishFirst produces the English artifact as source of truth, then a flagged localized adaptation", () => {
  const { text, meta } = loadTemplate(resolve(TEMPLATES_DIR, "social-derivative.md"));
  const data = {
    hook_line: "We shipped a provider-agnostic marketing loop.",
    key_insight: "Switching LLM providers is a one-line env change, not a rewrite.",
    screenshot_or_metric: "screenshot: outputs/acme/2026-07-01/p1/manifest.json",
    cta_line: "Try it: npx marketing-engine init",
  };
  const { english, localized } = renderEnglishFirst(text, meta, data, {
    language: "pt-BR",
    overrides: {
      hook_line: "Lançamos um motor de marketing agnóstico de provedor.",
      key_insight: "Trocar de provedor de LLM é uma linha de env, não uma reescrita.",
    },
  });
  expect(english.language).toBe("en");
  expect(english.needs_native_review).toBe(false);
  expect(english.missing_evidence).toHaveLength(0);

  expect(localized).toBeDefined();
  expect(localized?.language).toBe("pt-BR");
  expect(localized?.needs_native_review).toBe(true);
  expect(localized?.rendered).toContain("Lançamos um motor");
  // the evidence field was NOT overridden, so it must carry over unchanged —
  // translation must not introduce new/different claims.
  expect(localized?.rendered).toContain("manifest.json");
});
