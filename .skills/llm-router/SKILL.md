---
name: llm-router
description: Picks and calls the LLM provider based on task type, reading PROVIDERS.md and .env to stay provider-agnostic
version: 0.1.0
---

# LLM Router

Critical skill that every other text-generating skill calls first. Decides which LLM provider runs a given task without hardcoding the provider in any caller. Reads `.specs/architecture/PROVIDERS.md` and `.env` to map task type to provider, runs the call, logs usage, and falls back if the primary fails.

## When to invoke

- Any skill that needs to generate text (copy, caption, script, compliance audit, humanization).
- Any agent that orchestrates a pipeline step backed by an LLM.
- Any pre-flight check that needs to confirm a provider is reachable before running a long batch.
- When a piece file declares a `provider_override` block and the caller wants the override honored.
- When a primary provider returns an error and a fallback chain must run.

## Inputs

- `task`: string. One of `orchestration`, `code_generation`, `caption`, `script`, `compliance`, `translation`, `humanization`, or any custom task key registered in `PROVIDERS.md`.
- `prompt`: string. Final composed prompt ready for the model.
- `system`: string, optional. System message to scope behavior.
- `max_tokens`: integer, optional. Cap on response length.
- `temperature`: number, optional. Sampling temperature.
- `provider_override`: string, optional. Forces a specific provider id, bypassing the routing matrix.
- `piece_path`: string, optional. Path to a `.specs/pieces/*.md` file that may declare its own override.
- `dry_run`: boolean, optional. When true, returns the resolved provider and prompt without calling the model.

## Process

1. Load `.env` and resolve `LLM_DEFAULT`, `LLM_FALLBACK`, `LLM_CHEAP`, and provider keys.
2. Parse `.specs/architecture/PROVIDERS.md` LLM matrix into a `task -> {default, fallback}` map.
3. If `piece_path` is set, read it and look for `provider_override.llm_text`. If present, use it.
4. Else if `provider_override` arg is set, use it.
5. Else look up `task` in the matrix and pick the default. If task is unknown, fall back to `LLM_DEFAULT`.
6. Verify the chosen provider has an API key in `.env`. If missing, drop to the fallback.
7. If `dry_run` is true, return `{ provider, prompt, system, would_call: true }` and stop.
8. Call the provider through `lib/providers/llm.ts` factory. Catch network and quota errors.
9. On error, retry with the fallback provider once. On second failure, surface the error.
10. Append a JSON line to `data/llm-usage.jsonl` with timestamp, task, provider used, tokens in/out, estimated cost, and outcome.

## Outputs

- `text`: string. Model response.
- `provider_used`: string. The provider that actually ran.
- `tokens_in`: integer.
- `tokens_out`: integer.
- `cost_estimate_usd`: number.
- `fallback_triggered`: boolean.

## Examples

### Example 1: caption task, default route

Input: `{ task: "caption", prompt: "Hook for IG reel about color analysis" }`
Output: `{ text: "Color is your unfair advantage", provider_used: "deepseek", tokens_in: 12, tokens_out: 7, cost_estimate_usd: 0.0001, fallback_triggered: false }`

### Example 2: piece override forces claude

Input: `{ task: "caption", prompt: "...", piece_path: ".specs/pieces/2026-05-launch.md" }` where the piece declares `provider_override.llm_text: claude`.
Output: `{ text: "...", provider_used: "claude", fallback_triggered: false }`

## Failure modes

- All provider keys missing: throw a descriptive error pointing at `.env.example`.
- PROVIDERS.md unreadable or malformed: log the parse error and use `LLM_DEFAULT`.
- Primary and fallback both fail: surface the second error, write the failure to `data/llm-usage.jsonl` with `outcome: "failed"`.
- Override provider id not registered: refuse and ask the caller to register it in PROVIDERS.md.

## Related skills

- `copywriter-curto`: short copy generator that calls llm-router with `task: caption`.
- `compliance-<active-client>`: optional client-specific compliance auditor that calls llm-router with `task: compliance`.
- `compliance-generic`: same routing pattern for cross-vertical audits.
- `revisao-humanizada`: humanizer step that calls llm-router with `task: humanization`.
- `caption-multi-platform`: fans out platform variants, each call routed through llm-router.
