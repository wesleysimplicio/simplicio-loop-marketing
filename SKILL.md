---
name: marketing-engine
description: Provider-agnostic AI marketing motor. Orchestrates the full content pipeline brief → script → creative → caption → compliance → publish → metrics → ads for any client, treating LLMs, image generators, video generators, publishing platforms, and ad platforms as interchangeable providers selected at runtime via .specs/architecture/PROVIDERS.md. Invoke when you need to produce, validate, or publish a marketing piece — or to add a new client, channel, or provider — without coupling logic to any specific vendor.
version: 0.3.0
license: see LICENSE
repository: https://github.com/wesleysimplicio/marketing-engine
---

# Marketing Engine

Self-contained skill packaging the entire `marketing-engine` repo as a single invocable capability. The engine is the implementation; this file is the contract an agent reads first to know what the engine does, when to reach for it, what to hand it, what comes back, and which sub-capabilities live inside.

When operating inside this repo, follow `CLAUDE.md` and `AGENTS.md` for the full charter. This SKILL.md is the **entry point**, not a replacement for those files.

## When to invoke

- A piece needs to move through any portion of `brief → script → creative → caption → compliance → publish → metrics → ads`.
- A new client is being onboarded — directory under `clients/<slug>/` with `design.md`, brand tokens, compliance rules.
- A provider is being added (LLM, image, video, publisher, ads) — follow the three-step contract in `## How to Add a New Provider` in `CLAUDE.md` (or invoke the `install-hyperframes` sub-skill as the worked example).
- An existing piece needs to be re-rendered with new variables (programmatic short, KPI reel) without re-prompting an AI generator.
- A piece needs the compliance gate run, the 4-platform caption fan-out generated, or the platform tech-spec audit performed.
- An ad campaign needs to be drafted from an approved organic piece and handed to the `meta-ads` agent.
- Metrics need to be pulled and joined back to a piece for retro analysis.

## Inputs

The engine accepts work at any stage of the pipeline. Pick the input shape that matches the stage:

- `piece_path`: string. Path to `.specs/pieces/<piece-id>.md` (or `.marketing-engine/pieces/<piece-id>.md` in a host project). Frontmatter declares `client`, `channel`, `format`, `brief`, optional `provider_override: { llm_text, image, video }`, optional `compliance_flags`.
- `client_slug`: string. Required for any creative or compliance step; resolves brand tokens from `clients/<slug>/design.md` and the per-client compliance skill `compliance-<slug>`.
- `stage`: `"script" | "creative" | "caption" | "compliance" | "publish" | "metrics" | "ads" | "full"`. `"full"` runs the mandatory loop end-to-end.
- `task_type`: string. Abstract task identifier (e.g. `copy-short`, `quote-card`, `cinematic-reel`, `programmatic-short`). The router resolves this to a concrete provider via `PROVIDERS.md` + `.env` + per-piece overrides — **never name a provider directly**.
- `dry_run`: boolean. Defaults to `true` from `.env`. Flip to `false` only after a human has reviewed at least one piece end-to-end.

## Process — the mandatory per-piece loop

Every piece execution follows this sequence. Sub-skills handle each stage; do not bypass any gate.

1. **Read piece.md** — load frontmatter (client, channel, format, brief, provider overrides, compliance flags).
2. **llm-router** — resolve LLM for the piece task type (script, caption, compliance) via `PROVIDERS.md` + `.env` + overrides.
3. **Generate copy** — call resolved LLM through `lib/providers/llm.ts`; emit `script.md` and caption variants.
4. **Generate creative** — pick image/video provider via the routing matrix; produce assets in `outputs/<client>/<date>/<piece-id>/`. Video providers include `higgsfield`, `topview`, `wavespeed`, and `hyperframes` (local HTML→MP4 for motion typography, data-viz reels, programmatic shorts).
5. **Critic skills** — run `revisao-humanizada` (humanizer), brand-voice, and platform critic skills; iterate until acceptance bar.
6. **Compliance** — run the active client's compliance skill (`compliance-<active client>`) or `compliance-generic`; output JSON `{ pass, violations, suggestions }`. Block if `pass=false`.
7. **Publish** — call `adaptlypost` with the 4-platform caption set (Instagram, TikTok, LinkedIn, X). Default `DRY_RUN=true`; flip via env only after human review.
8. **Metrics** — schedule a metrics pull via the metrics skill (later loop).
9. **Ads** — for promoted pieces, hand off to `meta-ads` agent with brief + creative IDs.

A piece is **only complete** when all gates pass and Playwright evidence is recorded (see Definition of Done).

## Outputs

- `outputs/<client>/<date>/<piece-id>/manifest.json` — provenance record (providers used, task types, cost estimate, render settings, compliance verdict).
- `outputs/<client>/<date>/<piece-id>/script.md` — final copy.
- `outputs/<client>/<date>/<piece-id>/captions.json` — 4-platform caption set with platform-specific length and CTA.
- `outputs/<client>/<date>/<piece-id>/<asset>.{mp4,png,jpg,webm}` — creative artefacts.
- `data/llm-usage.jsonl`, `data/video-usage.jsonl`, `data/runs.jsonl` — append-only audit logs.
- `e2e/` Playwright evidence — at least one spec exercises the piece pipeline end-to-end against mocks.

## Definition of Done (per piece)

- [ ] Compliance JSON returns `pass: true` (or human override logged).
- [ ] Tech specs pass (`qa-tech-specs`: aspect ratio, duration, file size, safe areas).
- [ ] 4-platform caption set generated with platform-specific length and CTA.
- [ ] Playwright evidence: at least one E2E spec exercises the piece pipeline end-to-end against mocks.
- [ ] Run logged to `data/llm-usage.jsonl` and `data/runs.jsonl` (timestamp, providers used, cost estimate).
- [ ] Outputs stored under `outputs/<client>/<date>/<piece-id>/` with `manifest.json`.

## Sub-skills (live under `.skills/`)

The engine ships **16 sub-skills**, each addressable by name. The dispatcher skills (`llm-router`, `video-prompt-builder`) resolve provider choice; specialist skills carry per-provider details; QA skills enforce gates.

**Dispatch**

- `llm-router` — selects and calls an LLM provider based on `task_type`, `PROVIDERS.md`, and overrides.
- `video-prompt-builder` — dispatcher; delegates to `higgsfield-prompt-builder`, `topview-prompt-builder`, `wavespeed-batch`, or `hyperframes-prompt-builder` based on the matrix.

**Copy**

- `copywriter-curto` — short-form copy (hooks, captions, CTAs).
- `caption-multi-platform` — fans one caption into IG / TikTok / LinkedIn / X variants.
- `revisao-humanizada` — strips AI-writing tells from generated copy.

**Image specialists**

- `gpt-image-prompt-builder` — typography-precise prompts for GPT-Image (quote cards, carousels).

**Video specialists**

- `higgsfield-prompt-builder` — Soul, DoP, Seedance prompts.
- `topview-prompt-builder` — UGC / avatar-driven prompts.
- `wavespeed-batch` — cheap batch A/B hook tests.
- `hyperframes` — HTML-as-source-of-truth motion composition authoring.
- `hyperframes-cli` — `npx hyperframes` lint / inspect / preview / render dev loop.
- `hyperframes-prompt-builder` — translates a piece brief into the HyperFrames composition spec.

**Gates**

- `compliance-generic` — default compliance audit (fallback when no client-specific skill exists). A per-client `compliance-<slug>` is added under each onboarded client.
- `qa-tech-specs` — validates aspect ratio, duration, file size, safe areas per platform.

**Bootstrap**

- `install-hyperframes` — idempotent playbook that wires HyperFrames into a fresh marketing-engine clone (three-step contract executed in one pass).

**Tooling**

- `rtk-cli` — token-smart shell wrapper for textual inspection (optional, used when `rtk` is on PATH).

## Core principle — provider-agnostic

**No skill or agent ever hardcodes a provider name.**

- Provider selection lives in `.specs/architecture/PROVIDERS.md` (routing matrix) and `.env` (active credentials and feature flags).
- Skills accept `task_type` and let `lib/router.ts` resolve the actual provider.
- Switching providers (e.g. `LLM_DEFAULT=claude` → `LLM_DEFAULT=deepseek`) requires zero code changes inside skills.
- A piece may override the default with `provider_override: { llm_text, image, video }` in its frontmatter; overrides win.
- Primary failure triggers automatic fallback (per `PROVIDERS.md`); both events logged to `data/llm-usage.jsonl`.

If you find yourself typing a provider name inside a skill body or agent prompt, **stop and route through the matrix instead**.

## Stack (configurable, default first)

| Layer       | Providers                                                         | Selection mechanism             |
| ----------- | ----------------------------------------------------------------- | ------------------------------- |
| LLM         | claude, codex, deepseek (cheap), copilot, ollama (fallback)       | `lib/router.ts` + PROVIDERS.md  |
| Image       | gpt-image, higgsfield, topview, wavespeed                         | `lib/providers/image.ts`        |
| Video       | higgsfield, topview, wavespeed, hyperframes                       | `lib/providers/video.ts`        |
| Publishing  | adaptlypost (MCP, 9 platforms)                                    | `lib/publish/adaptlypost.ts`    |
| Ads         | meta-ads (MCP active)                                             | `lib/publish/meta-ads.ts`       |
| Calendar    | Notion (database `NOTION_CALENDAR_DB_ID`)                         | env-driven                      |

All credentials and feature flags live in `.env` (template: `.env.example`). Production runs default to `DRY_RUN=true` until a piece is explicitly promoted.

## CLI surface

```bash
npx marketing-engine init        # bootstrap host repo (.marketing-engine/ scaffold)
npx marketing-engine check       # router preflight (envs against PROVIDERS.md)
npx marketing-engine generate    # run the loop for the next scheduled piece
npx marketing-engine promote     # mark a piece as ad-ready and hand off to meta-ads
```

See `bin/marketing-engine.mjs` and `package.json` for the full surface.

## How to add a new provider — three steps

1. **Provider module** — create `lib/providers/<layer>/<name>.ts` implementing the layer interface (`LlmProvider`, `ImageProvider`, or `VideoProvider`). Include at least one mock for tests.
2. **Routing matrix** — add the provider as a row in the relevant table in `.specs/architecture/PROVIDERS.md`.
3. **Env** — add the provider's variable to `.env.example` with a comment describing how to obtain it.

The router picks it up automatically. Existing skills do not change. See the merged commit on `main` for `hyperframes` (or invoke `install-hyperframes`) for the worked example.

## How to add a new client

1. Create `clients/<slug>/` with `design.md` (brand colors, type pairing, spacing scale, voice rules), `brand.md`, and `personas.md`.
2. Add a `compliance-<slug>` skill under `.skills/compliance-<slug>/SKILL.md` enumerating forbidden claims and the brand-specific audit rules.
3. Set `ACTIVE_CLIENT=<slug>` in `.env` for the run.
4. Drop pieces into `.specs/pieces/` (or `.marketing-engine/pieces/` in host projects); the engine routes them based on frontmatter.

## Non-negotiable rules

- Hardcoding a provider name inside a skill or agent body is forbidden.
- Mocks belong under `lib/providers/__mocks__/` and tests only — never in production paths.
- Direct pushes to `main` are forbidden — PR + DoD gate required.
- Never commit `.env`, real API keys, or any client PII into the repo.
- Never run real provider calls during bootstrap or CI without explicit `DRY_RUN=false` and a credentialed environment.
- Do not touch the read-only reference tree at `~/Projetos/novos/agentic-starter` (inspiration only).

## References (in-tree)

- `CLAUDE.md` — full charter (canonical; this SKILL.md condenses it).
- `AGENTS.md` — agent-side conventions, mirror of CLAUDE.md for `codex`-style runners.
- `.specs/architecture/PROVIDERS.md` — routing matrix; single source of truth for provider selection.
- `.specs/architecture/DESIGN.md`, `PATTERNS.md`, `ROUTING-MATRIX.md`, `ADR-001-provider-agnostic.md` — design rationale.
- `lib/providers/` — provider implementations (real + mock).
- `lib/router.ts` — dispatcher entry point.
- `.skills/*/SKILL.md` — every sub-skill, in full.
- `e2e/` — Playwright specs that exercise the mandatory loop against mocks.
- `bootstrap.sh`, `bootstrap.ps1` — host-project installers.

## Upstream / inspiration

- Repository: https://github.com/wesleysimplicio/marketing-engine
- HyperFrames (video renderer integration): https://github.com/wesleysimplicio/hyperframes
- yool / tuple / HAMT (capability addressing): https://github.com/wesleysimplicio/yool-tuple-hamt
