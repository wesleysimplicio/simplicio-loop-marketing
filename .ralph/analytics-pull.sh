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
DRY_RUN="${DRY_RUN:-true}"
mkdir -p data
ANALYTICS_FILE="$ROOT/data/analytics.jsonl"
echo "[analytics-pull] dry_run=$DRY_RUN"
echo "[analytics-pull] would call lib/analytics/{meta,youtube,tiktok}.ts"
if [ "$DRY_RUN" = "true" ]; then
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  {
    printf '{"piece_id":"sample-001","client":"<active-client>","channel":"instagram","impressions":1200,"reach":900,"saves":48,"shares":6,"comments":3,"likes":110,"watch_time_s":4200,"captured_at":"%s"}\n' "$ts"
    printf '{"piece_id":"sample-002","client":"<active-client>","channel":"tiktok","impressions":2400,"reach":1800,"saves":12,"shares":2,"comments":1,"likes":160,"watch_time_s":5600,"captured_at":"%s"}\n' "$ts"
    printf '{"piece_id":"sample-003","client":"<active-client>","channel":"youtube","impressions":300,"reach":280,"saves":2,"shares":0,"comments":0,"likes":18,"watch_time_s":900,"captured_at":"%s"}\n' "$ts"
  } >> "$ANALYTICS_FILE"
  echo "[analytics-pull] wrote synthetic rows to $ANALYTICS_FILE"
fi
echo "[analytics-pull] done"
