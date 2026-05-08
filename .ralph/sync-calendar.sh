#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
NOTION_CALENDAR_DB_ID="${NOTION_CALENDAR_DB_ID:-}"
NOTION_TOKEN="${NOTION_TOKEN:-}"
if [ -n "$NOTION_CALENDAR_DB_ID" ] && [ -n "$NOTION_TOKEN" ]; then
  echo "[sync-calendar] would pull from Notion (NOTION_CALENDAR_DB_ID=$NOTION_CALENDAR_DB_ID)"
else
  echo "[sync-calendar] WARN: NOTION_TOKEN or NOTION_CALENDAR_DB_ID unset; skipping pull"
fi
echo "[sync-calendar] done"
