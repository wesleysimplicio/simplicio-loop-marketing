---
name: install-hyperframes
description: One-shot bootstrap skill that wires HyperFrames (https://github.com/wesleysimplicio/hyperframes) into a marketing-engine clone as a first-class video provider — the three runtime skills, the provider class + mock, the routing matrix rows, env vars, and CLAUDE.md updates. Idempotent. Invoke when a fresh clone needs HyperFrames added, or when reapplying the integration after a rebase that dropped any piece of it.
version: 0.1.0
upstream: https://github.com/wesleysimplicio/hyperframes
---

# Install HyperFrames

Reproduces, in one pass, the integration that adds HyperFrames as a video provider following the three-step **Adding a New Provider** contract in `CLAUDE.md`. Self-contained checklist of every artefact that must exist; verifies each one and creates only what is missing.

Run this skill instead of re-deriving the integration from scratch. It is the canonical record of what "HyperFrames is wired up" means in this repo.

## When to invoke

- Fresh marketing-engine clone that does not yet have HyperFrames support.
- A rebase or merge dropped any of the artefacts below (`router:check` complains, video routing falls back to `higgsfield` for typography tasks, or `.skills/hyperframes*/` are missing).
- A new client wants programmatic shorts / motion typography / data-viz reels and the matrix needs the three task kinds wired.
- Onboarding a new operator who needs a single command-able playbook instead of three commits to read.

## Inputs

- `repo_root`: string. Absolute path to the marketing-engine clone. Defaults to `process.cwd()`.
- `branch`: string, optional. Branch to commit on. Defaults to `claude/install-hyperframes`. Creates the branch if it does not exist; never commits on `main`.
- `dry_run`: boolean, optional. When true, prints the planned changes and exits without writing.

## Process

Run each step in order. Each step is idempotent — re-running on an already-integrated repo is a no-op for that step.

### Step 1 — Preflight

1. Confirm `repo_root` contains `CLAUDE.md` with the line `## How to Add a New Provider`. Refuse to run if missing — this is not a marketing-engine repo.
2. Confirm `lib/providers/video.ts`, `lib/providers/matrix.ts`, `lib/providers/types.ts`, and `lib/providers/__mocks__/video.ts` exist. Refuse to run if any are missing.
3. Confirm the active branch is **not** `main`. If on `main`, create and check out `branch` first.

### Step 2 — Add the three runtime skills

Create these three directories with the SKILL.md files. Each file already exists in the in-tree canonical version — copy from the `Reference artefact set` section below verbatim. Skip a file if it already exists and its frontmatter `name` matches.

- `.skills/hyperframes/SKILL.md` — composition authoring rules (layout-before-animation, timelines paused + registered on `window.__timelines`, no `Math.random()`/time-based logic, variables declared via `data-composition-variables`).
- `.skills/hyperframes-cli/SKILL.md` — `npx hyperframes` lint → inspect → render dev loop. Always renders with `--strict --strict-variables`.
- `.skills/hyperframes-prompt-builder/SKILL.md` — specialist invoked by `video-prompt-builder` when the matrix resolves to `hyperframes`; loads brand tokens from `clients/<slug>/design.md`, picks a template per `task_kind`, returns a composition spec + render args.

### Step 3 — Update the dispatcher skill

In `.skills/video-prompt-builder/SKILL.md`:

1. Add `hyperframes-prompt-builder` to the specialist list in the opening paragraph and the **Related skills** section.
2. Extend the `task_kind` input enum with `motion_typography`, `data_viz_reel`, `programmatic_short`.
3. In the **Process** step that verifies env vars, add `HYPERFRAMES_ACTIVE` to the list.
4. In the provider→specialist mapping, add the row `Hyperframes -> hyperframes-prompt-builder`.
5. Add an example: a weekly KPI reel routed to Hyperframes with `task_kind: programmatic_short`.

Skip any sub-step whose target string is already present.

### Step 4 — Extend the provider layer

In `lib/providers/types.ts`, add three members to the `VideoTask` union:

```ts
| "motion-typography"
| "data-viz-reel"
| "programmatic-short"
```

In `lib/providers/matrix.ts`:

- Add three rows to `EMBEDDED_DEFAULTS.video`: `motion-typography`, `data-viz-reel`, `programmatic-short` — each defaulting to `hyperframes`.
- Add label aliases to `TASK_LABEL_MAP`: `"motion typography"`, `"kinetic typography"`, `"data viz reel"`, `"data-viz reel"`, `"programmatic short"`, `"parametrized short"`.

In `lib/providers/video.ts`:

- Add a `HyperframesVideoProvider` class extending `RealVideoBase`, gated on `process.env.HYPERFRAMES_ACTIVE === "true"`, that throws a "local CLI render required in caller context; stub" error from `realGenerate` (matching the existing higgsfield/topview stub pattern).
- Register `hyperframes: () => new HyperframesVideoProvider()` in `REAL_VIDEO_REGISTRY`.

In `lib/providers/__mocks__/video.ts`:

- Add a `MockHyperframesVideoProvider` extending `BaseMockVideo` with `name = "hyperframes"`.
- Register `hyperframes: () => new MockHyperframesVideoProvider()` in `MOCK_VIDEO_REGISTRY`.

### Step 5 — Update the routing matrix file

In `.specs/architecture/PROVIDERS.md`, append three rows to the **Video Routing** table:

```
| Motion typography | hyperframes | HTML/GSAP kinetic type, brand-faithful, deterministic |
| Data viz reel | hyperframes | declared variables → re-renderable charts (NYT-style) |
| Programmatic short | hyperframes | parametrized HTML composition; byte-identical re-renders |
```

### Step 6 — Update `.env.example`

Append, after `WAVESPEED_API_KEY=`:

```
# HyperFrames is a local HTML→MP4 renderer; no API key needed.
# Set HYPERFRAMES_ACTIVE=true once `npx hyperframes doctor` passes locally
# (Node >= 22, FFmpeg on PATH). See https://github.com/wesleysimplicio/hyperframes
HYPERFRAMES_ACTIVE=false
```

### Step 7 — Update `CLAUDE.md`

1. In the **Stack** table, change the `Video` row's providers cell to include `hyperframes (local HTML→MP4)`.
2. In **Skills Available**, insert three lines after `wavespeed-batch`:
   - `hyperframes` — HTML-as-source-of-truth motion composition authoring.
   - `hyperframes-cli` — runs `npx hyperframes` lint/inspect/preview/render.
   - `hyperframes-prompt-builder` — selected by `video-prompt-builder` when the matrix resolves to `hyperframes`.

### Step 8 — Verify

1. Parse `.specs/architecture/PROVIDERS.md` via the test below and assert `motion-typography`, `data-viz-reel`, `programmatic-short` all resolve to `hyperframes`.
2. Run `npm run typecheck` — accept any pre-existing failures unrelated to the changes (e.g. missing `@types/node`); fail if any new TS error references the providers layer.
3. Run `npm run router:check` if a `.env` exists in the repo; otherwise skip (the script demands `.env` and is unrelated to the integration shape).
4. Confirm `git status` shows only the expected files.

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const text = readFileSync('.specs/architecture/PROVIDERS.md', 'utf8');
const expected = ['motion-typography', 'data-viz-reel', 'programmatic-short'];
for (const key of expected) {
  if (!text.toLowerCase().includes(key.replace(/-/g, ' '))) {
    console.error('MISSING:', key); process.exit(1);
  }
}
console.log('PROVIDERS.md OK');
"
```

### Step 9 — Commit and push

1. Stage exactly the files this skill touched. Never `git add -A`.
2. Commit with the canonical message:
   ```
   feat(skills): wire HyperFrames as a video provider
   ```
   plus a body describing the three-step contract execution (see the merged reference commit for the wording).
3. Push to `origin <branch>`. Open a draft PR if none exists for the branch.

## Outputs

- `branch`: string. The branch that holds the commit.
- `pr_url`: string. The draft PR URL, if one was created or already existed.
- `files_written`: array of relative paths actually created or modified.
- `files_skipped_idempotent`: array of relative paths that were already correct.
- `verification`: `{ providers_md_pass: boolean, typecheck_pass: boolean, router_check: "pass" | "skipped" | "fail" }`.

## Non-negotiable rules

- **Idempotent.** Re-running on an already-integrated repo touches zero files.
- **Never commit on `main`.** Create a feature branch first; the engine's branch policy is enforced upstream.
- **No skill body mentions `hyperframes` outside the contract.** Provider selection still flows through `PROVIDERS.md` + `lib/router.ts`. This skill is the *bootstrap*; runtime selection stays provider-agnostic.
- **Do not edit a rendered MP4 or any file under `outputs/`.** This skill changes engine plumbing only.
- **Never delete an existing `compliance-<active client>` skill or any client-specific artefact.** The integration is additive.

## Failure modes

- Step 1 preflight fails (not a marketing-engine repo): surface the missing file and stop. Do not try to "fix" it.
- A file already exists with conflicting content (e.g. `.skills/hyperframes/SKILL.md` was hand-edited): diff against the canonical content; surface the diff; ask the operator before overwriting.
- `npm run typecheck` reports a new TS error in `lib/providers/`: stop, surface the error, do not commit.
- `git push` fails for non-network reasons: stop. Network failures retry per the project's git policy (2s, 4s, 8s, 16s backoff, up to 4 attempts).

## Related skills

- `hyperframes`: runtime authoring (installed by this skill in Step 2).
- `hyperframes-cli`: runtime lint/inspect/render (installed by this skill in Step 2).
- `hyperframes-prompt-builder`: runtime specialist (installed by this skill in Step 2).
- `video-prompt-builder`: dispatcher updated by this skill in Step 3.
- `llm-router`: unrelated; LLM provider routing is a parallel dispatcher.

## Reference artefact set

The canonical contents of every file this skill writes live in the merged commit on `main`:

- Skills: `.skills/hyperframes/SKILL.md`, `.skills/hyperframes-cli/SKILL.md`, `.skills/hyperframes-prompt-builder/SKILL.md`
- Provider layer: `lib/providers/types.ts`, `lib/providers/matrix.ts`, `lib/providers/video.ts`, `lib/providers/__mocks__/video.ts`
- Routing matrix: `.specs/architecture/PROVIDERS.md`
- Env: `.env.example`
- Charter: `CLAUDE.md`

When in doubt, diff against `origin/main` at the merged reference commit and copy the canonical version verbatim. Do not retype from memory.

## Upstream reference

- HyperFrames: https://github.com/wesleysimplicio/hyperframes
- Project skill catalogue: https://github.com/wesleysimplicio/hyperframes/tree/main/skills
