# Goal Result

## Issue #89 — 2026-07-22

Status: **BLOCKED**. The current main branch lacks the #87 extension
manifest/TypeScript bridge and the #88 dedicated role bindings on which #89
explicitly depends. The upstream contract slice also states that installed
extension conformance, the Marketing TypeScript bridge, and graph-hash
receipts remain out of scope. A local coordinator, claim manager, ledger, or
mock bridge would violate #89 rather than implement it. The inspected SHAs,
reproduction commands, missing evidence, and unblock sequence are documented
in `docs/evidence/issue-89-blocker.md`.

## Current run — 2026-07-11

All programming issues in the active backlog (#65–#79) were implemented or audited
for executable scope using six parallel workers and integrated on branch
`codex/finish-all-programming`. #78 has no executable acceptance criterion; #79 is
implemented as a fixed-judge, compliance-gated, holdout-evaluated `DRY_RUN` loop.

Follow-up on 2026-07-13: issue #78 now has a repo-local narrative package instead of staying audit-only. The work adds canonical docs, campaign artifacts, and a focused unit test, while keeping public-site, demo hosting, and live analytics explicitly marked as external dependencies.

Follow-up on 2026-07-14 (issue #78 closeout): the remaining repo-achievable gaps are filled with real artifacts instead of copy decks — two self-contained, deploy-ready static pages under `site/` (landing page + Asolaria integration site section), a reproducible 5-iteration demo script (`scripts/demo-asolaria-loop.mjs`), and a fail-closed reduction proof-trail benchmark script (`scripts/reductions-benchmark.mjs`). Public domain hosting, recorded demo media, and live analytics remain the only genuinely external items, and are called out explicitly in every doc that references them.

Final validation: `npm run typecheck` PASS, `npm run lint` PASS, `npm run budget` PASS,
`npx playwright test` PASS (236/236). Publication actions were not triggered by the
autoresearch path (`published: false`, `dry_run: true`).

## Summary

Evolved the marketing engine from "complete pipeline driven by a playbook"
into an **autonomous loop with durable memory, central observability and
fail-closed gates**, porting the proven patterns of the sibling repos
(simplicio-loop, simplicio-dev-cli, simplicio-mapper) — phases F0–F8 of
PRD.md, all delivered.

- `marketing-engine loop` drains the piece backlog through the real gates
  with attempt memory (fingerprinted failures, STALLED skip after 3
  identical failures, estimated savings receipt per skip), then runs the
  verified publish pipeline and the promote pass. Modes drain/converge,
  bounded by `--max-iter`, DRY_RUN default.
- Two-track observability (`marketing-event/v1` stream), hash-chained
  savings ledger (`proof.kind` always "estimated", labeled estimator),
  versioned artifact contracts with producer-generated fixtures and a
  two-sided drift gate, `marketing-engine doctor`, convention lint and a
  token-budget guard with negative self-test.
- simplicio-loop operator layer installed (skills, loop_stop/orient hooks,
  fail-closed action_gate 15/15) with the super-skill upgraded from
  playbook to executable protocol; state split documented in
  docs/OPERATOR.md; real-provider wiring documented (credential-gated) in
  docs/MCP-TRANSPORT.md.
- Fixed the 4 e2e specs red since the watcher gate landed (mock marker vs
  placeholder heuristic; per-platform caption; TOON numeric brackets; mock
  echo length).

## Changed Files (highlights)

- `lib/cli/loop.ts`, `lib/loop/journal.ts`, `bin/marketing-engine.mjs` — the loop command (+ `doctor`, stdio streaming, flag passthrough fix)
- `lib/publish/verify-pipeline.ts` — verified publication with classified retry + receipts
- `lib/observability/{events,savings}.ts` — event stream + savings ledger
- `lib/contracts/{validate,registry}.ts`, `contracts/marketing-artifacts/v1/` — contracts, schemas, fixtures
- `lib/cli/doctor.ts`, `scripts/token-budget.mjs`, `scripts/lint-conventions.mjs`, `scripts/gen-fixtures.mjs`
- `lib/gate/watcher-gate.ts`, `lib/providers/__mocks__/llm.ts`, `lib/cli/generate.ts`, `lib/cli/promote.ts` — gate fixes + instrumentation
- `.claude/skills/`, `hooks/`, `.claude/settings.json`, `docs/OPERATOR.md`, `docs/MCP-TRANSPORT.md`, `.skills/simplicio-loop-marketing/SKILL.md`
- `PRD.md`, `PROGRESS.md`, `CHANGELOG.md`, `.gitignore`

## Validation Commands

```bash
npm run typecheck
npm run lint
npm run budget
npx playwright test
node bin/marketing-engine.mjs loop --root <tmp-host> --max-iter 2
node bin/marketing-engine.mjs doctor
```

## Validation Results

- `npx playwright test` — **217 passed, 0 failed** (baseline was 182 passed /
  4 failed; +31 new specs: events 5, savings-ledger 6, contracts 5,
  loop-drain 6, publish-verify 6, doctor 2, capstone loop-driven 1, plus the
  4 repaired).
- `npm run typecheck` — clean. `npm run lint` — clean. `npm run budget` —
  PASS (self-test proves the guard bites).
- Real CLI on a fresh host: `loop --max-iter 2` → `advanced=1 published=1
  stop=drained`, journal at `.simplicio/loop/journal.jsonl`, publish receipt
  and manifest written; `doctor` reports operator hooks present, action-gate
  selftest pass, python workers resolved.
- Operator workers: `loop_journal.py` / `task_anchor.py` / `task_backlog.py`
  selftests OK (source checkout), `hooks/action_gate.py selftest` 15/15,
  `token_budget.py --self-test` OK.
