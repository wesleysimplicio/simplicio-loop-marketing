$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:BASE_URL)) {
    $env:BASE_URL = "https://example.com"
}

Write-Host "Capturing Playwright evidence for $env:BASE_URL"
npx playwright test --project=chromium
