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
#
# Portable across macOS/BSD and Linux Bash.
set -e

IN="${1:?usage: ./web-encode.sh <input.mp4> [output.mp4]}"
OUT="${2:-$IN}"

# Resolve ffmpeg: prefer the platform-specific binary that Remotion
# already shipped under node_modules; fall back to system ffmpeg.
resolve_ffmpeg() {
  local candidate
  for candidate in \
    node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg \
    node_modules/@remotion/compositor-linux-arm64-gnu/ffmpeg \
    node_modules/@remotion/compositor-linux-x64-musl/ffmpeg \
    node_modules/@remotion/compositor-linux-arm64-musl/ffmpeg \
    node_modules/@remotion/compositor-darwin-x64/ffmpeg \
    node_modules/@remotion/compositor-darwin-arm64/ffmpeg \
    node_modules/@remotion/compositor-win32-x64/ffmpeg.exe; do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  if command -v ffmpeg >/dev/null 2>&1; then
    printf '%s\n' "ffmpeg"
    return 0
  fi
  return 1
}

FF="$(resolve_ffmpeg)" || {
  echo "web-encode: no ffmpeg found (no @remotion/compositor-* binary, no system ffmpeg)" >&2
  exit 1
}

# Portable temp file in the same directory as $OUT so the final mv stays
# on the same filesystem. Cleaned up on any exit, including errors.
OUT_DIR="$(dirname "$OUT")"
TMP="$(mktemp "${OUT_DIR}/web-encode.XXXXXX")"
mv -f "$TMP" "${TMP}.mp4"
TMP="${TMP}.mp4"
trap 'rm -f "$TMP"' EXIT

"$FF" -y -i "$IN" \
  -c:v libx264 -profile:v main -level 4.0 -preset medium -crf 22 \
  -vf "scale=in_range=full:out_range=tv,format=yuv420p" \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -movflags +faststart \
  -c:a aac -b:a 128k \
  "$TMP"

mv -f "$TMP" "$OUT"
trap - EXIT
echo "✓ web-safe MP4: $OUT (via $FF)"
