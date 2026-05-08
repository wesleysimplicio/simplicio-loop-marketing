---
name: copywriter-curto
description: Generates short-form copy under tight character limits including hooks, captions, and ad headlines
version: 0.1.0
---

# Copywriter Curto

Short-form copy specialist. Produces hooks (under 10 words), captions (under 220 characters), and ad headlines (under 40 characters) tuned to the brand voice. Always routes through `llm-router` with `task: caption` so the cheapest qualified provider runs.

## When to invoke

- Any task that asks for a hook, caption, headline, button label, push notification, or one-line tagline.
- First draft of social posts before they are expanded by `caption-multi-platform`.
- Ad creative iteration where headline is the variant axis.
- Email subject lines and preview text under 60 characters.
- Card titles, banner overlays, and any UI surface with a hard character limit.

## Inputs

- `kind`: string. `hook`, `caption`, `ad_headline`, `subject_line`, `cta_button`, `tagline`.
- `context`: string. What the copy is about (product, theme, angle).
- `audience`: string. Target persona summary.
- `tone`: string. Brand tone descriptor (`bold`, `intimate`, `expert`, `playful`).
- `language`: string. `pt-BR`, `en`, `es`.
- `max_chars`: integer, optional. Override the default limit for `kind`.
- `variants`: integer. Number of options to return (default 5).
- `must_include`: array of strings, optional. Words or phrases that must appear.
- `must_avoid`: array of strings, optional. Banned words.

## Process

1. Resolve the character limit: use `max_chars` if set, else the default for `kind`.
2. Compose a prompt that pins the kind, context, audience, tone, language, limit, must_include, must_avoid, and the requested number of variants.
3. Call `llm-router` with `task: caption`, sending the composed prompt.
4. Parse the response into a list of `variants` candidates.
5. Filter out any candidate that exceeds `max_chars`, fails `must_include`, or hits `must_avoid`.
6. If fewer than `variants` candidates pass, ask the LLM for more and merge results.
7. Score each surviving candidate on hook strength, clarity, and brand fit using a rubric.
8. Return the candidates sorted by score, plus the rubric scores.

## Outputs

- `candidates`: array of objects. Each `{ text, chars, score, rubric: { hook, clarity, brand_fit } }`.
- `provider_used`: string. Echoed from llm-router.
- `cost_estimate_usd`: number.

## Examples

### Example 1: hook for a reel about color analysis

Input: `{ kind: "hook", context: "color analysis service launch", audience: "brazilian women 28-45", tone: "expert confident", language: "pt-BR", variants: 5 }`
Output: `{ candidates: [{ text: "Sua cor te trai. Descubra qual e.", chars: 32, score: 0.91, rubric: {...} }, ...] }`

### Example 2: ad headline under 40 characters

Input: `{ kind: "ad_headline", context: "online wardrobe consult", audience: "young professionals", tone: "bold", language: "en", max_chars: 40, variants: 6 }`
Output: 6 headlines, all under 40 characters, sorted by score.

## Failure modes

- All candidates exceed the limit: re-prompt with a stricter limit baked into the system message and a worked example.
- must_include word never appears: try one more pass with the term capitalized and bracketed in the prompt; if still absent, surface a warning.
- LLM returns fewer than requested: top up with another call and merge.
- Provider quota error: llm-router falls back automatically; surface which provider actually ran.

## Related skills

- `caption-multi-platform`: takes the winning candidate from this skill and fans it out per platform.
- `revisao-humanizada`: humanizes the chosen candidate before publish.
- `llm-router`: provider routing and logging.
- `compliance-generic`: confirms the chosen copy passes vertical-agnostic compliance.
- `compliance-<active-client>`: optional vertical-specific audit when the host project ships its own compliance skill.
