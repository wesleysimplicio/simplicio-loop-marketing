# Contributing

Thanks for your interest in Marketing Engine. This guide covers how to develop locally, branch, commit, and open a PR.

## Develop locally

```
git clone https://github.com/wesleysimplicio/marketing-engine
cd marketing-engine
npm install
npm run typecheck
npm run test:e2e
```

Useful entry points while hacking:

- `bin/marketing-engine.mjs` — CLI entry.
- `lib/router.ts` — provider routing.
- `lib/providers/` — adapter implementations.
- `.skills/` — reusable, provider-neutral skills.
- `e2e/` — Playwright suite (run against mocks by default).

## Branch model

- `main` is protected. No direct pushes.
- Feature work: `feat/<short-topic>` (e.g. `feat/cli-init`).
- Bug fix: `fix/<short-topic>` (e.g. `fix/router-fallback`).
- Docs only: `docs/<short-topic>`.
- Chore/infra: `chore/<short-topic>`.

Open a PR into `main` when the branch is ready.

## Conventional commits

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/).

Examples:

```
feat(cli): add init command
fix(router): apply fallback chain on 5xx
docs(readme): clarify quick-start
test(e2e): cover compliance gate
```

Breaking changes: append `!` after the type/scope and explain in the body, e.g. `feat(router)!: change task_type contract`.

## Definition of Done (must pass before merge)

- `npm run typecheck` exits 0.
- `npm run test:e2e` is green.
- No `.env`, secrets, or client PII committed.
- Provider names are not hardcoded inside skills (route through `lib/router.ts`).
- New external behavior covered by at least one Playwright spec.
- Significant architectural decisions captured as a new ADR under `.specs/architecture/`.

CI enforces these via [.github/workflows/dod.yml](./.github/workflows/dod.yml).

## Pull request

Use the template at [.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md). Fill in summary, changes, and the DoD checklist. Mark draft PRs as `Draft` until DoD is green.

## Reporting issues

Open an issue using one of the templates under `.github/ISSUE_TEMPLATE/`:

- Bug: reproducible defect.
- Feature: new capability or enhancement.

## Code of conduct

Be respectful. Assume good intent. Disagree on the merits.
