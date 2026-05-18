#!/usr/bin/env bash
# Lists every unresolved <PLACEHOLDER> token in the repo.
# Exit 0 = clean, exit 1 = placeholders remain.
# Exemptions: templates that are SUPPOSED to keep placeholders.

set -euo pipefail

cd "$(dirname "$0")/.."

EXEMPT_PATTERN='docs/placeholders.md|task-template.md|ADR-template.md|sprint-XX|\.template\.|_template/SKILL.md'

# Catch tokens like Marketing Engine, node-ts, <LICENSE_PLACEHOLDER>, http://localhost:3000.
matches=$(grep -RInE '<[A-Z][A-Z0-9_]+>' \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=playwright-report \
  --exclude-dir=test-results \
  --exclude-dir=coverage \
  --exclude-dir=video \
  --exclude='*.svg' \
  --exclude='*.lock' \
  --exclude='package-lock.json' \
  . 2>/dev/null \
  | grep -vE "$EXEMPT_PATTERN" || true)

if [ -z "$matches" ]; then
  echo "OK: no unresolved <PLACEHOLDER> tokens."
  exit 0
fi

echo "Unresolved <PLACEHOLDER> tokens detected:"
echo "$matches"
echo
echo "See docs/placeholders.md for what each one means."
exit 1
