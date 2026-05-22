---
name: hyperframes-cli
description: Runs the HyperFrames CLI dev loop — init, lint, inspect, preview, render — for compositions authored under the `hyperframes` skill. Invoked after the composition HTML is on disk and before the piece is marked complete.
version: 0.1.0
upstream: https://github.com/wesleysimplicio/hyperframes
---

# HyperFrames CLI

Wraps `npx hyperframes` for the marketing-engine pipeline. Requires Node.js >= 22 and FFmpeg on PATH (`npx hyperframes doctor` verifies). All commands run in DRY_RUN-safe mode by default — the lint/inspect passes have no external calls; only `render` writes an MP4.

## When to invoke

- Immediately after `hyperframes-prompt-builder` produces a project under `outputs/<client>/<date>/<piece-id>/`.
- Whenever a composition needs validation before publish (`lint` + `inspect`).
- For local preview during iteration on a piece (`preview`).
- For the final render that produces the artefact picked up by the publish step (`render`).
- For environment troubleshooting when render fails (`doctor`, `browser`, `info`).

## Inputs

- `project_path`: string. Path to the HyperFrames project (must contain `index.html` and `composition.json`).
- `mode`: `"lint" | "inspect" | "preview" | "render" | "doctor"`.
- `render_opts`: object, optional, only for `mode = "render"`. Recognized keys:
  - `fps`: 24 | 30 | 60 (default 30).
  - `quality`: `"draft" | "standard" | "high"` (default `"standard"`; use `"draft"` while iterating).
  - `format`: `"mp4" | "webm"` (default `"mp4"`).
  - `variables`: object. JSON object keyed by variable id, overrides `data-composition-variables` defaults.
  - `strict`: boolean. Maps to `--strict`. Default `true` in the pipeline — fail render on lint errors.
  - `strict_variables`: boolean. Maps to `--strict-variables`. Default `true` for piece runs.
  - `workers`: integer 1-8 or `"auto"`. Default `"auto"`.
  - `output`: string. Output file path inside `outputs/<client>/<date>/<piece-id>/`.

## Process

1. **Verify environment** on first run of a session: `npx hyperframes doctor`. Surface missing FFmpeg or Chrome as a hard block — do not attempt to render.
2. **Lint.** `npx hyperframes lint <project_path> --json`. Treat all `error`-level findings as blockers. Warnings are surfaced to the orchestrator; let the operator decide.
3. **Inspect.** `npx hyperframes inspect <project_path> --json`. Resolve any reported text overflow or canvas escape before render. If the overflow is intentional for an entrance/exit, mark the element with `data-layout-allow-overflow` (or the ancestor with `data-layout-ignore` for decorative elements) — do not silence the rule globally.
4. **Preview** (operator only). `npx hyperframes preview <project_path> --port <port>`. Hand back the **Studio project URL** (`http://localhost:<port>/#project/<project-name>`), not the source `index.html` path.
5. **Render.** `npx hyperframes render <project_path>` with the flags resolved from `render_opts`. Build the `--variables` argument from `render_opts.variables` using a single-line JSON string. Always pass `--strict` and `--strict-variables` for piece runs.
6. **Verify output.** After render, check the MP4 exists and is non-zero. Log to `data/video-usage.jsonl` with `{ ts, provider: "hyperframes", composition_id, render_args, duration_seconds, file_bytes, latency_ms }`.

## Outputs

- `lint`: `{ pass: boolean, errors: [...], warnings: [...] }`.
- `inspect`: `{ pass: boolean, findings: [...] }`.
- `render`: `{ artifact_path: string, duration_s: number, file_bytes: number, render_ms: number }`.
- `preview`: `{ url: string }`.

## Command cheat sheet

```bash
npx hyperframes init <name>                            # scaffold (used once per piece by the prompt builder)
npx hyperframes lint <path>                            # validate markup
npx hyperframes inspect <path>                         # layout/overflow audit
npx hyperframes preview <path> --port 3017             # local dev
npx hyperframes render <path> \
  --fps 30 --quality standard --strict --strict-variables \
  --variables '{"leads":42,"delta_pct":12}' \
  --output outputs/<client>/<date>/<piece-id>/final.mp4
npx hyperframes doctor                                 # environment check
npx hyperframes info                                   # version/env details
```

## Non-negotiable rules

- Never render without a passing `lint` and `inspect` pass. The pipeline has no recovery path for a malformed composition.
- Never silence a lint or inspect finding globally — fix the markup, or whitelist the specific element with `data-layout-allow-overflow` / `data-layout-ignore`.
- For pieces with declared variables, always pass `--strict-variables`. A typo in a variable id must fail loudly, not silently fall through to the default.
- For final-delivery renders, `--quality high`. For iteration loops, `--quality draft` to save compute.
- Asset preprocessing (`tts`, `transcribe`, `remove-background`) is **out of scope** for this skill — invoke them through a future `hyperframes-media` skill rather than inlining here.

## Failure modes

- `doctor` reports missing FFmpeg or Chrome: install via the project's setup instructions; do not work around.
- `render` fails with `unknown variable`: a key passed via `--variables` is not declared in `data-composition-variables`. Fix the markup or remove the override.
- `render` exceeds wall-time budget: drop `--quality` to `standard`, or split the composition into sub-compositions and parallelize via `--workers`.
- Output MP4 has zero bytes: re-run `doctor`; almost always a Chrome crash mid-capture.

## Related skills

- `hyperframes`: composition authoring rules; produces the project this skill validates and renders.
- `hyperframes-prompt-builder`: brief → composition spec; runs before this skill.
- `qa-tech-specs`: runs after this skill against the rendered MP4 to validate platform specs.

## Upstream reference

Full upstream skill (every flag, troubleshooting matrix, parametrized renders): https://github.com/wesleysimplicio/hyperframes/tree/main/skills/hyperframes-cli
