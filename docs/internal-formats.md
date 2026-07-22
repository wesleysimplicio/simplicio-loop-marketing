# Internal format policy

Marketing campaign state is being migrated to the shared Simplicio binary
contracts. The policy is recorded in config/json-boundaries.toml.

- HBP is the target for append-only runs, journals, approvals and evidence.
- HBI is the target for indexed manifests and asset/run snapshots after Runtime
  HBI v1 conformance exists.
- TOML is used for human-authored configuration and policy.
- JSON is not an internal persistence, cache, IPC, queue or evidence format.
- Provider/toolchain JSON is isolated at an exact boundary and never becomes the
  domain source of truth.

The first production slice uses a checksummed, versioned 16-byte envelope:
`HBP\0` frames form append-only streams and `HBI\0` holds one atomic indexed
snapshot. Payloads use Node's typed structured-clone serializer; bounds and a
checksum are validated before deserialization. HBI writes use a same-directory
temporary file, `fsync`, and atomic rename.

Legacy JSON is accepted only by the explicit one-shot migrator in
`lib/formats/migrate.ts`. It has a 64 MiB input bound, dry-run mode, immutable
`.bak` preservation, staging-file verification, atomic publication and
idempotent resume. Runtime readers never fall back to JSON.

Implemented ownership:

- run state: `data/runs.hbp`;
- global and per-piece attempt journals: `journal.hbp`;
- piece manifest/index: `manifest.hbi`;
- mapper bootstrap configuration: `.starter-meta.toml`.

Related work:

- Runtime architecture: https://github.com/wesleysimplicio/simplicio-runtime/issues/3492
- Marketing migration: https://github.com/wesleysimplicio/simplicio-loop-marketing/issues/103
- Marketing quality gate: https://github.com/wesleysimplicio/simplicio-loop-marketing/issues/104
