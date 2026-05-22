---
name: hyperframes-prompt-builder
description: Translates a marketing-engine piece brief into the input shape the `hyperframes` skill expects (composition spec) and the flags the `hyperframes-cli` skill needs to render it. Selected by `video-prompt-builder` when the routing matrix resolves to the `hyperframes` provider.
version: 0.1.0
---

# HyperFrames Prompt Builder

Specialist that bridges the marketing-engine piece model (`brief`, `task_kind`, `provider_override`) and the HyperFrames composition contract. Mirrors `higgsfield-prompt-builder` and `topview-prompt-builder` in shape — same dispatcher, different target — so `video-prompt-builder` can swap providers without changing its own logic.

## When to invoke

- `video-prompt-builder` resolves the video provider to `hyperframes` for a piece.
- `task_kind` is one of `motion-typography`, `data-viz-reel`, `programmatic-short` (the hyperframes-native tasks in `PROVIDERS.md`).
- A piece declares `provider_override.video: hyperframes` in its frontmatter.
- An approved still (quote card from `gpt-image`, carousel from `topview`) is being promoted to motion and the type system must stay byte-faithful to the original.
- The orchestrator needs the same composition re-rendered with new variable values (weekly KPI reel, daily price update, A/B variant copy) without re-prompting an AI generator.

## Inputs

- `brief`: object. The piece brief with at least `headline`, `body?`, `cta?`, `aspect`, `duration_seconds`.
- `task_kind`: `"motion-typography" | "data-viz-reel" | "programmatic-short"`.
- `piece_path`: string, optional. Path to `.specs/pieces/<piece-id>.md`. Frontmatter may carry `provider_override`, `compliance_flags`, `variables`.
- `client_slug`: string. Used to load `.marketing-engine/clients/<slug>/design.md` (or `clients/<slug>/design.md` in the engine repo).
- `output_dir`: string. Where the project and final MP4 live (defaults to `outputs/<client>/<date>/<piece-id>/`).
- `dry_run`: boolean, optional. When true, returns the composition spec and render args without invoking `hyperframes-cli`.

## Process

1. **Load brand context.** Read `clients/<client_slug>/design.md` and resolve `{ colors, type_pairing, spacing_scale, brand_voice }`. If missing, refuse to proceed — surface the missing path. Brand violations cannot be fixed downstream.
2. **Resolve overrides.** If `piece_path` is set and frontmatter has `provider_override.video`, confirm it is `hyperframes`; otherwise this skill should not be running.
3. **Map task_kind to a composition template.**
   - `motion-typography` → `kinetic-type` template, single scene, type-driven.
   - `data-viz-reel` → `nyt-graph` template, body scene with declared numeric variables.
   - `programmatic-short` → `play-mode` template, hook/body/cta, all client copy declared as variables.
4. **Declare variables.** Anything from the brief that could change per re-render (headline, body, KPI numbers, CTA, date stamp) goes into `variables` with explicit type + label + default. Hardcoded copy is forbidden when a variable would work.
5. **Build the composition spec** in the shape `hyperframes` expects: `{ composition_id, aspect, duration_seconds, scenes, design_tokens, variables, assets, output_dir }`. Compute `composition_id` from `<piece-id>` (slug-safe).
6. **Build the render args** in the shape `hyperframes-cli` expects: `{ project_path, mode: "render", render_opts: { fps, quality, format, variables, strict: true, strict_variables: true, output } }`. Pick `quality: "high"` for promoted pieces, `"draft"` for first-pass review.
7. **Cost estimate.** Local render — estimate from `duration_seconds × workers × $0.00` (zero out-of-pocket; report wall-time minutes as `latency_estimate_min` instead).
8. **Log the resolution** to `data/video-usage.jsonl` with `{ ts, provider: "hyperframes", piece_id, task_kind, composition_id, dry_run }`.
9. If `dry_run`, return without calling `hyperframes-cli`. Otherwise invoke `hyperframes` (to author the project) then `hyperframes-cli` (mode `lint` → `inspect` → `render`) in order.

## Outputs

- `provider_used`: `"hyperframes"`.
- `composition_spec`: object. The input passed to the `hyperframes` skill.
- `render_args`: object. The input passed to the `hyperframes-cli` skill (mode `render`).
- `expected_artifact`: string. The MP4 path that will exist after `render`.
- `latency_estimate_min`: number. Wall-time estimate for the render.
- `cost_estimate_usd`: 0 (local render; opex only).

## Examples

### Example 1: weekly KPI reel (`programmatic-short`)

Input: `{ brief: { headline: "Semana 21 em números", aspect: "9:16", duration_seconds: 12 }, task_kind: "programmatic-short", client_slug: "saas-consultoria-imagem", piece_path: ".specs/pieces/2026-05-22-kpi.md" }`
Output: composition spec with `composition_id: "kpi-weekly-2026-05-22"`, three scenes (hook/body/cta), numeric variables (`leads`, `delta_pct`); render args with `--strict --strict-variables --quality high --variables '{"leads":42,"delta_pct":12}'`.

### Example 2: motion quote card (`motion-typography`)

Input: `{ brief: { headline: "Coloque a sua marca onde os olhos já estão.", aspect: "1:1", duration_seconds: 6 }, task_kind: "motion-typography", client_slug: "saas-consultoria-imagem" }`
Output: composition spec with a single kinetic-type scene, masked-text entrance, design tokens pulled from the active client's `design.md`; render args targeting `outputs/saas-consultoria-imagem/<date>/<piece-id>/final.mp4`.

### Example 3: provider override

Input: a piece with `provider_override.video: hyperframes` whose `task_kind` is not in the matrix.
Output: still routed here, default `task_kind` to `programmatic-short`, log the fallback.

## Non-negotiable rules

- Never invent design tokens. Refuse to proceed if `design.md` is missing.
- Always declare per-piece copy as a `variable`, even when it looks static — the composition must be re-renderable without code edits.
- Always pass `--strict-variables` in the render args. A typo in a variable id is a hard fail.
- Never call `hyperframes-cli` directly bypassing the `lint → inspect → render` sequence.

## Failure modes

- Unknown `task_kind`: default to `programmatic-short`, log a warning, and continue.
- `design.md` missing: stop. Do not pick a palette; ask the operator to add the file.
- Brief includes a brand-prohibited claim (per `compliance-<active client>`): block before authoring; compliance runs upstream of render.
- HyperFrames CLI not installed: surface the install command (`npm i -g hyperframes` or `npx hyperframes@latest`) and stop.

## Related skills

- `hyperframes`: composition authoring rules (consumed by this skill).
- `hyperframes-cli`: lint/inspect/render execution (consumed by this skill).
- `video-prompt-builder`: dispatcher that selects this skill.
- `qa-tech-specs`: runs against the final MP4.
- `compliance-<active client>` / `compliance-generic`: runs against the resolved variables and the rendered artefact.
- `llm-router`: not used directly here, but may pick the LLM that drafts the headline/body before this skill assembles the composition spec.
