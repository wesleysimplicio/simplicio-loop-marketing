## Issue #94 result (2026-07-22)

**BLOCKED / NEEDS-IMPLEMENTATION.** The shadow `loop.marketing` manifest, core-context handler
boundary, deterministic worker, fenced effect helper, tests, coverage and benchmark are green. The
mandatory upstream `simplicio.loop-extension/v1` loader/composer/SDK and conformance artifacts are
still unavailable while `simplicio-loop#557` is open. Therefore the legacy compatibility runner was
not removed, no parallel Marketing scheduler was invented, and issue #94 must not be closed or
merged as complete. Evidence and rollback details: `docs/evidence/issue-94-overlays.md`.

# Goal Result

## Issue #86 dependency audit — 2026-07-22

Status: **BLOCKED — no implementation or completion claim**.

Issue #86 is an integration epic whose ordered child issues #87–#96 were
unresolved at audit time. The audit intentionally avoided duplicating their
extension, conformance, release, and prototype-gate scopes. The upstream
extension dependency was closed, but the audited checkout had no registered
`loop.marketing` extension, so implementation, coverage, benchmark, and
completion claims remain fail-closed.

Recorded unblock conditions: land or explicitly re-scope the ordered children,
pin the upstream contract and hashes, run embedded/daemon/remote conformance,
then evaluate coverage, restart safety, and composition benchmarks.

## Issue #89 — 2026-07-22

Status: **BLOCKED**. The current main branch lacks the #87 extension
manifest/TypeScript bridge and the #88 dedicated role bindings on which #89
explicitly depends. The upstream contract slice also states that installed
extension conformance, the Marketing TypeScript bridge, and graph-hash
receipts remain out of scope. A local coordinator, claim manager, ledger, or
mock bridge would violate #89 rather than implement it. The inspected SHAs,
reproduction commands, missing evidence, and unblock sequence are documented
in `docs/evidence/issue-89-blocker.md`.

## Issue #87 — versioned extension contract (2026-07-22)

Implemented the repository-owned portion: manifest/lock, ownership ADR, TypeScript
adapter, fail-closed doctor, lossless conversion, idempotent reconciliation, unit,
integration, E2E/recovery, regression coverage, and benchmark. Touched extension code
has 100% statement/line/function coverage and 72.83% aggregate branch coverage
(`contract.ts` 85.71%; `reconcile.ts` branch instrumentation counts interface/type lines).

**External blocker:** upstream Loop v3.38.1 at commit
`b5ddbd6af76392198906e61d0911a236eca3bcf8` contains the Python manifest validator,
but no official TypeScript SDK, `probe_capabilities()`, core receipt/reconciliation API,
or embedded/daemon/remote conformance runner. The implementation therefore fails closed
with `REQUIRED_CAPABILITY_MISSING`; merge/issue closure must wait for that upstream
surface and a rerun of conformance in all three modes.

## Issue #90 — Marketing reporting/findings extension (2026-07-22)

Implemented the repository-owned reporting projection, deterministic finding
fingerprints, completion audit, and focused unit/integration/regression/benchmark
coverage. Upstream core receipt and remote-requery capabilities remain external;
the extension fails closed when they are unavailable.

## Issue #106 (2026-07-22)

Implemented the reproducible issue inventory/audit and published receipts under `docs/audits/`.
The fail-closed result is **BLOCKED**: 0 of 84 accessible issues currently meet the ten-section
contract, and this worker has no authenticated remote-mutation capability. Test and benchmark
evidence is recorded in `docs/audits/EVIDENCE.md`; issue #106 must remain open.

## Current run — 2026-07-11

## Issue #91 — 2026-07-22

Implemented the marketing-domain declarations for Continuous Evolution,
Adaptive Architecture and Elastic Replication without introducing a coordinator,
scheduler, queue, ledger or completion engine. The extension manifest and policy
evaluators keep defects as findings, create deterministic deduplicated RFCs for
evolution, protect compliance/safety, bind replication to finite budgets, accept
only independently verified isolated candidates, reject stale/late receipts and
automatically request rollback for regressive canaries.

Evidence: focused coverage is 100% statements/functions/lines and 96.72% branch;
the receipt hot path processed 10,000 candidates in 8.06ms; all 217 Node tests and
253 Playwright tests passed. The upstream conformance modes remain a responsibility
of the Loop core and its bridge work tracked by dependencies #87–#90; this change
declares the required `extension_version` and `composed_graph_hash` receipt fields
but does not counterfeit core receipts.

## Issue #92 — extension conformance certification (2026-07-22)

Implemented the repository-owned conformance matrix/oracle for `loop.marketing`.
Compatible candidates produce stable manifest and composed-graph hashes;
incompatible candidates are blocked before work. The packed-install path
exercises declared modes, fail-closed gates, independent role bindings, and a
fenced/idempotent fake publish effect. Upgrade remains manual and requires
conformance plus canary evidence; rollback restores the last compatible pin.
Release detection and ecosystem publication remain owned by issue #95.

## Issue #93 — Loop core/Hub extension integration (2026-07-22)

Implemented `loop_marketing` as a declarative `simplicio.loop-extension/v1`
consumer without adding a daemon, coordinator, queue, scheduler, lease manager,
or completion engine. It fails before campaign work on incompatibility, delegates
budgets and exactly-once authority to core, and rebuilds views from receipts.
Focused unit, integration, regression, system, and benchmark evidence is
recorded in the PR.

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

## Issue #95 — Loop core release train (2026-07-22)

Implemented the marketing-side consumer: versioned extension manifest, immutable core lock,
fail-closed release compatibility and diffs, canary/rollback, migration plan generation,
15-minute reconciliation automation, doctor visibility, and release identities in campaign
manifests. The consumer does not copy the upstream contract schema and introduces no
coordinator, scheduler, queue, or completion authority.

The external train remains blocked because `simplicio-loop` has not published the required
`simplicio.component-release/v1` artifact from issue #558. Consequently no real latest
candidate can pass the official embedded/daemon/remote evidence lane or be promoted to
stable; local fixtures prove both compatible and breaking paths without representing them
as upstream evidence.
