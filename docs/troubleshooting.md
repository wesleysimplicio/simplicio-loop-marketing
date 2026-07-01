# Troubleshooting

## Node version too old

- Symptom: `npm run test:e2e` or CLI execution aborts before tests start.
- Diagnose: run `node -v` and compare with `package.json#engines` (`>=18`).
- Fix: switch to Node 18+ (CI uses Node 20).

## Playwright exits before the suite runs

- Symptom: Playwright reports missing runtime support or browser dependencies.
- Diagnose: review the first failing lines from `npm run test:e2e`.
- Fix:

```bash
npm install
npx playwright install
```

## Workspace-dependent command says `.marketing-engine` is missing

- Symptom: `status`, `logs`, `cost`, `alerts`, `generate`, or `promote` exit with infra errors.
- Diagnose: confirm whether you are inside a host repo that already ran `marketing-engine init`.
- Fix:

```bash
node bin/marketing-engine.mjs init --root /path/to/host-repo
```

Then rerun the command from that host root.

## Provider check fails

- Symptom: `marketing-engine check` reports missing critical providers.
- Diagnose: inspect `.env`, host `.marketing-engine/.env`, and shell env for required keys.
- Fix: populate the missing vars or keep the flow in `DRY_RUN=true` with mocks where applicable.

## Claims / watcher gate blocks promotion

- Symptom: promote loop skips a winning piece with `gate-blocked` output.
- Diagnose: inspect `.marketing-engine/data/gate/<piece-id>.json` and `<piece-id>.enforcement.json`.
- Fix: correct the underlying script/caption issue, regenerate the piece, and only promote once watcher checks pass.

## CLI subcommand fails with tsx / module-loader errors

- Symptom: `marketing-engine <subcommand>` fails before reaching repo logic.
- Diagnose:

```bash
npm install
node bin/marketing-engine.mjs help
```

- Fix: ensure local dependencies are installed and rerun from the package root or a correctly initialized host repo.

## Playwright evidence needed for a handoff

- Symptom: code/docs changed but the handoff has no proof.
- Diagnose: verify whether `playwright-report/` or `test-results/` were generated in the current run.
- Fix:

```bash
npm run test:e2e
```

Reference the artifact path in the final summary or PR.
