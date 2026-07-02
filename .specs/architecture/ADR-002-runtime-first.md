# ADR-002 — Runtime-First Stack (no required simplicio-sprint / simplicio-prompt)

## Status

Accepted, 2026-07-02. Issue #47 (parent epic: #46).

## Context

The broader Simplicio ecosystem includes `simplicio-runtime` (the
orchestration kernel), `simplicio-sprint` (task-graph/agent-ops adapter),
and `simplicio-prompt` (scoped prompt-envelope/token-economy adapter). All
three are available first-party adapters, but `simplicio-loop-marketing`
does not import, shell out to, or otherwise depend on `simplicio-sprint`
or `simplicio-prompt` anywhere in `lib/`, `bin/`, `bootstrap.sh`, or
`bootstrap.ps1` — confirmed by repo-wide search as part of this ADR.
`simplicio-runtime` already embeds the capabilities this project actually
uses: a loop/dev-cli, workflow orchestration, evidence capture, and the
Yool tuple/HAMT primitive (`.specs/architecture/YOOL-BOARD.md`,
`lib/yool/board.ts`). Introducing `simplicio-sprint`'s task graph or
`simplicio-prompt`'s envelope format as a *required* dependency would
duplicate contracts this repo already owns: `lib/pieces/frontmatter.ts`
(piece envelope), `lib/yool/board.ts` (task/tuple graph), and
`lib/cli/*.ts` (the CLI contract itself).

## Decision

1. `simplicio-runtime` is the orchestration layer this project depends on.
   The embedded loop/dev-cli/workflow/evidence/Yool capabilities are the
   default and only required path.
2. `simplicio-sprint` and `simplicio-prompt` are optional compatibility
   tools only, adopted if a concrete future use case proves value (for
   example, cross-repo task-graph visibility spanning multiple Simplicio
   projects). Until then they are not installed, not required by
   `bootstrap.sh`/`bootstrap.ps1`/`bin/marketing-engine.mjs`, and not
   referenced by any skill or agent prompt as a hard dependency.
3. `.skills/simplicio-loop-marketing/SKILL.md` (the root orchestrator,
   issue #48) documents the minimal stack explicitly so a new contributor
   does not assume `simplicio-sprint`/`simplicio-prompt` are on the
   critical path.
4. If a future PR adds a `simplicio-sprint` or `simplicio-prompt`
   integration, it must be additive and optional — gated behind an env
   flag, never required for `generate`, `promote`, or `campaign` to run.

## Consequences

Positive:

- One fewer external binary to install for a fresh clone; `npm install`
  plus `.env` is sufficient (see `INSTALL.md`, `SETUP.md`).
- No duplicated task-graph or prompt-envelope contract to keep in sync
  with `lib/yool/board.ts` / `lib/pieces/frontmatter.ts`.
- CI and bootstrap scripts have one fewer external dependency that can be
  missing or misconfigured in a sandboxed/offline environment.

Negative:

- Cross-repo task-graph visibility (if another Simplicio project wants to
  see this loop's tuples) requires a future explicit bridge rather than
  coming "for free" from `simplicio-sprint`.

## Alternatives Considered

- **Require `simplicio-sprint` for task tracking.** Rejected for now —
  `lib/yool/board.ts` already provides an append-only, serialized-write
  tuple board scoped to this repo's needs; adding a second task-graph
  system would be redundant until a concrete cross-repo use case exists.
- **Require `simplicio-prompt` for prompt envelopes.** Rejected — piece
  frontmatter (`lib/pieces/frontmatter.ts`) and the content templates
  (`.specs/pieces/templates/`, issue #57) already define this project's
  prompt/evidence contract.
