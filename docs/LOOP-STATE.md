# Loop state: anchors and journals

Campaign intake may create `outputs/<client>/<campaign>/anchor.json`. The anchor freezes
the allowed channels, primary KPI, DRY_RUN posture, and per-piece acceptance criteria.
`gateAnchor` returns `pass: false` and `status: blocked` while any criterion is unverified.
An override is allowed only with a reason; it is appended as a `human_override` event.

The loop journal remains append-only at `.simplicio/loop/journal.jsonl`. Each record can
include stage, strategy, resolved provider, and estimated cost. `strategyForAttempt` and
`nextStrategy` expose the provider-neutral ladder (`rewrite-hook`, `change-format`,
`change-provider`, `human-review`) so retries do not silently repeat the same approach.
