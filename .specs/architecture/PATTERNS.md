# PATTERNS - Marketing Engine

## Architecture patterns

- CLI entrypoints in `bin/` delegate to focused modules in `lib/cli/`.
- Provider selection is matrix-driven through `.specs/architecture/PROVIDERS.md` and helper lookups in `lib/providers/matrix.ts`.
- Real providers and DRY_RUN mocks are separated in factories so tests and local runs can stay deterministic.
- Long-running workflows write evidence artifacts instead of hiding behavior in memory.

## Validation patterns

- Type safety uses `tsc --noEmit`.
- Regression coverage is Playwright-based, including non-browser Node-style integration tests.
- New behavior should add or update focused e2e coverage near the affected flow.

## File conventions

- Specs and workflow context live under `.specs/`.
- Reusable agent behavior lives under `.skills/` and `.agents/`.
- Generated operator artifacts live under `.marketing-engine/` or `outputs/`, depending on the flow.
- Runtime evidence commonly uses JSONL for append-only logs.

## Operational commands

- `npm run typecheck`
- `npm run test:e2e`
- `node bin/marketing-engine.mjs help`
- `node bin/marketing-engine.mjs generate`
- `node bin/marketing-engine.mjs promote`

## Change discipline

- Prefer small, auditable fixes with matching tests.
- Preserve cross-provider abstractions when adding integrations.
- Keep README and operational docs aligned with the real CLI surface.
