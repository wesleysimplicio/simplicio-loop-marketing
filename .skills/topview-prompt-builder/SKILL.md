---
name: topview-prompt-builder
description: Assembles Topview UGC prompts with avatar id, product upload, scene, voice, and duration for ad tests and product holders
version: 0.1.0
---

# Topview Prompt Builder

Specialized prompt assembler for Topview UGC. Best fit for ad tests, avatars holding a product, talking-head scripts, and product demos generated from a URL. Emits the parameter object the Topview MCP expects.

## When to invoke

- Any UGC ad test where an avatar holds or demonstrates a product.
- Talking-head scripts narrated by a Topview AI presenter.
- Product demo videos generated from a product URL with auto-script.
- Face-swap or try-on scenarios using Topview's dedicated feature.
- Any video task routed by `.specs/architecture/PROVIDERS.md` to Topview.

## Inputs

- `avatar_id`: string. Topview avatar identifier from the catalog.
- `product_asset`: string. URL or path to the product image or 3D asset.
- `scene`: string. Background scene description (`bright kitchen`, `studio white`, `home bathroom`).
- `script`: string. Spoken script the avatar reads. Keep within duration.
- `voice_id`: string. Topview voice id matched to language and persona.
- `language`: string. `pt-BR`, `en`, `es`.
- `duration_seconds`: integer. 15, 30, or 60 typical.
- `aspect`: string. `9:16`, `1:1`, `16:9`.
- `cta_overlay`: string, optional. Text overlay shown at the end (max 40 chars).
- `from_url`: string, optional. Product URL for auto-script mode.

## Process

1. Validate inputs. Require `avatar_id`, `voice_id`, `aspect`, `duration_seconds`. Require at least one of `script` or `from_url`.
2. If `from_url` is set and `script` is empty, mark the call as auto-script mode and let Topview scrape the URL.
3. Estimate script reading time at ~2.3 words per second. If the script overflows `duration_seconds` by more than 10 percent, trim from the end and warn.
4. Compose the parameter object: avatar_id, voice_id, script (or from_url), scene, product_asset, aspect, duration, language, cta_overlay.
5. Pick the MCP tool name based on mode: `topview_avatar_generate` for script mode, `topview_url_to_video` for URL mode, `topview_face_swap` for try-on.
6. Run a sanity pass: avatar exists in the catalog map, voice matches language, aspect is supported.
7. Return the assembled params, the MCP tool name, and the estimated cost.

## Outputs

- `params`: object. Ready-to-pass parameter object.
- `mcp_tool`: string. Topview MCP tool name.
- `estimated_duration_seconds`: number. Computed from script length.
- `cost_estimate_usd`: number.
- `warnings`: array of strings.

## Examples

### Example 1: avatar holding a perfume bottle, 15s ad

Input: `{ avatar_id: "ava_brunette_29", product_asset: "outputs/perfume.png", scene: "bright bathroom counter", script: "This perfume changed my morning routine. Three sprays and I am out the door.", voice_id: "voice_pt_br_warm_female", language: "pt-BR", duration_seconds: 15, aspect: "9:16", cta_overlay: "Shop now" }`
Output: `{ params: {...}, mcp_tool: "topview_avatar_generate", estimated_duration_seconds: 14, cost_estimate_usd: 0.45, warnings: [] }`

### Example 2: URL-driven demo

Input: `{ avatar_id: "ava_male_35", from_url: "https://store.example.com/skincare-serum", voice_id: "voice_en_us_neutral_male", language: "en", duration_seconds: 30, aspect: "9:16" }`
Output: parameter object with `from_url` mode and the corresponding MCP tool.

## Failure modes

- avatar_id not in catalog: surface a clear error and suggest the closest match by tags.
- voice_id mismatched to language: auto-pick the default voice for the language and warn.
- script overflows duration even after trimming: refuse and ask the caller to shorten or pick a longer duration.
- product_asset unreachable: throw a descriptive error with the resolved URL or path.

## Related skills

- `video-prompt-builder`: generic dispatcher that delegates here when Topview is the chosen provider.
- `wavespeed-batch`: cheaper alternative for batch hook tests.
- `higgsfield-prompt-builder`: alternative for cinematic shots not suited to UGC.
- `qa-tech-specs`: validates the rendered video against platform specs.
