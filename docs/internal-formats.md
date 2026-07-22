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

Baseline mode fails on unclassified paths, invalid/expired exceptions, and
reports classified internal paths as migration work. Registry entries are exact
paths: globs, duplicate paths, missing ownership/reason/target/review fields, and
expired review dates fail closed. Strict mode also fails while any classified
migration remains. Release publication runs strict mode, so the current issue
#103 migration backlog cannot be mistaken for a passing quality gate.

The scanner emits Markdown rather than creating internal JSON evidence. It can
also scan staged/generated roots through its library API; tests use that path to
prove an unclassified generated JSON file blocks the gate. HBP/HBI conformance,
legacy upgrade/rollback, installed-package compatibility, and cross-repository
tests remain blocked on the production migration tracked by #103 and released
Runtime contracts. This quality change deliberately does not invent a custom
binary layout or silently treat those unavailable checks as passing.

Related work:

- Runtime architecture: https://github.com/wesleysimplicio/simplicio-runtime/issues/3492
- Marketing migration: https://github.com/wesleysimplicio/simplicio-loop-marketing/issues/103
- Marketing quality gate: https://github.com/wesleysimplicio/simplicio-loop-marketing/issues/104
