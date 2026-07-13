# Evidence

Evidence proves that a change works in the running application, not only in code.

For piece completion, the fail-closed gate is:

```bash
marketing-engine evidence gate <piece-id>
```

The command prints JSON:

```json
{
  "piece_id": "PIECE-2026-001",
  "pass": true,
  "missing": [],
  "evidence_paths": [
    ".marketing-engine/outputs/acme/2026-05-08/PIECE-2026-001/evidence.png"
  ]
}
```

Required completion evidence for a piece:

- `manifest.json` present and schema-valid
- `compliance.json` with `pass: true`
- `qa-tech-specs.json` with `pass: true`
- `captions.json` with the 4 review variants (`instagram`, `tiktok`, `linkedin`, `x`)
- passing watcher report via `watcher_report_path`
- non-empty `data/runs.jsonl` and `data/llm-usage.jsonl`
- at least one evidence artifact path (for example screenshot, video, trace, or HTML report)

The watcher JSON alone is not enough to satisfy completion: the gate also requires a real artifact path.

## Default output

```text
.runtime-logs/evidence/
  <feature>-<scenario>-<timestamp>.png
  <feature>-<scenario>-<timestamp>.webm
  <feature>-<scenario>-<timestamp>-trace.zip
```

## Default command

```bash
npm run test:e2e
```

## Checklist

- [ ] Evidence matches the requested scenario.
- [ ] Sensitive inputs are not visible.
- [ ] The expected result is visible or asserted.
- [ ] The evidence path is referenced in the final response or PR.
