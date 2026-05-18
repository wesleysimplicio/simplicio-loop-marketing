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

## DoD checklist

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test:e2e` is green
- [ ] No `.env`, secrets, or client PII included
- [ ] No hardcoded provider names inside skills (routed through `lib/router.ts`)
- [ ] New behavior covered by at least one Playwright spec (or N/A)
- [ ] Conventional commit message used
- [ ] ADR added under `.specs/architecture/` if decision is architectural and irreversible
- [ ] CHANGELOG entry added in [`CHANGELOG.md`](../CHANGELOG.md) if release-relevant
