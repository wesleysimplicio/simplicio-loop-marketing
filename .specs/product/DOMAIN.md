# DOMAIN - Marketing Engine

## Core workflow

The main domain flow is:

`brief -> script -> creative -> caption -> compliance -> publish -> metrics -> ads`

Every stage should be executable through the CLI or supporting library modules, and every external dependency should be routed through provider abstractions.

## Main entities

| Entity | Meaning | Typical files |
|---|---|---|
| Piece | A single content item being drafted, generated, reviewed, published, and measured. | `.marketing-engine/pieces/*.md`, `lib/pieces/*` |
| Provider | A concrete LLM, image, or video backend selected by routing rules. | `lib/providers/*`, `.specs/architecture/PROVIDERS.md` |
| Manifest | Per-piece artifact summarizing prompts, providers, outputs, cost, and reports. | `outputs/**/manifest.json`, `lib/data/manifest.ts` |
| Compliance report | Audit output blocking unsafe or disallowed content. | `data/compliance/*.json`, `lib/compliance/*` |
| QA report | Tech-spec validation result for generated assets. | `qa-tech-specs.json`, `lib/qa/*` |
| Run log | Structured evidence of generation/promotion activity. | `data/runs.jsonl`, `data/llm-usage.jsonl` |
| Promotion draft | Output that turns performance winners into ad opportunities. | `ads-draft.json`, `lib/cli/promote.ts` |

## Domain rules

- Providers are chosen by task type, not hardcoded into skills.
- DRY_RUN must remain safe and useful for local validation.
- Compliance and QA are gates, not optional post-processing.
- Publishing and promotion should leave traceable local artifacts even when remote integrations are stubbed or unavailable.
- Routing behavior must be explainable through docs and covered by tests.

## Important terms

| Term | Meaning here |
|---|---|
| task | Abstract capability such as `caption`, `script`, `quote-card`, `cinematic-reel` |
| fallback | Backup provider used when the primary provider fails |
| active client | The client profile whose compliance overrides apply |
| measured | Piece status used after metrics have been pulled and processed |

## External integrations

- OpenAI for LLM/image generation paths
- Anthropic, DeepSeek, Ollama, and other provider backends
- AdaptlyPost for publishing
- Notion for calendar sync
- Meta/TikTok/YouTube analytics and promotion inputs
- Playwright for regression coverage
