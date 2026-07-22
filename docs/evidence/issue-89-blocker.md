# Issue #89 blocker report

Date: 2026-07-22  
Marketing baseline: `61cf9e6a2f90d6c5743a7607d4460002c9295c46` (`origin/main`)  
Loop baseline inspected: `b5ddbd6af76392198906e61d0911a236eca3bcf8`

## Status: BLOCKED — no production implementation started

Issue #89 cannot be implemented without crossing its declared dependency and
ownership boundaries. Its two Marketing prerequisites remain open:

- #87 must provide the versioned `simplicio.loop-extension/v1` manifest and
  official TypeScript bridge/capability negotiation.
- #88 must register the dedicated Marketing roles through the Loop lifecycle.

The current Marketing main branch contains neither a `loop.marketing`
manifest nor the `stage_overlays`, `role_bindings`, or `effect_handlers`
required for #89. Implementing those here would implement #87/#88 inside #89,
contrary to the request to implement only this issue.

The upstream dependency is also incomplete for the acceptance criteria of
#89. Although Loop issue #557 is closed, its checked-in contract documentation
explicitly says that the TypeScript bridge for Marketing, installed extension
conformance, receipt-embedded composed-graph hash, and cross-repository
migration are not covered by the delivered slice. The available
`scripts/conformance_suite.py` is stage-agent conformance and exposes no
extension mode/profile for embedded, daemon, and remote execution.

## Why a local substitute is not acceptable

The issue forbids this repository from creating a coordinator, DAG engine,
scheduler, queue, ledger, lease/fence implementation, recovery engine, or
completion engine. A Marketing-local claim manager or exactly-once ledger
would therefore make the tests pass by violating the principal architectural
acceptance criterion. Stubbing the missing bridge or roles would likewise use
mocks in a production path and could not prove the required three-runtime
conformance.

## Reproduction

```bash
git fetch origin main --prune
git rev-parse HEAD origin/main
rg -n "simplicio\.loop-extension|loop\.marketing|stage_overlays|role_bindings|effect_handlers" . \
  --glob '!node_modules/**' --glob '!video/node_modules/**'

git clone --depth 1 https://github.com/wesleysimplicio/simplicio-loop.git /tmp/simplicio-loop-upstream
git -C /tmp/simplicio-loop-upstream rev-parse HEAD
sed -n '1,240p' /tmp/simplicio-loop-upstream/contracts/loop-extension/v1/SCHEMA.md
python /tmp/simplicio-loop-upstream/scripts/conformance_suite.py --help
```

Observed results:

- local `HEAD` and `origin/main` both resolve to the Marketing baseline above;
- the Marketing contract search returns no matches;
- upstream `SCHEMA.md` lists the required Marketing bridge, installed
  conformance, graph hash receipts, and migration as not covered;
- the upstream conformance command accepts only runtime names and report paths,
  and identifies itself as the stage-agent conformance suite.

## Required unblock sequence

1. Land #87 with a pinned manifest/lock, supported official TypeScript bridge,
   capability probe, graph-hash receipt contract, and incompatible-version
   fail-fast behavior.
2. Land #88 with the dedicated role identities and negative-authority rules
   needed by the claim and promotion boundaries.
3. Publish the Loop extension conformance entry point that can execute a
   Marketing extension in embedded, daemon, and remote modes.
4. Rebase #89 on those commits, then implement only Marketing declarations,
   effect handlers, projections, and tests against the core-owned coordinator.

## Evidence intentionally not fabricated

No claims/fan-out/effects code, coverage percentage, collision benchmark,
exactly-once receipt, or green three-runtime conformance result is reported.
Those artifacts would be misleading until the authoritative dependencies
exist. Per issue #89's closure rule, the correct result is `BLOCKED`, not
`COMPLETE`.
