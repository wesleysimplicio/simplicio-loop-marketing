# Architecture Map

## System Shape

- Type: FULLSTACK
- Frontend: not detected
- Backend: not detected
- Database: none documented
- Jobs/workers: detected in repository text
- External integrations: GitHub, OpenAI, Playwright

## Local URLs

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:3000 | generated default for detected web stack |

## Request Path

```text
Maintainer or AI agent -> project manifest/docs -> runtime entrypoint -> validation commands -> evidence
```

## Key Directories

- `bin` — top-level area detected during bootstrap
- `e2e` — top-level area detected during bootstrap
- `lib` — top-level area detected during bootstrap
- `outputs` — top-level area detected during bootstrap

## Authentication

- Flow: not detected
- Local/demo credentials: not documented
- Token/session storage: not detected
- Common failure mode: missing local environment variables or auth provider configuration

## Observability

- App logs: stdout / terminal output
- API logs: stdout when backend is present
- Job logs: not detected
- Request correlation: not detected

## Deployment

- Environments: local plus CI-managed environments if configured
- CI/CD: GitHub Actions when present under .github/workflows
- Release notes/changelog: CHANGELOG.md
