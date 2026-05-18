#!/usr/bin/env bash
set -euo pipefail

export BASE_URL="${BASE_URL:-https://example.com}"

echo "Capturing Playwright evidence for $BASE_URL"
npx playwright test --project=chromium
