---
name: higgsfield-prompt-builder
description: Translates a visual brief into a Higgsfield Soul or DoP prompt with subject, motion, lens, lighting, mood, aspect, and duration
version: 0.1.0
---

# Higgsfield Prompt Builder

Specialized prompt assembler for Higgsfield video and image generation (Soul 2.0, DoP, Seedance 2.0). Takes a structured visual brief and emits the exact prompt format Higgsfield expects, plus the parameter set the MCP call needs.

## When to invoke

- Any video task routed by `llm-router` or by `.specs/architecture/PROVIDERS.md` to Higgsfield.
- Cinematic reels, motion-controlled shots, editorial brand pieces, hero animations.
- Image generation when Soul 2.0 is the chosen provider for editorial portraits.
- A/B test of motion direction across the same subject (variant axis = camera move).
- Re-rendering an approved frame with a different aspect ratio or duration.

## Inputs

- `subject`: string. Main subject described concretely (woman, product, scene).
- `motion`: string. Camera or subject motion (`dolly in`, `orbit left`, `static`, `subject walks toward camera`).
- `lens`: string. Focal length and depth (`35mm shallow`, `85mm portrait`, `wide 24mm`).
- `lighting`: string. Light setup (`golden hour backlit`, `softbox left`, `neon rim`).
- `mood`: string. Emotional tone (`confident`, `intimate`, `editorial high fashion`).
- `aspect`: string. Aspect ratio (`9:16`, `16:9`, `1:1`, `4:5`).
- `duration_seconds`: integer. Clip length (1-10 typical).
- `model`: string. `soul-2`, `dop`, `seedance-2`.
- `negative`: array of strings, optional. Things to avoid (`text`, `extra limbs`, `blur`).
- `seed`: integer, optional. For reproducibility.

## Process

1. Validate inputs. Reject if `subject`, `motion`, `lens`, `lighting`, `mood`, `aspect`, `model` are missing.
2. Compose the prompt string in the order Higgsfield ranks: subject, action, motion, lens, lighting, mood, style cues.
3. Append technical hints last: aspect, duration if the model supports it.
4. Build the negative prompt string from the `negative` array.
5. Pick the MCP tool name based on `model` (Soul, DoP, Seedance).
6. Assemble the parameter object the Higgsfield MCP expects (prompt, negative, aspect, duration, seed, model).
7. Run a length sanity check: prompt under provider limit, no banned tokens.
8. Return the assembled prompt, the parameter object, and the MCP tool name to call.

## Outputs

- `prompt`: string. Final prompt text.
- `negative_prompt`: string.
- `params`: object. Ready-to-pass parameter object for the Higgsfield MCP tool.
- `mcp_tool`: string. The exact tool name to invoke.

## Examples

### Example 1: cinematic reel for a brand intro

Input: `{ subject: "woman walking through a sunlit Parisian arcade", motion: "slow dolly in", lens: "35mm shallow", lighting: "golden hour backlit", mood: "editorial confident", aspect: "9:16", duration_seconds: 6, model: "seedance-2" }`
Output: `{ prompt: "Woman walking through a sunlit Parisian arcade, slow dolly in, 35mm shallow depth of field, golden hour backlit, editorial confident mood, 9:16, 6s", params: {...}, mcp_tool: "higgsfield_seedance_generate" }`

### Example 2: orbit shot of a perfume bottle

Input: `{ subject: "amber perfume bottle on marble", motion: "orbit left 90deg", lens: "85mm macro", lighting: "softbox left rim right", mood: "luxury minimal", aspect: "1:1", duration_seconds: 4, model: "dop" }`
Output: parameter object ready for the DoP MCP call.

## Failure modes

- Missing required field: surface a clear error naming the missing field.
- Aspect ratio not supported by the chosen model: suggest the closest supported ratio and ask to confirm.
- Prompt length exceeds provider limit: trim style cues, never trim subject or motion.
- Negative prompt conflicts with subject: warn and proceed without the conflicting negative term.

## Related skills

- `video-prompt-builder`: generic dispatcher that delegates to this skill when the chosen provider is Higgsfield.
- `wavespeed-batch`: used for cheap A/B variant runs before committing to a Higgsfield render.
- `llm-router`: not used directly here, but may be called upstream to pick Higgsfield as the provider.
- `qa-tech-specs`: validates the rendered output against platform specs after generation.
