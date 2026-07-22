# Issue #94 — marketing stage-overlay evidence

Date: 2026-07-22. Baseline commit: `61cf9e6` (`work`). Runtime: Node.js 22.17.0.

## Delivered shadow contract

Marketing now declares a provider-neutral `loop.marketing` installation descriptor and an
executable `simplicio.loop-extension/v1` manifest. The manifest maps brief/strategy, independent
copy and creative lanes, deterministic formatting/compliance/watching, governed delivery,
reporting, and inherited completion evidence onto Loop hooks. It contains no graph composer,
scheduler, queue, worker pool, lease manager, or completion state machine.

Small handlers receive the core identifiers (`run_id`, `task_id`, `attempt`, `fence_token`) and
return hash-addressed, idempotent stage results. Deterministic caption formatting reports zero LLM
calls/tokens/cost. Metrics that are unavailable remain `null` with a reason. The external-effect
helper requires intent, authorization, idempotency key and fence, and reconciles a durable prior
confirmation before submission.

## Reproducible benchmark

The benchmark runs 20 pieces with two independent 3 ms stages. On this worker it measured:

| Path | Time | Speedup | Throughput |
|---|---:|---:|---:|
| Sequential baseline | 127.63 ms | 1.00x | 156.7 pieces/s |
| Overlay fan-out | 7.03 ms | 18.15x | 2,844.3 pieces/s |

This is a deterministic scheduling microbenchmark, not a production provider latency claim.
Provider tokens, cost, CPU, RSS, and quality are not observable in this DRY_RUN microbenchmark and
therefore are not estimated.

## Coverage and validation

Focused C8 coverage for `lib/extension/*.ts`: 99.48% statements/lines, 89.09% branches, 100%
functions. Unit coverage includes manifest identity, conflict/cycle/removal rejection,
idempotency, tenant isolation, cancellation, missing effect authority, replayed submission dedupe,
and deterministic no-LLM metrics. Integration coverage checks equivalent transport requests and
fan-out across pieces.

## Explicit upstream blocker

The authoritative core contract, composer, transport SDK, receipt persistence, leases/fences,
and conformance suite belong to `wesleysimplicio/simplicio-loop#557`, which remained open when this
change was authored. Consequently this repository cannot truthfully replace its legacy
`processPiece`/`WorkerGovernor` compatibility path, materialize a graph in Loop, prove real
embedded/daemon/remote receipts, or merge issue #94 as complete without inventing a parallel core.
The descriptor is safe shadow-mode groundwork only. Rollback is removal of `lib/extension/`, the
descriptor, and its tests; the existing DRY_RUN pipeline is unchanged.
