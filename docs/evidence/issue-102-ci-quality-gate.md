# Issue #102 — blocking CI quality and coverage evidence

- Parent audit: `wesleysimplicio/simplicio-loop#582`
- Repository baseline: `main` at `61cf9e6a2f90d6c5743a7607d4460002c9295c46`
- Environment: Codex Cloud, Linux, Node 22.22.2, npm 11.4.2

## Decision and reconstruction trail

The baseline had only the isolated `internal-format-policy` workflow and `npm run coverage`
reported coverage without failing below a threshold. The new `quality-gate` runs on pull requests
and pushes to `main`, grants read-only contents permission, cancels superseded runs, and splits
quality/coverage from system/E2E validation. `npm run ci:verify` checks the trigger, command, npm
script, permission, timeout, and threshold references and fails closed on drift.

The enforced global floors are 85% for lines, statements, and functions and 70% for branches.
The touched integrity implementation measured 100% lines/statements/functions/branches (65/65
lines and statements, 3/3 functions, 26/26 branches). The complete measured suite reported
87.64% lines/statements, 86.98% functions, and 74.40% branches.

## Reproduction and failure evidence

Commands executed from the repository root:

```text
npm ci
npm run ci:verify
node --import tsx/esm --test tests/unit/ci-quality-gate.test.ts
npx playwright test e2e/quality-gate.spec.ts
npm run coverage
npm run typecheck
```

`npm run claims:audit` was also inspected but is not promoted into this gate: unchanged `main`
currently reports five missing watcher variables in `.env.example`. That pre-existing audit debt is
outside issue #102; adding a known-red command would make every PR unmergeable rather than improve
the reliability of this focused gate.

The mutation test removes the lint command and all coverage flags from a temporary copy. The
checker returns `pass: false` with `workflow does not run: npm run lint`, `coverage script must
fail when thresholds are missed`, and the missing 85% threshold errors. Temporary resources are
deleted in `finally`; production/provider calls remain mocked and no credentials enter artifacts.

No benchmark is required: this change validates static CI configuration once per run and does not
alter a runtime hot path or state machine. Existing TOON hot-path coverage continues to print its
measured 500-iteration mean during `npm run coverage`.
