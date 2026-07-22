# Loop Marketing extension boundary

`loop_marketing` is an official domain extension of the Loop core. Its pinned,
language-neutral declaration is [`extension/manifest.json`](../extension/manifest.json),
using `simplicio.loop-extension/v1` and core range `3.38.1..3.99.99`.

## Ownership

The Loop core exclusively owns workflow state, stage scheduling, priority,
claims, queues, leases/fences, retries, cancellation, rate limits, budgets,
receipts and completion. This repository supplies only marketing schemas,
adapters, declarative overlays, role specializations, stricter gates, resource
requests and governed effects. Embedded execution loads the same contract and
manifest as daemon and remote execution; it is not a second coordinator.

`lib/extension/core.ts` validates pinning and schema hashes before campaign
planning, normalizes transport receipts, and requires core authority for
effects. It implements none of the core-owned mechanisms above. Publish, ads
and comment retries first reconcile their core-owned idempotency key; an
existing confirmed receipt suppresses the duplicate mutation.

Yool and the legacy journal are compatibility/read-model surfaces only.
`lib/extension/views.ts` rebuilds the marketing view from ordered core receipts
and reports drift; it never writes authoritative workflow state.

## Operations

- `SIMPLICIO_LOOP_CORE_VERSION` selects the version checked before work exists.
- `SIMPLICIO_LOOP_EXTENSION_MANIFEST` may override the packaged manifest for
  conformance testing.
- `marketing-engine doctor` reports versions, capabilities, core-owned budget
  authority and conformance.
- `DRY_RUN=true` remains the default. Effects additionally require core
  authorization, an idempotency key, fence token and confirmation receipt.

Schema hashes use `schema-sha256:<path>:<digest>` capabilities because the
strict upstream v1 manifest has no additional hash field. Drift fails startup.
