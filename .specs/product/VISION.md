# VISION - Marketing Engine

## Mission

Marketing Engine is a provider-agnostic AI marketing CLI that can be dropped into any host project and turn a brief into compliant, publishable content with measurable follow-through.

## Product promise

- Abstract tasks such as captioning, scripting, image generation, compliance, publishing, and promotion should stay stable even when the underlying vendors change.
- Operators should be able to run the pipeline end-to-end with local docs, predictable CLI commands, and DRY_RUN-safe behavior.
- Agents and contributors should be able to understand the repo quickly through executable examples, tests, and mapped operational docs.

## Primary users

- Maintainers extending the CLI, providers, router, and QA/compliance layers.
- Operators validating the content pipeline in real projects.
- AI coding agents working in long-running loops with shared repo context.

## Success metrics

| Metric | Target | Evidence |
|---|---|---|
| Time to first safe contribution | under 30 minutes | docs + tests reveal commands and architecture |
| Local validation confidence | full typecheck + Playwright green | `npm run typecheck` and `npm run test:e2e` |
| Provider swap cost | config-only for most flows | matrix-driven routing + provider factories |
| Auditability | every generated piece leaves artifacts | manifests, compliance reports, QA reports, usage logs |

## Non-goals

- Becoming a locked-in framework for host projects.
- Encoding vendor choice into skills or content templates.
- Shipping silent automation without compliance, QA, and evidence artifacts.

## Strategic view

This repository is both a marketing automation engine and a reference implementation for safe multi-provider agent workflows. The code, specs, and tests should keep reinforcing that position.
