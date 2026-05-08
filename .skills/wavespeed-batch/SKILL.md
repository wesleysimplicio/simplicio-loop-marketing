---
name: wavespeed-batch
description: Runs batch image or video generation across an A B variant axis tracking cost per variant for cheap fast experiments
version: 0.1.0
---

# Wavespeed Batch

Batch generator for cheap and fast A/B tests. Takes a base prompt and a variant axis (e.g., 5 different hooks, 3 different palettes), runs the matrix on Wavespeed, and returns the artifacts plus per-variant cost. Used to filter ideas before committing to a more expensive provider.

## When to invoke

- Hook testing across 5 to 20 caption variants paired with the same image template.
- Palette or composition exploration on a quote card or product shot.
- Pre-flight before a Higgsfield render: pick the winning variant on Wavespeed first.
- Batch generation of carousel slides where each slide shares a template but differs in copy.
- Cost-conscious early ideation when the brief is still loose.

## Inputs

- `base_prompt`: string. Shared prompt body across all variants.
- `variant_axis`: object. `{ field, values }`. Field is the prompt slot that changes (`hook`, `palette`, `subject`). Values is the list of options.
- `kind`: string. `image` or `video`.
- `aspect`: string. `1:1`, `9:16`, `4:5`, `16:9`.
- `model`: string. Wavespeed model id (`flux-schnell`, `sdxl-turbo`, `wan-video`).
- `count_per_variant`: integer. Default 1. Useful when sampling multiple seeds per variant.
- `seed`: integer, optional. Base seed; per-variant seeds are derived deterministically.
- `cost_cap_usd`: number, optional. Stop and return partial results if the cap is hit.

## Process

1. Validate inputs. Reject if `variant_axis.values` is empty or `base_prompt` is missing.
2. Expand the matrix: for each value in `variant_axis.values`, build a final prompt by injecting the value into `base_prompt` at the `{ field }` placeholder.
3. For each final prompt, derive a per-variant seed from `seed` and the variant index for reproducibility.
4. Estimate cost per variant from the model's price-per-call table. Sum and check `cost_cap_usd`.
5. Submit the batch to Wavespeed in parallel with a sane concurrency cap (default 5).
6. Collect the artifacts. For each, record the variant value, the seed, the artifact path or URL, and the actual cost.
7. If a variant fails, retry once. If it fails again, mark it as failed in the result.
8. Append a summary line per variant to `data/wavespeed-usage.jsonl`.

## Outputs

- `results`: array of objects. Each `{ variant_value, prompt, seed, artifact_ref, cost_usd, status }`.
- `total_cost_usd`: number.
- `successful_variants`: integer.
- `failed_variants`: integer.

## Examples

### Example 1: hook test across 5 variants

Input: `{ base_prompt: "Editorial portrait of a woman, soft light, brand mood. Hook overlay: { hook }.", variant_axis: { field: "hook", values: ["Color is your edge", "Stop guessing your palette", "Your style starts here", "Discover your season", "Wear what works"] }, kind: "image", aspect: "1:1", model: "flux-schnell", count_per_variant: 1 }`
Output: `{ results: [5 entries with artifact paths], total_cost_usd: 0.12, successful_variants: 5, failed_variants: 0 }`

### Example 2: palette exploration on a quote card

Input: `{ base_prompt: "Quote card with text 'Sua cor te trai'. Palette: { palette }.", variant_axis: { field: "palette", values: ["beige and black", "navy and gold", "off-white and rust"] }, kind: "image", aspect: "1:1", model: "sdxl-turbo" }`
Output: 3 artifacts with cost summary.

## Failure modes

- cost_cap_usd hit mid-batch: stop submission, return partial results, set `failed_variants` to the unattempted count, and surface a warning.
- All variants fail: surface the underlying provider error and refuse to write a misleading success log.
- variant_axis placeholder not found in `base_prompt`: throw a descriptive error pointing at the missing placeholder.
- Concurrency cap too high for the API: drop to a safe default (3) and warn.

## Related skills

- `gpt-image-prompt-builder`: precise alternative when typography matters more than batch speed.
- `higgsfield-prompt-builder`: cinematic alternative for the winning variant after the Wavespeed test.
- `topview-prompt-builder`: UGC alternative when the variant axis is the avatar or scene.
- `qa-tech-specs`: validates each artifact against platform specs.
- `video-prompt-builder`: dispatcher that may delegate to this skill for batch hook tests.
