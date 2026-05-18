$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$source = $env:LLM_PROJECT_MAPPER_SOURCE

if ($source -and (Test-Path (Join-Path $source "bin\cli.js"))) {
    node (Join-Path $source "bin\cli.js") --update
} else {
    npx --yes @wesleysimplicio/llm-project-mapper@latest --update
}
