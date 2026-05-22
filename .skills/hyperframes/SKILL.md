---
name: hyperframes
description: Author HTML-as-source-of-truth motion compositions (kinetic type, motion quote cards, programmatic data-viz reels) for the HyperFrames renderer. Used whenever the video provider resolved by the routing matrix is `hyperframes`.
version: 0.1.0
upstream: https://github.com/wesleysimplicio/hyperframes
---

# HyperFrames

HyperFrames is an HTML → MP4 renderer (Apache 2.0). Compositions are plain HTML files with `data-start`, `data-duration`, `data-track-index` attributes; the renderer drives a headless Chrome through the timeline frame-accurately and pipes frames into FFmpeg. The skill `hyperframes-prompt-builder` is the marketing-engine dispatcher entry point; this skill carries the authoring rules.

## When to invoke

- A piece is routed (via `PROVIDERS.md` or a `provider_override.video: hyperframes` in the frontmatter) to the HyperFrames provider.
- Task is `motion-typography`, `data-viz-reel`, `programmatic-short`, or any composition that needs deterministic output from declared variables (e.g. weekly KPI reel that re-renders unchanged with new numbers).
- An approved still (quote card, carousel slide) needs to be promoted to a short motion piece without changing the typographic system.
- The orchestrator needs a re-renderable artefact: same composition, different `--variables`, byte-identical baseline.

## Inputs

- `composition_id`: string. Short slug used for the project directory and `data-composition-id`.
- `aspect`: `9:16` | `1:1` | `16:9` | `4:5`.
- `duration_seconds`: integer. Total composition length.
- `scenes`: array. Each `{ id, start_s, duration_s, role: "hook" | "body" | "cta", copy?, asset_ref? }`.
- `design_tokens`: object. Brand colors, primary/secondary type families, spacing scale. Sourced from `clients/<slug>/design.md` when present.
- `variables`: array, optional. Declared parameters that callers can override at render time `{ id, type, label, default }`.
- `assets`: object, optional. `{ video?, audio?, images[] }` — local paths under the project.
- `output_dir`: string. Where the renderer writes the MP4 (defaults to `outputs/<client>/<date>/<piece-id>/`).

## Process

1. **Read brand context first.** Load `clients/<active-client>/design.md` (or the design tokens passed in). Refuse to author HTML before tokens are known — fall back to the in-repo defaults only if the client has none.
2. **Plan the narrative arc** out loud (scenes, rhythm, transitions, beat) before writing markup. Hook in the first 1.5s, body, CTA at the tail.
3. **Layout before animation.** Write the final on-screen layout first — position elements where they end up. Animate *into* those positions with `gsap.from()`; only the final scene may use `gsap.to()` exits.
4. **Compose the HTML.** Root `<html>` carries `data-composition-id`, `data-width`, `data-height`. Each clip carries `id`, `data-start`, `data-duration`, `data-track-index`. Parametrize with `data-composition-variables` (JSON array on `<html>`); read at runtime with `window.__hyperframes.getVariables()`.
5. **Register every timeline paused.** `const tl = gsap.timeline({ paused: true }); window.__timelines["<id>"] = tl;` — the framework drives playback. No infinite repeats, no `Math.random()`, no time-based logic, no async timeline construction.
6. **Transitions between every scene.** No jump cuts. Use the catalogued transitions (fade, wipe, masked, shader) listed in the upstream `references/transitions.md`.
7. **Video and audio.** `<video>` must be muted; audio lives in a separate `<audio>` element on its own track.
8. **Validate locally** with `npx hyperframes lint`, then `npx hyperframes inspect` (text overflow, container clipping). Only render once both pass. Delegated to the `hyperframes-cli` skill.
9. **Emit the manifest.** Write `manifest.json` next to the MP4 with `{ composition_id, aspect, duration_seconds, variables_resolved, lint_pass, inspect_pass, render_settings }`. Required by the Definition of Done in `CLAUDE.md`.

## Outputs

- `project_path`: string. Path to the HyperFrames project directory.
- `composition_html`: string. The authored `index.html` content (or the path to it under `project_path`).
- `render_args`: object. The flags to pass to `npx hyperframes render` (`--fps`, `--quality`, `--variables`, `--strict`).
- `expected_artifact`: string. The MP4 path that will appear under `output_dir` after render.
- `cost_estimate_usd`: number. Local render — compute time only; report 0 for DRY_RUN, otherwise estimate from `--workers` × duration.

## Non-negotiable rules

- Every element has an entrance animation (`gsap.from()`).
- All timelines start paused and are registered on `window.__timelines`.
- No `Math.random()`, no `Date.now()` in the composition logic, no setTimeout-driven animation.
- Video tracks muted; never embed audio in `<video>`.
- Never bake client copy directly into markup if it could be a variable — declare it in `data-composition-variables` so the same composition re-renders for new pieces.
- Never edit a rendered MP4 under `outputs/`; re-run `hyperframes render` instead.

## Examples

### Example 1: weekly KPI reel (programmatic-short)

Input: `{ composition_id: "kpi-weekly-w21", aspect: "9:16", duration_seconds: 12, scenes: [{ id: "hook", start_s: 0, duration_s: 2, role: "hook", copy: "Semana 21" }, { id: "metric", start_s: 2, duration_s: 8, role: "body" }, { id: "cta", start_s: 10, duration_s: 2, role: "cta", copy: "Veja o detalhamento" }], variables: [{ id: "leads", type: "number", label: "Novos leads", default: 0 }, { id: "delta_pct", type: "number", label: "Variação %", default: 0 }] }`
Output: a project under `outputs/<client>/<date>/kpi-weekly-w21/` whose `index.html` reads the two numeric variables and animates them; `render_args.--variables` resolves them per piece.

### Example 2: motion quote card (motion-typography)

Input: `{ composition_id: "quote-marcos-2026-05", aspect: "1:1", duration_seconds: 6, scenes: [{ id: "main", start_s: 0, duration_s: 6, role: "body", copy: "Coloque a sua marca onde os olhos já estão." }] }`
Output: a kinetic-type composition that respects the active client's typography pairing, with masked-text entrance and a soft hold on the final frame.

## Failure modes

- Missing `design.md` and no design tokens passed: stop and ask. Do not invent a palette.
- `npx hyperframes lint` reports errors (missing `data-composition-id`, overlapping tracks, unregistered timelines): block render until fixed.
- `npx hyperframes inspect` reports text overflow on any scene: prefer reflowing the layout over shrinking type below the system minimum.
- Audio track longer than the composition `duration_seconds`: trim audio, never extend `duration_seconds` to fit.
- Composition uses `Math.random()` or wall-clock time anywhere: refactor to a declared variable or a seeded deterministic generator before render.

## Related skills

- `hyperframes-cli`: lint, inspect, preview, render commands. Always invoked after authoring.
- `hyperframes-prompt-builder`: marketing-engine specialist that translates a piece brief into the input shape this skill expects, called by `video-prompt-builder` when the matrix resolves to `hyperframes`.
- `video-prompt-builder`: generic dispatcher.
- `qa-tech-specs`: validates the rendered MP4 against platform specs (aspect, duration, safe areas).
- `compliance-<active client>`: runs after render against the rendered artefact and the on-screen copy resolved from variables.

## Upstream reference

Full upstream skill (composition patterns, transitions catalogue, audio-reactive, captions, data-in-motion): https://github.com/wesleysimplicio/hyperframes/tree/main/skills/hyperframes
