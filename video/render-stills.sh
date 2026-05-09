#!/usr/bin/env bash
# Renders one still per scene for a single locale.
# Usage:
#   ./render-stills.sh           # pt-BR (default)
#   ./render-stills.sh pt-BR
#   ./render-stills.sh en
# To produce both locales, run the script twice:
#   ./render-stills.sh pt-BR && ./render-stills.sh en
#
# Portable across Bash 3.2 (macOS) and Bash 4+ — uses a parallel
# indexed array of "<name>:<frame>" pairs, not associative arrays.
set -e

LOCALE="${1:-pt-BR}"
case "$LOCALE" in
  pt-BR) COMP="marketing-engine-skills"; SUFFIX="" ;;
  en)    COMP="marketing-engine-skills-en"; SUFFIX="-en" ;;
  *)
    echo "unknown locale: $LOCALE (expected pt-BR or en)" >&2
    exit 1
    ;;
esac

FRAMES=(
  "01-intro:60"
  "02-pipeline:280"
  "03-provider-agnostic:460"
  "04-llm-router:640"
  "05-copywriter-curto:820"
  "06-revisao-humanizada:990"
  "07-caption-multi-platform:1160"
  "08-higgsfield:1340"
  "09-topview:1520"
  "10-wavespeed:1700"
  "11-gpt-image:1880"
  "12-video-prompt-builder:2060"
  "13-compliance:2240"
  "14-qa-tech-specs:2420"
  "15-dod-outro:2620"
)

for entry in "${FRAMES[@]}"; do
  name="${entry%%:*}"
  frame="${entry##*:}"
  out="out/${name}${SUFFIX}.png"
  echo "=== ${LOCALE} :: ${name} (frame ${frame}) -> ${out} ==="
  node_modules/.bin/remotion still \
    src/index.ts "${COMP}" "${out}" \
    --frame="${frame}" --scale=0.667 --log=error
done
