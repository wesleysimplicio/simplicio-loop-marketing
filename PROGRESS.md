# Progress Log

## Current Status

In progress — autonomous-loop evolution plan (see PRD.md) on
`claude/simplicio-loop-marketing-plan-e52ccv`. F0 done.

## Checkpoints

### Checkpoint 5 (2026-07-09, F0 — green baseline + hygiene)

Status: completed

Task: Phase F0 of PRD.md — fix the 4 pre-existing red e2e specs, add convention
lint, gitignore runtime state, fill PRD.md.

Result:
- Root cause of the 4 red specs: the watcher-gate (commit b396280) blocked all
  DRY_RUN runs — the `[mock-<name>]` attestation stamped by mock LLMs tripped
  the placeholder check, the gate received the raw caption (without the
  per-platform `#pillar` hashtag), and the mock echoed only 40 chars of prompt
  so topic-coverage was 0%. Fixes: gate strips the mock marker under DRY_RUN
  only (outside DRY_RUN it still blocks — mock-leak detector), gate now checks
  the shipping per-platform caption, placeholder regex no longer flags pure
  numeric brackets (`[2]` TOON list markers / citations), mock echoes up to
  2000 chars. `promote-loop.spec.ts` updated to seed the MEASURED watcher
  report the claims gate requires by design (test predated the gate).
- New `scripts/lint-conventions.mjs` (node builtins only) + `npm run lint`:
  no console.log in lib/ outside lib/cli/, no `__mocks__` import outside
  provider registries/tests, provider-neutral skills stay neutral in prose,
  `.env` never tracked.
- `.gitignore`: `.simplicio/*` except `ledger/`, `.orchestrator/*` except
  `savings/`; untracked committed runtime state (cache/locks/runs/inventories).
- PRD.md filled with the phased plan (F0–F8).

Validation:
- `npx playwright test` — 186 passed, 0 failed.
- `npm run typecheck` — clean.
- `npm run lint` — clean.

Next: F1 (two-track observability, `marketing-event/v1`).

### Checkpoint 4 (2026-07-02, epic #46)

Status: completed

Task: Implement all 14 open child issues (#47-#60) of epic #46 — autonomous SaaS marketing loop across social networks and dev communities.

Result: See CHANGELOG.md [Unreleased] for the full list. Landed as 11 focused commits on `claude/open-issues-95whqo`: channel registry + integration broker, community compliance gate (3-state, addressing reviewer feedback on silent-pass risk), accrual-based analytics scoring (addressing reviewer feedback on one-shot-snapshot ranking), paid-growth budget guardrails, campaign CLI loop, browser/computer-use automation lane, community reply loop, Yool tuple-space board, strategy playbooks + evidence-aware content templates, root super-skill orchestrator, runtime-first ADR, and a capstone E2E mock launch loop test tying every lane together.

Validation:
- `npx tsc --noEmit` — clean.
- `npx playwright test` — 171 passed. 4 pre-existing failures in `e2e/generate-loop.spec.ts`, `e2e/notion-sync.spec.ts`, `e2e/promote-loop.spec.ts` confirmed to reproduce identically against `main` in a clean `git worktree` — unrelated to this branch (touches none of the files those tests exercise).

Next: Push and open a draft PR referencing #46-#60.

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
