# DOD.md — the 4-layer Definition of Done

This repo already enforces the 7-pillar DoD documented in [`CLAUDE.md`](./CLAUDE.md)
(implementation + unit + integration + system + regression + benchmark +
coverage ≥ 85% measured honestly via `c8 --all`). This file documents a
**4th layer on top of those 7 pillars**: a "correctness beyond coverage" gate,
adopted ecosystem-wide from
[simplicio-loop#579](https://github.com/wesleysimplicio/simplicio-loop/issues/579)
and tracked locally as
[simplicio-loop-marketing#99](https://github.com/wesleysimplicio/simplicio-loop-marketing/issues/99).

It does not replace the 7 pillars. A change can hit 100% line coverage and
still ship a silent-corruption bug — that is exactly what motivated this
layer, and it is what happened twice in sibling repos before this rule
existed.

## Why a 4th layer — the two motivating bugs

Both bugs below shipped in repos that already had the 7-pillar DoD, green
tests, and coverage above the documented floor. Neither was a missing
feature; both were a resolution/anchoring function that silently agreed
with itself on the examples anyone had thought to write, and silently
disagreed on a shape nobody had generated.

1. **`simplicio-dev-cli` (`mechanical_edit.py`)** — `_operation_order()`
   decided whether to honor an explicit `order` field by checking `all(...)`
   across the **whole plan**, while `_validate_overlaps()` decided overlap
   **per file**. A multi-file plan with correct explicit ordering in file A,
   plus any operation without an `order` in file B (e.g. a `create_file`),
   applied A's edits out of order — **corrupting the file silently while
   reporting `"status": "ok"`**.
2. **`simplicio-mapper` (`mapper/graph.py`)** — a symbol-detection regex used
   `^\s*` with `re.MULTILINE`. Because `\s` also matches `\n`, a definition
   preceded by a blank line (the single most common PEP8 layout in the
   world) anchored `match.start()` to the blank line above, not the real
   `def`/`class` line — **silently corrupting the line number in nearly
   every real `symbol-index.json`/`call-graph.json`**, including fabricating
   phantom self-call edges in the call graph.

Both bugs share the same shape: **two code paths process the same
structure at a different granularity** (whole-plan vs. per-file; the line
containing the pattern vs. the line the pattern's own whitespace class
swallows), example tests only ever exercised the case where both paths
agreed, and the reported status ("ok" / a line number) was trusted instead
of the actual output content being checked.

### The same class of risk in this repo's domain

This repo has no source-code parser or edit-plan applicator, but it has the
exact same *shape* of risk, just in a different domain: **provider routing
and content fan-out instead of parsing/graphs**.

- `lib/router.ts` resolves `task_type` + optional per-piece
  `provider_override` + `.env` state into a concrete provider name. A
  silent-drift bug here — an override quietly ignored, an unrelated env var
  leaking into a resolution it should not touch, or two calls with
  identical inputs returning different providers — routes real client
  content to the wrong LLM/image/video vendor and reports success, because
  nothing throws. This is the direct analogue of the dev-cli bug: a
  resolution function that silently drifts to the wrong answer for an input
  shape example tests never generated.
- `caption-multi-platform` (multi-platform caption fan-out) and any future
  code that partitions the same collection of platforms/providers/pieces
  through two different functions is the direct analogue of the "two paths,
  two granularities" shape above — if one function groups by platform name
  and another by task type, they can silently disagree on the same piece.

## The 4 gates

### Gate 1 — Property-based testing on resolution/transformation logic

When a change touches logic that **resolves or transforms structured
input** (provider routing, config merging, multi-platform fan-out,
compliance rule evaluation) rather than pure formatting/glue code, hand-picked
example tests are necessary but not sufficient. Generate combinations with
[`fast-check`](https://github.com/dubzzz/fast-check) instead of relying only
on examples a human happened to write down, and assert the *invariants* that
must hold for every generated combination — determinism, "override always
wins", "unrelated config never leaks into an unrelated resolution" — not just
that a handful of fixed inputs produce a handful of fixed outputs.

- Reference implementation: [`tests/unit/router-properties.test.ts`](./tests/unit/router-properties.test.ts)
  — generates task/override/env combinations for `routeLLM`/`routeImage`/
  `routeVideo`/`routeLLMFallback` and asserts resolution is deterministic,
  a non-empty override always wins, and env noise never leaks across an
  unrelated task.
- Not every touched file needs a property test — only the resolution/
  transformation class above. A CLI wrapper or a Markdown renderer does not.

### Gate 2 — Fixtures with real content, not minimal synthetic briefs

When a test exercises content generation, compliance auditing, or caption
fan-out, at least one test case should use a real (or close-to-real) client
brief/piece, not a two-line synthetic fixture. The mapper bug above only
appeared with idiomatic PEP8 formatting (a docstring plus a blank line
before `def`) — a minimal artificial snippet never exposed it. The same
risk applies here: a two-sentence synthetic brief will not exercise the
line breaks, emoji, multi-paragraph structure, or locale quirks a real
client piece has, and those are exactly where formatting-sensitive bugs in
`content-engineering-authentic` / `compliance-generic` hide.

- Reference fixture and integration test:
  [`tests/fixtures/real-content/asolaria-on-metal-piece.md`](./tests/fixtures/real-content/asolaria-on-metal-piece.md)
  and [`tests/integration/real-content-pipeline.test.ts`](./tests/integration/real-content-pipeline.test.ts)
  exercise a near-real pt-BR piece with paragraphs, lists, punctuation, emoji,
  evidence caveats, and compliance language through parsing, compliance, and
  the canonical caption fan-out.

### Gate 3 — Invariant review checklist in the PR template

When a PR adds or edits a function that processes the **same** collection
that another function already processes (platforms, providers, pieces,
task types), the PR must explicitly answer: *do both functions agree on the
same grouping/partitioning key?* This is a review question, not a test — it
catches interaction bugs (different granularity between two paths) that no
single-function unit test can catch by construction, because the bug only
exists in the disagreement between the two functions, not in either one
alone. See the checklist item added to
[`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md).

### Gate 4 — Assert on the observable result, not the reported status

Integration/system tests that apply a change (a piece through the pipeline,
a plan through an applicator) must assert on the **actual resulting
content** (the generated file, the resolved provider, the final caption
set), never only on the tool's own reported exit code or `"status": "ok"`
field. The dev-cli bug reported success while corrupting the file; a test
that only checked the reported status would have stayed green forever.
`tests/integration/**` and `tests/system`-shaped specs in this repo already
lean this way (they read back generated artefacts); this gate makes it an
explicit, permanent rule rather than an implicit habit.

## Relationship to the existing 7 pillars

| # | Pillar (`CLAUDE.md`) | This file adds |
|---|---|---|
| 1 | Implementation | — |
| 2 | Unit | Gate 1 (property-based invariants on resolution logic) |
| 3 | Integration | Gate 2 (real-content fixtures) + Gate 4 (observable result) |
| 4 | System | Gate 4 (observable result) |
| 5 | Regression | — (regression by definition only catches what was already seen; Gate 1 exists precisely because regression cannot) |
| 6 | Benchmark | — |
| 7 | Coverage ≥ 85% | — (coverage% measures lines executed, not scenario/combination coverage; Gate 1 is the direct answer to that gap) |

`npm test` (`test:node` + `test:e2e`) must stay 100% green with these gates
applied — this file is additive, not a relaxation of the existing DoD.

## Implemented references

Issue #99 is covered across both risk surfaces: provider routing properties in
`tests/unit/router-properties.test.ts`, caption fan-out properties in
`tests/unit/caption-properties.test.ts`, and near-real content in
`tests/integration/real-content-pipeline.test.ts`. Mutation testing remains a
possible future hardening measure, not an acceptance criterion of #99.
