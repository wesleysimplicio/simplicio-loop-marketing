# Anchor CLI

`marketing-engine anchor` is the standalone worker for campaign anchors from issue #65.

Commands:

- `marketing-engine anchor create --client <slug> --campaign <slug> --channels <csv> --primary-kpi <kpi> [--dry-run] --acceptance <id=description>`
- `marketing-engine anchor check --client <slug> --campaign <slug> [--channels <csv>] [--primary-kpi <kpi>]`
- `marketing-engine anchor gate --client <slug> --campaign <slug> --status <id=true|false> [--override-reason <text>]`
- `marketing-engine anchor selftest`

Behavior:

- `create` writes `outputs/<client>/<campaign>/anchor.json`.
- `check` exits with code `2` when drift is detected.
- `gate` exits with code `2` while any acceptance criterion is unverified.
- blocked gates append a `gate` event with `status=blocked`; overrides append `human_override`.
- `selftest` exercises create/check/gate locally without requiring the full loop.
