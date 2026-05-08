# ADR-001 — Provider-Agnostic Architecture

## Status

Accepted, 2026-05-08.

## Context

The Marketing Engine depends on three external capability families that change rapidly: LLMs (Claude, Codex, DeepSeek, Copilot, Ollama), image generation (gpt-image, Higgsfield, Topview, Wavespeed), and video generation (Higgsfield Seedance/DoP, Topview UGC, Wavespeed batch). Pricing, quality, and feature parity shift on a quarterly basis. Hard-coding any one vendor in skills, agents, or `.sh` scripts produces three concrete pains:

- **Lock-in cost.** Replacing a provider becomes a multi-file refactor instead of a configuration edit.
- **Drift.** Different skills end up calling different providers for the same task type, eroding the brand voice and complicating cost accounting.
- **Untestable code paths.** Skills that call SDKs directly cannot be exercised offline or in CI without live keys.

The engine is expected to host multiple clients across different verticals, so the abstraction must hold up across briefs, locales, languages, and budget tiers.

## Decision

1. All provider calls go through the interfaces defined in `lib/providers/llm.ts`, `lib/providers/image.ts`, and `lib/providers/video.ts`. No skill, agent, or shell script imports a vendor SDK directly.
2. `lib/router.ts` is the only entry point that resolves a task type into a concrete provider instance. It composes a factory plus the routing matrix.
3. `.specs/architecture/PROVIDERS.md` is the single source of routing truth. The router parses it at startup. Operators consult `ROUTING-MATRIX.md` for the (task x constraint) view.
4. `.env` (with `.env.example` as the contract) controls actual API keys, endpoints, and feature flags such as `HIGGSFIELD_MCP_ACTIVE`.
5. Skills declare a task type (for example `copy-short`, `image-carousel`, `video-reel`) and never name a provider. A piece may opt out by setting `provider_override` in its frontmatter; the router honors it but still applies the standard fallback chain on LLM failures.

## Consequences

Positive:

- Switching a provider is a one-line change in `PROVIDERS.md` plus a `.env` value.
- Cost optimization can be applied per task category without touching skills (move `caption` from `claude` to `deepseek` and watch `data/llm-usage.jsonl`).
- A/B at the provider level becomes possible by alternating defaults or by per-piece overrides; the same skill produces the variants.
- Tests run offline using the mock adapter that ships in each provider file.

Negative:

- One extra layer of indirection between skills and SDKs. Reading a stack trace requires knowing the factory.
- Every new provider must implement the interface and ship a mock; skipping the mock breaks CI.
- The routing matrix becomes a load-bearing document; stale entries cause silently wrong defaults.

## Alternatives Considered

- **SDK-direct in each skill.** Rejected. Produces vendor lock-in, scatters API key handling, and makes A/B impossible without rewriting skills.
- **Per-skill provider declaration (each skill picks its own vendor).** Rejected. Causes drift across skills, defeats centralized cost reporting, and makes brand voice inconsistent because different LLMs are silently used for similar copy tasks.
- **Runtime config service (a database or external feature flag system).** Rejected for now. The matrix is small enough to live in version control where reviews and rollbacks are first-class.
