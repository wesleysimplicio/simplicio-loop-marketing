#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -n "${LLM_PROJECT_MAPPER_SOURCE:-}" && -f "$LLM_PROJECT_MAPPER_SOURCE/bin/cli.js" ]]; then
  node "$LLM_PROJECT_MAPPER_SOURCE/bin/cli.js" --update
else
  npx --yes @wesleysimplicio/llm-project-mapper@latest --update
fi
