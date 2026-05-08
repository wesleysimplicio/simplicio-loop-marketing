#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
MAX_ITER="${1:-3}"
DRY_RUN="${DRY_RUN:-true}"
echo "[loop-generation] root=$ROOT max=$MAX_ITER dry_run=$DRY_RUN"
mkdir -p outputs data
for i in $(seq 1 "$MAX_ITER"); do
  echo "[loop-generation] iteration $i"
  # placeholder: real impl invokes Claude with .ralph/PROMPT-generation.md
done
echo "[loop-generation] done"
