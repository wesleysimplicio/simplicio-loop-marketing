# Progress Log

## Checkpoint 10 (2026-07-22 — issue #95 Loop core release train)

Status: implementation complete; upstream publication/remote CI promotion blocked externally.

Result:
- Added the official `loop.marketing` `simplicio.loop-extension/v1` instance and an immutable stable core lock without vendoring the upstream contract schema.
- Added fail-closed compatibility, protocol/capability/graph diffs, deterministic canary promotion with rollback, migration-issue evidence, 15-minute reconciliation automation, doctor diagnostics, and campaign receipt identities.
- Added unit/integration/E2E coverage plus a compatibility hot-path p95 benchmark.

External blocker: Loop issue #558 does not yet publish a `simplicio.component-release/v1` asset, so a real upstream bump, three-mode official conformance, CI observation, and stable auto-promotion cannot honestly be demonstrated yet.

## Checkpoint 9 (2026-07-14 — issue #78 closeout: deploy-ready assets + reproducible scripts)

Status: completed, ready for PR against `main`.

Result:
- Closed the remaining gap from Checkpoint 8: the narrative docs existed, but the
  "landing page" and "site section" asks were still copy decks, and the "demo
  loop" / "reproducible script" asks were still storyboards without code.
- Added two self-contained, deploy-ready static pages: `site/simplicio-on-metal/index.html`
  (P0 landing page) and `site/asolaria-integration/index.html` (P2 site section with
  integration timeline and ecosystem map), plus `site/README.md` explaining how to
  serve them locally and what remains external (a real hosting domain).
- Added `scripts/demo-asolaria-loop.mjs`: a reproducible 5-iteration demo that
  measures real orientation-reading token cost (heuristic:chars-div-4, the same
  labeled estimator as `lib/observability/savings.ts`) across the five canonical
  maps in `SIMPLICIO-MAP-OF-MAPS.md`, writing a regenerable receipt to
  `.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/DEMO-RUN.md`.
- Added `scripts/reductions-benchmark.mjs`: the "script que qualquer um pode rodar"
  the case study asked for — parses `REDUCTIONS.md`, fails closed on any stale
  proof link, and writes a footprint receipt to `docs/evidence/reductions-benchmark.json`.
- Wired both scripts into `package.json` (`npm run demo:asolaria`,
  `npm run benchmark:reductions`) and cross-linked them from
  `SIMPLICIO-MAP-OF-MAPS.md`, `REDUCTIONS.md`, `DEMO.md`, `CASE-STUDY.md`,
  `LANDING.md`, `ROUTING.md`, `README.md`, and `README.pt-BR.md`.
- Extended `tests/fixtures/asolaria-artifacts.json` and
  `tests/unit/asolaria-docs.test.cjs` with checks that both scripts pass in
  `--check` mode and that the new static pages stay dependency-free.

Validation:
- `node --test tests/unit/asolaria-docs.test.cjs` — 7/7 pass.
- `node scripts/demo-asolaria-loop.mjs --check` — PASS (5/5 iterations).
- `node scripts/reductions-benchmark.mjs --check` — PASS (0 stale proof links).
- `node scripts/lint-conventions.mjs` — clean.
- `node scripts/claims-audit.mjs` — PASS.

## Checkpoint 8 (2026-07-13 — issue #78 Asolaria narrative package)

Status: completed on local branch, repo-local scope only.

Result:
- Audited issue #78 live and confirmed the ask is mostly narrative/publication-oriented, with several outputs depending on an external site not present in this repo.
- Added a repo-local Asolaria integration package instead of touching engine core: `SIMPLICIO-MAP-OF-MAPS.md`, `REDUCTIONS.md`, and a bounded campaign folder under `.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/` containing `CAMPAIGN.md`, `HYPOTHESIS.md`, `ROUTING.md`, `LANDING.md`, `DEMO.md`, and `CASE-STUDY.md`.
- Added `tests/fixtures/asolaria-artifacts.json` and `tests/unit/asolaria-docs.test.cjs` so the required docs, cross-links, reduction count, and external-dependency boundaries are mechanically checked.
- Updated `README.md` and `CHANGELOG.md` to surface the package without altering loop/provider/gate code.

Validation:
- `node --test tests/unit/asolaria-docs.test.cjs` — pass.

## Checkpoint 7 (2026-07-11 — issues #65–#79)

Status: completed on `codex/finish-all-programming` pending PR/release publication.

Result:
- Added campaign anchors, durable journals/stall detection, evidence gates, reports,
  fail-closed action gates, local `check`, doctor, watcher, retrospective learnings,
  prompt-cache/usage telemetry, and a fixed-judge compliance-gated autoresearch loop.
- Fixed Windows path handling in the convention lint and repaired the doctor guard
  integration conflict found during cross-worker integration.
- Issue #78 was audited as narrative-only with no executable AC; issue #79 now has a
  DRY_RUN-only implementation with fixed judge manifest, holdout, cost/usage rows,
  savings receipt, and E2E coverage.

Validation:
- `npm run typecheck` — pass.
- `npm run lint` — pass.
- `npm run budget` — pass.
- `npx playwright test` — 236 passed, 0 failed.

## Current Status

Completed — autonomous-loop evolution plan (PRD.md, phases F0–F8) on
`claude/simplicio-loop-marketing-plan-e52ccv`. Final report in
GOAL_RESULT.md; full suite 217 passed / 0 failed.

## Checkpoints

### Checkpoint 6 (2026-07-09, F1–F5 — observability, ledger, contracts, operator, loop)

Status: completed

Task: Phases F1–F5 of PRD.md.

Result:
- F1: `lib/observability/events.ts` — two-track `marketing-event/v1`
  (stderr human + `.simplicio/events.jsonl`, 10MB rotation, kill-switch,
  fail-open); generate/promote/campaign instrumented.
- F2: `lib/observability/savings.ts` — hash-chained
  `simplicio.savings-event/v1` ledger, `proof.kind` always "estimated",
  estimator labeled, engine-owned file (runtime chain untouched).
- F3: `lib/contracts/validate.ts` (subset JSON Schema) + 5 schemas under
  `contracts/marketing-artifacts/v1/` + fixtures generated by the real
  producers (`scripts/gen-fixtures.mjs`) + two-sided drift gate.
- F4: simplicio-loop operator installed (skills, hooks incl. fail-closed
  action_gate 15/15, Stop/PreToolUse wiring); super-skill gained the
  executable loop protocol; `docs/OPERATOR.md` documents the state split.
- F5: `marketing-engine loop` — `lib/cli/loop.ts` drains the piece backlog
  in-process (processPiece → journal → promote) with `lib/loop/journal.ts`
  attempt memory (stable failure fingerprints, PROGRESS/STALLED, skip after
  K=3 identical failures + estimated savings receipt), yool-board tuples per
  piece, converge/drain modes, optional fail-open Python operator bridge
  (`MARKETING_LOOP_PY_WORKERS=1`), streaming stdio in the bin. Regression
  caught and fixed: global `--client` flag was swallowing new-piece's
  sub-flag — loop-local flags now flow through args._ passthrough.

Validation:
- `npx playwright test` — 208 passed (events 5, savings 6, contracts 5,
  loop-drain 6 all new).
- `npm run typecheck` / `npm run lint` — clean.
- Real CLI: `node bin/marketing-engine.mjs loop --root <tmp-host> --max-iter 2`
  → advanced=1, journal at `.simplicio/loop/journal.jsonl`, manifest +
  captions + compliance + qa written; converge mode stops after first land.

Next: F6 (publish-verify pipeline), F7 (doctor), F8 (capstone + PR).

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

### Issue #89 (2026-07-22) — BLOCKED on #87, #88, and upstream conformance

Issue #89 was audited against Marketing `origin/main` at
`61cf9e6a2f90d6c5743a7607d4460002c9295c46` and Loop at
`b5ddbd6af76392198906e61d0911a236eca3bcf8`. The required Marketing manifest,
TypeScript bridge, dedicated role registrations, and extension conformance
entry point do not yet exist. Implementing local substitutes would violate
the issue's explicit core-authority boundary and the instruction to implement
only #89. Reproduction and unblock criteria are recorded in
`docs/evidence/issue-89-blocker.md`; no success evidence was fabricated.

No OpenAI API key was available locally, and the official OpenAI docs checked on 2026-05-18 did not list a `gpt-image-2` model name. The README visuals were therefore committed as repository-native SVG assets instead of generated API outputs.

## Validation History

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck` | pass | TS compile clean after mapper overlay |
| `npx playwright test e2e/cli.spec.ts e2e/cli-extras.spec.ts e2e/generate-loop.spec.ts e2e/notion-sync.spec.ts e2e/observability.spec.ts` | pass | Focused regression pass during integration |
| `npm run test:e2e` | pass | Full Playwright suite green: 119 passed |
