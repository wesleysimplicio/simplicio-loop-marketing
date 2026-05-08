---
name: revisao-humanizada
description: Humanizes narrative copy by removing AI tells, varying rhythm, and stripping templated phrasing before publish
version: 0.1.0
---

# Revisao Humanizada

Final pass on any narrative copy headed for a human audience. Strips the typical AI fingerprints: em-dashes, triadic patterns, hedging, monotone sentence length, and recycled connectors. Mirrors the global `humanizer` skill behavior, scoped to the marketing-engine pipeline.

## When to invoke

- Right before publishing any caption, post body, blog article, email, ad copy, video script, landing page section.
- After the first draft from `copywriter-curto`, `caption-multi-platform`, or any LLM-generated long-form text.
- When a reviewer flags copy as sounding generic, robotic, or template-like.
- During QA pass on a scheduled piece in `.specs/pieces/`.
- Whenever the brand voice score from a manual read drops below the threshold defined in `.specs/strategy/BRAND.md`.

## Inputs

- `text`: string. The draft copy to humanize.
- `language`: string. Target language code (`pt-BR`, `en`, `es`).
- `platform`: string, optional. Platform context (`ig`, `tiktok`, `youtube`, `linkedin`, `email`, `blog`).
- `brand_voice_path`: string, optional. Path to `.specs/strategy/BRAND.md` for tone constraints.
- `preserve_terms`: array of strings, optional. Brand terms, product names, and CTAs that must stay verbatim.

## Process

1. Read `text` and inventory AI tells: em-dashes, sentences starting with `In conclusion`, `Moreover`, `Furthermore`, triads like `fast, simple, and effective`.
2. Read `brand_voice_path` if provided. Note the brand tone, banned words, and required phrasing.
3. Call `llm-router` with `task: humanization`. Send the draft, language, platform, brand voice excerpt, and the preserve_terms list.
4. Apply rewrites: vary sentence length (short, medium, long, fragment), break triadic patterns, replace em-dashes with comma or period, remove hedge words (`perhaps`, `it could be argued`).
5. Verify preserve_terms still appear verbatim in the output.
6. Confirm the output language matches `language`.
7. Score the result against an internal AI-tell checklist. If three or more tells remain, run one more pass.
8. Return the humanized text plus a short diff of what changed.

## Outputs

- `text`: string. Humanized copy.
- `changes`: array of strings. Bullet log of edits applied.
- `ai_tells_remaining`: integer. Count of tells the final pass could not remove.
- `passes_used`: integer. How many humanization rounds ran.

## Examples

### Example 1: caption rewrite

Input: `{ text: "In conclusion, color analysis is fast, simple, and effective.", language: "en", platform: "ig" }`
Output: `{ text: "Color analysis works. It is quick. The results stick.", changes: ["removed In conclusion", "broke triad fast/simple/effective"], ai_tells_remaining: 0, passes_used: 1 }`

### Example 2: long-form blog paragraph

Input: a 200-word draft full of em-dashes and triads. Output: same paragraph rewritten with mixed sentence rhythm, em-dashes converted, brand terms intact.

## Failure modes

- Preserve_terms vanish in rewrite: re-inject them in the exact original positions and rerun humanization with stronger constraint.
- Output language drifts: force the language constraint in the next call and reject the previous result.
- Result still scores high on AI tells after two passes: surface the issue, return the best result, and flag for human edit.

## Related skills

- `copywriter-curto`: produces the draft this skill polishes.
- `caption-multi-platform`: each variant is humanized before being scheduled.
- `llm-router`: actually runs the LLM call for the humanization pass.
- `compliance-generic`: should run after humanization to confirm no banned phrasing slipped in.
