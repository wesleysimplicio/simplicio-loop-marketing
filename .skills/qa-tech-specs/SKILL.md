---
name: qa-tech-specs
description: Validates a generated piece against platform technical specs for aspect ratio, resolution, duration, file size, and codec
version: 0.1.0
---

# QA Tech Specs

Pre-publish validator for asset technical compliance. Reads platform specs from `.specs/product/CHANNELS.md` and compares them to the actual file metadata. Blocks publishing when a critical spec is violated.

## When to invoke

- Right before scheduling any asset on `adaptlypost` or any direct platform API.
- After image or video generation by Higgsfield, Topview, Wavespeed, or gpt-image.
- When re-purposing an asset across platforms (a 1:1 IG image being pushed to a 9:16 Reel).
- During QA on a sprint piece in `.specs/sprints/sprint-XX/`.
- When a publish attempt fails with a platform-side spec error and we need to confirm the asset shape.

## Inputs

- `asset_path`: string. Local path or URL to the file.
- `asset_kind`: string. `image`, `video`, `carousel`, `audio`.
- `target_platforms`: array of strings. Subset of `ig_feed`, `ig_reel`, `ig_story`, `tiktok`, `youtube_shorts`, `youtube_long`, `facebook_feed`, `linkedin`, `x`.
- `channels_md_path`: string, optional. Override path to `.specs/product/CHANNELS.md`.

## Process

1. Read `channels_md_path` (default `.specs/product/CHANNELS.md`) and parse the spec table for each platform: aspect ratio, min and max resolution, max duration, max file size, accepted codec, accepted container.
2. Probe the asset file metadata using `ffprobe` for video and `identify` for image. Extract aspect ratio, resolution, duration, file size, codec, container.
3. For each `target_platform`, compare actual values against the spec and record violations.
4. Classify violations: `hard` (platform will reject) versus `soft` (platform will accept but quality drops).
5. Build a per-platform pass map with violation details and suggested fixes (re-encode, crop, scale).
6. If any `hard` violation appears, set the overall pass flag to false.
7. Return the report.

## Outputs

- `pass`: boolean. False if any hard violation exists.
- `per_platform`: object. Map of `platform -> { pass, violations, fixes }`.
- `metadata`: object. The actual file metadata extracted.

## Examples

### Example 1: 1080x1080 image targeting IG feed and IG Reel

Input: `{ asset_path: "outputs/quote-card.png", asset_kind: "image", target_platforms: ["ig_feed", "ig_reel"] }`
Output: `{ pass: false, per_platform: { ig_feed: { pass: true, violations: [], fixes: [] }, ig_reel: { pass: false, violations: [{ rule: "aspect_mismatch", expected: "9:16", actual: "1:1", severity: "hard" }], fixes: ["regenerate at 1080x1920 or center-crop with safe area"] } }, metadata: { width: 1080, height: 1080, format: "png", file_size_kb: 412 } }`

### Example 2: 30s vertical video targeting TikTok and YouTube Shorts

Input: `{ asset_path: "outputs/reel-001.mp4", asset_kind: "video", target_platforms: ["tiktok", "youtube_shorts"] }`
Output: pass true, both platforms accept the file.

## Failure modes

- ffprobe or identify not installed: surface the missing tool and the install command.
- CHANNELS.md missing the target platform: log a warning, skip that platform, and recommend updating the spec doc.
- Asset path unreachable: throw a descriptive error with the resolved path.
- File codec accepted but at the edge of the spec: mark as `soft` and recommend a re-encode.

## Related skills

- `caption-multi-platform`: caption side of the same publish gate.
- `wavespeed-batch`: produces batch assets that should be validated by this skill.
- `topview-prompt-builder`: produces UGC video that often needs spec validation.
- `higgsfield-prompt-builder`: produces cinematic video that may need a re-encode pass.
