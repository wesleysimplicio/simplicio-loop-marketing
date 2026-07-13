# Loop state: anchors and journals

Campaign intake may create `outputs/<client>/<campaign>/anchor.json`. The anchor freezes
the allowed channels, primary KPI, DRY_RUN posture, and per-piece acceptance criteria.
`gateAnchor` returns `pass: false` and `status: blocked` while any criterion is unverified.
An override is allowed only with a reason; it is appended as a `human_override` event.

The loop journal remains append-only at `.simplicio/loop/journal.jsonl`, and when the
piece output directory exists the same row is mirrored into
`outputs/<client>/<date>/<piece-id>/journal.jsonl` so per-piece reports can read the
attempt history without scanning the global ledger. Each record can include stage,
strategy, resolved provider, and estimated cost. `nextStrategy` exposes the
provider-neutral ladder (`rewrite-hook`, `change-format`, `change-provider`,
`human-review`) so retries do not silently repeat the same approach; when the ladder is
exhausted, the loop routes the piece to `review` instead of attempting a 4th identical
generation.
