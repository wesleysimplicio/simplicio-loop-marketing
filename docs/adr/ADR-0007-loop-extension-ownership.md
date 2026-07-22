# ADR-0007: Loop core authority and drift-free marketing projections

**Status:** Accepted — 2026-07-22. **Contract:** `simplicio.loop-extension/v1`.

## Decision

`simplicio-loop` is the sole authority for run/task/stage/attempt lifecycle, leases,
fences, retries, receipts, findings, reporting, replication, and completion. This
repository declares only the `loop.marketing` domain manifest and an adapter to the
public upstream contract. It does not implement a coordinator, scheduler, queue,
ledger, or completion engine. Standalone means the same core embedded.

Yool and the TypeScript journal are disposable read models. Reconciliation always
applies core receipts over local state, ordered by task and revision and deduplicated
by `receipt_id`. Critical capability or compatibility failures are `BLOCKED`;
only absent optional execution modes may be `DEGRADED`.

## Ownership matrix

| Field/state | Owner | Writer | Reader | Reconciliation |
|---|---|---|---|---|
| run/task/stage/attempt/status | Loop core | Loop coordinator | adapter/views | core receipt wins |
| fence token/revision | Loop core | lease/receipt subsystem | effect handlers/views | highest core revision wins |
| terminal/completion | Loop core | completion engine | marketing views | never promoted locally |
| evidence/truth class | Loop core | core receipt writer | gates/views | copied losslessly |
| campaign/piece/content | Marketing | marketing handlers | Loop stages | versioned domain schema |
| client compliance/policy | Marketing | compliance gate | core gate | fail-closed refinement only |
| Yool tuple/journal | Marketing projection | reconciler | UI/operator | rebuild from receipts |
| external publish/ads/comments | Marketing handler | authorized fenced effect | core receipt | idempotency key + receipt |

No row has two authoritative writers.

## Compatibility, rollback, and inventory

The lock records the upstream version/commit, adapter version, supported schemas,
manifest hash, and required/optional/forbidden capabilities. Rollback restores both
`manifest.json` and `manifest.lock.json` from the last release, then runs
`marketing-engine operator doctor --json` before work is admitted.

Legacy `$SIMPLICIO_LOOP_ROOT` integration points were inventoried in the operator
hooks. They remain operator-only; the extension adapter uses the variable solely to
locate the installed public Python package. Local journal and Yool fail-open writes
are projections only and therefore cannot manufacture terminal success.
