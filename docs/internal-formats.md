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

Baseline mode fails on unclassified paths and reports classified internal paths
as migration work. Strict mode also fails until issues #103 and #104 are
complete. The scanner emits Markdown so evidence can be persisted through HBP
instead of creating a new internal JSON report.

Related work:

- Runtime architecture: https://github.com/wesleysimplicio/simplicio-runtime/issues/3492
- Marketing migration: https://github.com/wesleysimplicio/simplicio-loop-marketing/issues/103
- Marketing quality gate: https://github.com/wesleysimplicio/simplicio-loop-marketing/issues/104
