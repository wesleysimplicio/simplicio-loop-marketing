---
name: caption-multi-platform
description: Generates platform-tuned caption variants from a base copy, adapting hashtag count, line breaks, and link placement per network
version: 0.1.0
---

# Caption Multi Platform

Takes a single base copy and produces platform-specific variants ready to paste into the publisher. Each variant respects the platform's character limits, hashtag conventions, line-break behavior, and link placement rules.

## When to invoke

- Right after `copywriter-curto` produces an approved base caption.
- When publishing the same piece across multiple platforms via `adaptlypost` MCP.
- Cross-posting a winning ad caption from one platform to another.
- Localizing a caption per platform without changing the message.
- A/B testing caption length across platforms while keeping the hook constant.

## Inputs

- `base_text`: string. The approved caption to adapt.
- `platforms`: array of strings. Subset of `ig_long`, `ig_short`, `tiktok`, `youtube_shorts`, `facebook`, `linkedin`, `x`.
- `hook`: string, optional. The opening hook, kept verbatim across variants.
- `cta`: string, optional. Call to action sentence.
- `link`: string, optional. URL to append where the platform allows it.
- `hashtag_pool`: array of strings, optional. Hashtags ranked by relevance.
- `language`: string. `pt-BR`, `en`, `es`.
- `mention_handles`: array of strings, optional. Accounts to mention.

## Process

1. Load platform rules from `.specs/product/CHANNELS.md`: max chars, max hashtags, line-break behavior, link placement rule.
2. For each platform in `platforms`, build a draft starting with `hook` if provided.
3. Apply platform-specific shaping: IG long allows up to 2200 chars and 30 hashtags; IG short caps near 125 chars; TikTok favors 100-150 chars with 3-5 hashtags; YouTube Shorts puts the link in the description, not the caption; LinkedIn allows long-form with 3 hashtags.
4. Insert the CTA at the platform's preferred position (end for IG/FB, mid for LinkedIn, before hashtags for TikTok).
5. Place `link` only where the platform supports clickable links in the caption (LinkedIn, Facebook). For others, note "link in bio" or omit.
6. Pick hashtags from `hashtag_pool` up to the platform max.
7. Run a per-variant length check. Trim filler words first, then secondary sentences, never the hook.
8. Return one variant per requested platform with metadata.

## Outputs

- `variants`: array of objects. Each `{ platform, text, char_count, hashtag_count, link_placement, warnings }`.

## Examples

### Example 1: launch post across IG, TikTok, LinkedIn

Input: `{ base_text: "Your product launch starts here. Discover what changed.", platforms: ["ig_long", "tiktok", "linkedin"], hashtag_pool: ["#launch", "#productupdate", "#design"], cta: "Learn more", link: "https://example.com/launch", language: "en" }`
Output: 3 variants, IG long with full body and 8 hashtags, TikTok with trimmed body and 4 hashtags, LinkedIn with link inline and 3 hashtags.

### Example 2: same hook, different platforms in English

Input: `{ base_text: "Color is your unfair advantage.", platforms: ["ig_short", "youtube_shorts"], language: "en" }`
Output: IG short with the hook plus a soft CTA and 5 hashtags; YouTube Shorts with the hook only, link moved to description note.

## Failure modes

- base_text exceeds the smallest platform limit even after trimming: surface a warning and return the trimmed result with a note explaining what was cut.
- hashtag_pool empty for a platform that requires hashtags to surface: pull from a small generic fallback list and flag the variant for review.
- Link rejected by platform policy (e.g., shortener domain banned on LinkedIn): swap to the long URL and warn.
- mention_handles include an unverified account: keep the mention but flag for human verification.

## Related skills

- `copywriter-curto`: produces the base text this skill fans out.
- `revisao-humanizada`: each variant should be humanized before publish.
- `qa-tech-specs`: validates the asset, not the caption, but pairs with this skill in the publish step.
- `compliance-generic`: confirms the variants pass cross-vertical compliance.
