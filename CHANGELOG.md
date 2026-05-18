# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-05-18

### Added

- `e2e/provider-factories.spec.ts` exercises the non-`DRY_RUN` factory path so
  the suite proves the repo returns real provider adapters instead of production
  mocks.

### Changed

- E2E coverage now mirrors the Sprint 0 acceptance language more closely:
  `e2e/cli-init.spec.ts` and `e2e/cli-scan.spec.ts` split the host-project
  scaffold and scan coverage, `e2e/generate-loop.spec.ts` asserts structured
  usage-log tasks, and `e2e/matrix.spec.ts` proves that editing
  `.specs/architecture/PROVIDERS.md` changes routing without code edits.
- `CONTRIBUTING.md` now documents how to update `CHANGELOG.md`, and the PR
  template links directly to the changelog checklist target.

## [0.2.0] - 2026-05-18

### Added

- `lib/providers/matrix.ts` parses `.specs/architecture/PROVIDERS.md` as the single
  source of routing truth (ADR-001). Embedded defaults are used when the file is
  missing or malformed, with a stderr warning.
- `lib/providers/policy.ts` — shared retry/backoff/timeout helper (`withRetry`),
  per-provider pricing table and `estimateCost`/`estimateTokens` helpers.
- `lib/router.ts` exposes `runWithFallback` — wraps any provider call with the
  primary/fallback chain documented in `PROVIDERS.md` and writes one structured
  line per attempt to `data/llm-usage.jsonl` (`ok`, `fallback_used`, `attempt`,
  `latency_ms`).
- `lib/data/runs.ts` and `lib/data/manifest.ts` write the artefacts the AGENTS
  Definition of Done requires: `data/runs.jsonl` per piece run and
  `outputs/<client>/<date>/<piece-id>/manifest.json` per piece.
- `lib/pieces/{id,frontmatter,store}.ts` — piece engine. ISO-8601 week-numbered
  IDs (`PIECE-YYYYWww-NNN`), zero-dependency YAML frontmatter parser, state
  machine (`draft → scheduled → published → measured`, side state `review`).
- `lib/cli/generate.ts` — real generation loop that reads `pieces/`, routes
  every task through the matrix + fallback chain, runs inline compliance,
  writes outputs/script/captions/compliance.json/manifest.json, transitions
  status, and appends to `data/runs.jsonl`.
- `lib/cli/promote.ts` — real promotion loop that classifies `data/analytics.jsonl`
  (top/bottom 20% by save rate, ≥100 impressions), writes `ads-draft.json`
  for winners, appends `data/learnings.md` for losers.
- `lib/calendar/notion.ts` — Notion calendar reader (`pullCalendar`, `syncToLocal`,
  `pushStatus`). DRY_RUN-safe.
- `lib/publish/adaptlypost.ts` — real AdaptlyPost wiring with retry/backoff;
  DRY_RUN still writes `adaptlypost-draft.json` locally.
- `lib/publish/meta-ads.ts` — Meta Ads draft builder + `data/promotions.jsonl`
  writer. Real Meta API call is a stub (calls into the meta-ads MCP layer when
  available).
- `lib/analytics/{meta,tiktok,youtube}.ts` — DRY_RUN keeps deterministic synthetic
  data; non-DRY paths call Graph / TikTok Business / YouTube Data APIs.
- `lib/compliance/{generic,loader}.ts` — executable cross-vertical audit, writes
  `data/compliance/<piece>.json`, escalates blocks to `data/compliance-blocked/`,
  exposes `detectStreaks` for the alerts module.
- `lib/skills/{humanizer,brand-voice}.ts` — executable critic skills (regex pass
  + LLM secondary stub, voice-axis distance scoring).
- `lib/qa/tech-specs.ts` — ffprobe/identify wrapper with filename fallback;
  per-platform validation against `CHANNELS.md` specs.
- `lib/observability/{cost,ab-report,failures}.ts` — cost summary + HTML report,
  A/B per (task, provider) ROI table, failure-rate detector + webhook poster.
- `lib/schedule/cron.ts` — cron / launchd install / uninstall / status helpers
  with marker block isolation.
- CLI gains: `new-piece`, `status`, `logs`, `cost`, `ab-report`, `alerts`,
  `sync`, `schedule`. Each delegates to a TypeScript module via the bundled
  `tsx` runtime.
- E2E coverage (Playwright) across all of the above: matrix parsing,
  fallback chain, policy retry/timeout/cost, pieces engine, init/scan/generate
  loop, promote loop, compliance, qa-tech-specs, observability, CLI surface.

### Changed

- `lib/router.ts` no longer hardcodes routing tables; everything resolves via
  `lib/providers/matrix.ts`.
- `lib/providers/{llm,image,video}.ts` now contain real adapter classes that
  call concrete APIs. Mock variants live under `lib/providers/__mocks__/` and
  the factory switches based on `DRY_RUN`.
- `bin/marketing-engine.mjs` `generate` / `promote` are no longer placeholders.

### Notes

- All new external behavior is gated by `DRY_RUN=true` (the default) — CI never
  reaches real API endpoints.
- The mock providers preserve the original deterministic output, so previously
  authored e2e specs continue to pass.

## [0.1.0] - 2026-05-08

### Added

- CLI scaffold (`bin/marketing-engine.mjs`): `init`, `scan`, `check` commands.
- Provider type interfaces (`lib/providers/{types,llm,image,video}.ts`) and
  mock implementations.
- Publish + analytics scaffolds (`lib/publish/adaptlypost.ts`,
  `lib/analytics/{meta,tiktok,youtube}.ts`).
- Specs tree under `.specs/`: architecture (DESIGN, PROVIDERS, ROUTING-MATRIX,
  ADR-001), product (BRAND, CHANNELS, COMPLIANCE, PERSONAS, PILLARS), piece +
  campaign templates, client `_template/` overrides.
- 11 SKILL.md documents under `.skills/` (provider-neutral skills).
- E2E suite (Playwright): CLI, compliance, caption-format, tech-specs,
  provider-router, AdaptlyPost-publish.
- CI workflow + DoD workflow.
- Remotion video explainer (PT-BR + EN) under `video/`.
- Bilingual README + SETUP + CONTRIBUTING + AGENTS.md (charter) + Apache-2.0
  LICENSE.
