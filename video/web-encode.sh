#!/usr/bin/env bash
# Re-encodes a Remotion-rendered MP4 to a web-safe profile.
#
# Why: Remotion's default render comes out as profile=High (100) with
# pix_fmt=yuvj420p (JPEG full color range). Many web players (GitHub
# blob viewer, Safari, mobile browsers) refuse to play that combo.
# This script transcodes to:
#   - H.264 Main profile (level 4.0)
#   - yuv420p, TV (limited) color range, BT.709 primaries
#   - moov atom moved to the front (-movflags +faststart) for streaming
#
# Usage: ./web-encode.sh <input.mp4> [output.mp4]
#        defaults output to the same path (in-place replace via temp file)
set -e

IN="${1:?usage: ./web-encode.sh <input.mp4> [output.mp4]}"
OUT="${2:-$IN}"
FF="node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg"
[ -x "$FF" ] || FF="ffmpeg"

TMP="$(mktemp -p "$(dirname "$OUT")" --suffix=.mp4)"

"$FF" -y -i "$IN" \
  -c:v libx264 -profile:v main -level 4.0 -preset medium -crf 22 \
  -vf "scale=in_range=full:out_range=tv,format=yuv420p" \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  "$TMP"

mv -f "$TMP" "$OUT"
echo "✓ web-safe MP4: $OUT"
