#!/usr/bin/env bash
set -euo pipefail

FRONTEND_COMMAND="${FRONTEND_COMMAND:-npm run dev}"
BACKEND_COMMAND="${BACKEND_COMMAND:-npm run dev}"

echo "Starting Marketing Engine local services"
echo "Frontend URL: http://localhost:3000"
echo "Backend URL: not-applicable"

if [[ "$FRONTEND_COMMAND" == \<* || "$BACKEND_COMMAND" == \<* ]]; then
  echo "Update scripts/start.sh with the real project commands before using it."
  exit 1
fi

echo "Run frontend command:"
echo "$FRONTEND_COMMAND"

echo "Run backend command:"
echo "$BACKEND_COMMAND"
