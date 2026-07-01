# Architecture Map

## System Shape

- Type: CLI-first automation package
- Frontend: none in the main package; the `video/` subproject renders Remotion assets separately
- Backend: none; execution happens through CLI commands under `bin/marketing-engine.mjs` + `lib/cli/*.ts`
- Database: none; state is file-backed under `.marketing-engine/data/` and `outputs/`
- Jobs/workers: generate loop, promote loop, Notion sync, and schedule installers for cron / launchd
- External integrations: LLM/image/video providers, AdaptlyPost, Meta Ads, Notion, Playwright, GitHub Actions

## Local URLs

Nenhuma URL local é obrigatória para o pacote principal.

| Surface | Entry | Notes |
|---|---|---|
| CLI | `node bin/marketing-engine.mjs help` | principal smoke check local |
| Hosted workspace | `.marketing-engine/` | criado em um host repo via `marketing-engine init` |

## Request Path

```text
Maintainer or AI agent
  -> bin/marketing-engine.mjs
  -> lib/cli/<command>.ts
  -> router / providers / gate / publish modules
  -> .marketing-engine/{pieces,data,outputs}
  -> Playwright evidence + JSONL runtime logs
```

## Key Directories

- `bin/` — published CLI entrypoint and command dispatch
- `lib/cli/` — operational commands (`generate`, `promote`, `status`, `sync`, `schedule`, etc.)
- `lib/providers/` — provider contracts, matrix, mocks, and concrete adapters
- `lib/gate/` — watcher / claims discipline before promotion
- `lib/publish/` — publishing and ads handoff surfaces
- `e2e/` and `tests/e2e/` — Playwright-based regression and evidence harnesses
- `.specs/` — canonical product / architecture / routing docs
- `outputs/` and `.marketing-engine/data/` — generated artifacts and runtime telemetry

## Runtime State

- Provider credentials are env-driven (`.env` or host `.marketing-engine/.env`).
- Default safety posture is `DRY_RUN=true` unless explicitly overridden.
- Workspace-dependent commands (`status`, `logs`, `cost`, `alerts`) expect `.marketing-engine/` to exist in the host root.

## Observability

- Command output: stdout / stderr from `bin/marketing-engine.mjs`
- Runtime logs: `.marketing-engine/data/runs.jsonl`, `llm-usage.jsonl`, `promotions.jsonl`, `analytics.jsonl`
- Gate artifacts: `.marketing-engine/data/gate/*.json`
- Evidence: `playwright-report/`, `test-results/`, attached CLI stdout/stderr artifacts in Playwright
- Change history: `CHANGELOG.md`, `PROGRESS.md`, `GOAL_RESULT.md`

## Deployment

- Package publishing + CI live in `.github/workflows/`
- `ci.yml` runs `npm ci`, `npm run typecheck`, and `npm run test:e2e`
- `dod.yml` verifies structural Definition of Done surfaces
- `release.yml` is the release automation entrypoint
- Release notes source of truth: `CHANGELOG.md`
