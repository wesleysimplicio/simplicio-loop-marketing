# E2E Tests

The starter ships with a generic Playwright smoke test.

Run it with:

```bash
BASE_URL=http://localhost:3000 npx playwright test --project=chromium
```

Replace or extend `smoke.spec.ts` with project-specific scenarios:

- login or demo access
- primary navigation
- critical business flow
- expected data/result visible on screen
- screenshot/video/trace saved as evidence

Keep tests deterministic. If a project needs external access such as VPN, document it in `docs/local-setup.md`.
