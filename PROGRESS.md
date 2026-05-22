# Progress Log

## Current Status

Completed.

## Checkpoints

### Checkpoint 1

Status: completed

Task:
Apply `llm-project-mapper` to the repository without overwriting the repo's existing source of truth docs.

Result:
Bootstrap applied successfully. Added mapper overlays such as `.agents/`, `.claude/`, `docs/`, `scripts/`, `tests/`, `INIT.md`, and `.starter-meta.json`. Restored richer pre-existing `DESIGN.md` and `PERSONAS.md` while keeping new mapper-owned docs that improve repo navigation.

Validation:
`npm run typecheck`

Next:
Add persistent repository visuals to `README.md` and re-run the regression suite.

### Checkpoint 2

Status: completed

Task:
Add repository visuals near the top of `README.md` and document the applied project mapping.

Result:
Added `assets/readme/marketing-engine-hero.svg` and `assets/readme/marketing-engine-router.svg`, embedded them in `README.md`, and documented the mapper entrypoints and operational docs.

Validation:
`npm run test:e2e`

Next:
Commit and push the final mapper + README pass.

### Checkpoint 3

Status: completed

Task:
Wire HyperFrames (https://github.com/wesleysimplicio/hyperframes) into the engine as a first-class video provider following the three-step "Adding a Provider" contract.

Result:
- Added skills `.skills/hyperframes/` (composition authoring), `.skills/hyperframes-cli/` (lint/inspect/render dev loop), and `.skills/hyperframes-prompt-builder/` (specialist invoked by `video-prompt-builder` when the matrix resolves to `hyperframes`).
- Updated `.skills/video-prompt-builder/SKILL.md` to dispatch to the new specialist and recognize the new task kinds.
- Added new `VideoTask` union members `motion-typography`, `data-viz-reel`, `programmatic-short` in `lib/providers/types.ts`.
- Added `HyperframesVideoProvider` (stub gated on `HYPERFRAMES_ACTIVE=true`) and `MockHyperframesVideoProvider`; registered both in the real and mock video registries.
- Extended `lib/providers/matrix.ts` `EMBEDDED_DEFAULTS` and `TASK_LABEL_MAP` for the three new tasks.
- Added the three rows to the Video Routing table in `.specs/architecture/PROVIDERS.md`.
- Added `HYPERFRAMES_ACTIVE=false` to `.env.example` with a note about `npx hyperframes doctor`.
- Updated `CLAUDE.md` Stack table and Skills Available list.

Validation:
PROVIDERS.md video section re-parses correctly through the project's parser logic — all three new task kinds resolve to `hyperframes`. Local `npm run typecheck` blocked by pre-existing missing `@types/node` (unrelated to this change).

Next:
Commit on branch `claude/hyperframe-skills-S69hE`, push, open draft PR.

## Blockers

No OpenAI API key was available locally, and the official OpenAI docs checked on 2026-05-18 did not list a `gpt-image-2` model name. The README visuals were therefore committed as repository-native SVG assets instead of generated API outputs.

## Validation History

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck` | pass | TS compile clean after mapper overlay |
| `npx playwright test e2e/cli.spec.ts e2e/cli-extras.spec.ts e2e/generate-loop.spec.ts e2e/notion-sync.spec.ts e2e/observability.spec.ts` | pass | Focused regression pass during integration |
| `npm run test:e2e` | pass | Full Playwright suite green: 119 passed |
