# Reproducible issue audit

Issue #106 is audited by `npm run audit:issues`. The command reads every page of the public
GitHub Issues API (oldest first), excludes pull requests, and writes two receipts:

- `issues.json`: versioned machine-readable inventory, counts, references, dependency hints,
  missing contract sections, risk flags, and a fail-closed closure decision.
- `issues.md`: human-readable inventory and dependency/decision matrix.

For a network-independent reproduction, first save the API response as one JSON array and run:

```bash
AUDIT_ISSUES_INPUT=/path/to/issues.json npm run audit:issues
```

The offline input is intentionally not committed: issue bodies may later acquire private data or
secret-shaped examples. The committed receipts retain metadata and findings, never full bodies.

## Scope and closure boundary

The tool measures specification conformance; it does not silently rewrite or close remote issues.
Changing an issue body, labels, state, project links, or cross-repository dependencies requires an
authenticated GitHub identity and human review. The report therefore says `NEEDS-SPEC` and
`BLOCKED` until every remote issue has all ten required sections and no unresolved risk. A zero
percent result is evidence of a failed gate, not a successful audit claim.

The project remains a marketing extension: it owns briefing, copy, creative, compliance,
publication, cost and marketing-metrics workflows, while the Loop core owns generic orchestration
and lifecycle contracts. Cross-project contract breaks must be recorded as linked issues rather
than duplicated here.

## Test matrix

| Layer | Evidence |
|---|---|
| Unit | complete/missing contracts, dependency extraction, secret redaction |
| Integration | pagination, API timeout/failure surface |
| System/E2E | CLI produces JSON and Markdown receipts from an offline snapshot |
| Regression | incomplete inventories remain explicitly blocked |
| Performance | 10,000-record audit budget, with measured duration in test output |
| Security | secret-shaped input is flagged and excluded from findings |

Rollback is deletion of the generated receipts and audit command; no remote state is mutated.
