#!/usr/bin/env bash
# Checks .env against PROVIDERS.md required keys.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env not found. Copy from .env.example."
  exit 1
fi
set -a; source "$ENV_FILE"; set +a
exit_code=0
check() {
  local var="$1"; local label="$2"; local critical="$3"
  local val="${!var:-}"
  if [ -z "$val" ]; then
    if [ "$critical" = "yes" ]; then
      echo "FAIL  $label  ($var unset)"
      exit_code=1
    else
      echo "WARN  $label  ($var unset, optional)"
    fi
  else
    echo "OK    $label  ($var set)"
  fi
}
echo "== LLM providers =="
check ANTHROPIC_API_KEY "Claude (ANTHROPIC_API_KEY)" yes
check OPENAI_API_KEY "OpenAI/Codex (OPENAI_API_KEY)" no
check DEEPSEEK_API_KEY "DeepSeek" no
echo "== Image providers =="
check OPENAI_API_KEY "gpt-image (OPENAI_API_KEY)" no
check TOPVIEW_API_KEY "Topview" no
check WAVESPEED_API_KEY "Wavespeed" no
echo "== Publish =="
check ADAPTLYPOST_API_KEY "AdaptlyPost" no
echo "== Calendar =="
check NOTION_TOKEN "Notion" no
check NOTION_CALENDAR_DB_ID "Notion DB id" no
echo
if [ "$exit_code" -eq 0 ]; then
  echo "Provider check: PASS (defaults configured; warnings OK for opt-in providers)"
else
  echo "Provider check: FAIL (critical providers missing)"
fi
exit $exit_code
