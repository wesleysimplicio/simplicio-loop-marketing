---
name: gpt-image-prompt-builder
description: Assembles OpenAI gpt-image prompts with subject, style, composition, palette, and typography for quote cards and carousels
version: 0.1.0
---

# GPT-Image Prompt Builder

Specialized prompt assembler for OpenAI gpt-image. Strong on typographic precision, quote cards, carousel slides, and inpaint or local edits. Emits the parameter object the OpenAI image API expects.

## When to invoke

- Quote cards and typographic posts where the text rendering must be sharp and on-brand.
- Carousel slide decks with consistent template across slides.
- Before-and-after consulting frames that require precise edit on a portion of the image.
- Transparent background assets for compositing into other layouts.
- Any image task routed by `.specs/architecture/PROVIDERS.md` to gpt-image.

## Inputs

- `subject`: string. What is in the image.
- `style`: string. Visual style descriptor (`editorial`, `minimal`, `studio product shot`, `flat illustration`).
- `composition`: string. Layout cues (`centered`, `rule of thirds`, `full bleed`, `top half text bottom half image`).
- `palette`: array of strings. Color cues (`muted earth tones`, `#1a1a1a background`, `gold accent`).
- `typography`: object, optional. `{ text, font_style, weight, color, position }`. Required for quote cards.
- `aspect`: string. `1:1`, `4:5`, `9:16`, `16:9`.
- `transparent_background`: boolean, optional. When true, request a PNG with alpha.
- `negative`: array of strings, optional. Things to avoid.
- `seed`: integer, optional.

## Process

1. Validate inputs. Reject if `subject`, `style`, `composition`, `aspect` are missing.
2. Compose the prompt in the order gpt-image responds best to: subject, style, composition, palette, typography (if present), then technical hints.
3. For typography, embed the exact text in quotes and pin font style, weight, color, and position.
4. Append negative prompt items as a separate string if present.
5. Resolve the OpenAI parameter object: prompt, size (mapped from aspect), background (transparent if requested), n (default 1), seed if provided.
6. Run a token sanity check on the prompt length.
7. Return the assembled prompt, the parameter object, and the model id (`gpt-image-1` default).

## Outputs

- `prompt`: string.
- `negative_prompt`: string.
- `params`: object. Ready for the OpenAI Images API call.
- `model`: string. Default `gpt-image-1`.

## Examples

### Example 1: quote card for a launch post

Input: `{ subject: "minimal beige card", style: "editorial minimal", composition: "centered text", palette: ["#f5efe6 background", "#1a1a1a text"], typography: { text: "Sua cor te trai. Descubra qual e.", font_style: "serif display", weight: "regular", color: "#1a1a1a", position: "centered" }, aspect: "1:1" }`
Output: `{ prompt: "Minimal beige card, editorial minimal style, centered text composition, palette beige #f5efe6 background and dark #1a1a1a text, typography 'Sua cor te trai. Descubra qual e.' in serif display regular black centered, 1:1 aspect", params: { size: "1024x1024", background: "opaque", n: 1 }, model: "gpt-image-1" }`

### Example 2: transparent product cutout

Input: `{ subject: "amber perfume bottle", style: "studio product shot", composition: "centered", palette: ["transparent"], aspect: "1:1", transparent_background: true }`
Output: parameter object with `background: "transparent"` and PNG output.

## Failure modes

- Typography text exceeds the area implied by composition: warn and suggest shortening or splitting across slides.
- transparent_background true but subject implies a background scene: warn and proceed; the model may render a default background.
- Aspect ratio not in the OpenAI supported set: map to the closest supported size and surface the change.
- Negative prompt conflicts with subject: drop the conflicting term and warn.

## Related skills

- `wavespeed-batch`: cheaper batch alternative when the typographic precision is not the priority.
- `qa-tech-specs`: validates the generated image against platform specs.
- `caption-multi-platform`: pairs caption variants with the generated quote card.
- `compliance-generic`: audits any text rendered inside the image.
