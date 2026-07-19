<!--
Thanks for the PR. Fill in every section below. Keep it short.
-->

## Summary

<!-- One or two sentences. What does this change and why? -->

## Changes

<!-- Bulleted list of the concrete edits. Mention files when it helps. -->

-
-
-

## Invariant check (see [`DOD.md`](../DOD.md) Gate 3)

<!--
If this PR adds or edits a function that processes the SAME collection
another function already processes (platforms, providers, pieces, task
types) -- do both functions agree on the same grouping/partitioning key
(platform name, task_type, etc.)? Answer explicitly below, or write N/A if
no such overlap exists in this change.
-->

-

## Observable-result evidence (see [`DOD.md`](../DOD.md) Gate 4)

<!--
Paste the actual resolved output (generated file / resolved provider /
caption set / test output) this change produces -- not just an exit code or
"passed" status. If this PR does not touch resolution/generation logic,
write N/A.
-->

-

## DoD checklist

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test:e2e` is green
- [ ] No `.env`, secrets, or client PII included
- [ ] No hardcoded provider names inside skills (routed through `lib/router.ts`)
- [ ] New behavior covered by at least one Playwright spec (or N/A)
- [ ] Resolution/transformation logic touched (routing, config merge, fan-out) has a `fast-check` property test covering the invariant, or N/A ([`DOD.md`](../DOD.md) Gate 1)
- [ ] Invariant question above answered (not left blank), or N/A
- [ ] Conventional commit message used
- [ ] ADR added under `.specs/architecture/` if decision is architectural and irreversible
- [ ] CHANGELOG entry added in [`CHANGELOG.md`](../CHANGELOG.md) if release-relevant
