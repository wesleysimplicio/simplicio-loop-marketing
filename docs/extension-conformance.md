# Marketing extension conformance and rollback

`loop.marketing` is a declarative extension of Loop core. Its canonical manifest is
`.specs/extensions/loop.marketing.json`; it never owns coordination, scheduling, queues,
ledger, fencing, or completion. `DRY_RUN` remains the default.

## Supported matrix

| Dimension | Supported |
|---|---|
| Node | 18, 20, 22 |
| Host OS | Linux and Windows |
| Core | `>=1.0.0 <2.0.0` |
| Mode | embedded, daemon, remote |
| Slots | 2, 4, 8 |
| Effects | fake/re-query in CI; real adapters only with explicit authorization |

Run `npm run conformance` before creating work. A `BLOCKED` result is terminal for the
candidate upgrade and includes a reasoned check. Metrics that are not observable in a
single run are `null` with a reason rather than estimates. Run `npm run
bench:conformance` for p50/p95/p99 and throughput.

## Upgrade and rollback

1. Change the core candidate only on a branch; never promote it automatically.
2. Run typecheck, lint, node tests, Playwright, conformance in all three modes, package
   install parity, security tests, and the benchmark.
3. Compare the manifest and composed-graph hashes with the approved receipt.
4. Canary in `DRY_RUN`; enable sandbox effects only after independent approval.
5. On any incompatibility, restore the previous core pin and manifest from version
   control, rerun conformance, and verify the previous hashes. No campaign may start
   while the report is `BLOCKED`.

The fake effect oracle models authorization, stable idempotency, re-query, and fencing:
replay returns the original receipt, forged approvals fail, and stale fences cannot
change state. Filesystem evidence is constrained to the run root and secret/PII-shaped
fields are redacted recursively.
