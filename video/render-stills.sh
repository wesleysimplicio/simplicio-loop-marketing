#!/bin/bash
# Renders one still per scene for both locales.
# Usage: ./render-stills.sh [pt-BR|en]
set -e

LOCALE="${1:-pt-BR}"
if [ "$LOCALE" = "en" ]; then
  COMP="marketing-engine-skills-en"
  SUFFIX="-en"
else
  COMP="marketing-engine-skills"
  SUFFIX=""
fi

declare -A FRAMES=(
  [01-intro]=60
  [02-pipeline]=280
  [03-provider-agnostic]=460
  [04-llm-router]=640
  [05-copywriter-curto]=820
  [06-revisao-humanizada]=990
  [07-caption-multi-platform]=1160
  [08-higgsfield]=1340
  [09-topview]=1520
  [10-wavespeed]=1700
  [11-gpt-image]=1880
  [12-video-prompt-builder]=2060
  [13-compliance]=2240
  [14-qa-tech-specs]=2420
  [15-dod-outro]=2620
)

for name in "${!FRAMES[@]}"; do
  frame="${FRAMES[$name]}"
  out="out/${name}${SUFFIX}.png"
  echo "=== ${LOCALE} :: ${name} (frame ${frame}) -> ${out} ==="
  node_modules/.bin/remotion still \
    src/index.ts "${COMP}" "${out}" \
    --frame="${frame}" --scale=0.667 --log=error
done
