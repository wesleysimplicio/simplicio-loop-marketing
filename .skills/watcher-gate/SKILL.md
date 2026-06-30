# watcher-gate

Implements N-Nest-style gate verification for the marketing loop.

## Summary

Every generated marketing output must pass through a watcher gate before it
can transition from `draft → scheduled`. The watcher re-computes the output
and verifies that what the agent reported matches what the watcher independently
found. Outputs are tagged with one of:

- **MEASURED** — verified by an independent watcher pass
- **CANON** — sourced directly from canonical brand/pillar/compliance specs
- **UNVERIFIED** — no watcher verification performed (blocked from promotion)

## Gate rules

| Rule | Trigger | Effect |
|------|---------|--------|
| Pre-flight | output missing watcher verification tag | Block draft→scheduled transition |
| Claims-gate | piece tagged UNVERIFIED in promote loop | Block ads-draft creation |
| Revision | watcher found discrepancies | Route piece to review with watcher report |

## Integration points

- `lib/gate/watcher-gate.ts` — N-Nest verification logic
- `lib/gate/claims-gate.ts` — claims classification + gate rules
- `lib/cli/generate.ts` — runs watcher gate after generation
- `lib/cli/promote.ts` — checks claims tag before promoting

## Definition of Done

- [ ] Every output of `generate` has a verification tag
- [ ] UNVERIFIED pieces are blocked from promotion
- [ ] Watcher mismatch routes piece to `review` with full report
