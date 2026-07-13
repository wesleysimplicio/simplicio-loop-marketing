# SIMPLICIO MAP OF MAPS

Canonical narrative index for the Simplicio x Asolaria integration package requested in issue #78.

This file does not change the engine's runtime behavior. It gives maintainers, operators, and technical audiences one place to understand how this repository reduces complexity and how its narrative artifacts connect.

## Why this file exists

Asolaria's "map of maps" framing is useful here because `simplicio-loop-marketing` already ships many partial maps:

- product maps
- architecture maps
- operator maps
- strategy maps
- evidence maps

What was missing was a canonical bridge that explains how those maps fit together for a technical marketing narrative.

## Canonical local maps

| Map | Purpose | Why it matters for the Asolaria narrative |
|---|---|---|
| [VISION](./.specs/product/VISION.md) | Product promise and non-goals | Grounds the narrative in what the engine actually promises. |
| [DOMAIN](./.specs/product/DOMAIN.md) | Core entities and domain rules | Shows what is being reduced: content operations into stable artifacts. |
| [DESIGN](./.specs/architecture/DESIGN.md) | System architecture | Gives the technical backbone behind every marketing claim. |
| [PROVIDERS](./.specs/architecture/PROVIDERS.md) | Routing contract for vendor swaps | Supports the "config, not rewrite" message. |
| [PLAYBOOKS](./.specs/strategy/PLAYBOOKS.md) | Channel-specific launch behavior | Connects technical truth to real distribution behavior. |
| [docs/architecture-map](./docs/architecture-map.md) | Maintainer-level repo map | Useful for operators and coding agents orienting quickly. |
| [docs/OPERATOR](./docs/OPERATOR.md) | Loop/operator contract | Ties marketing execution back to auditable operational discipline. |
| [REDUCTIONS.md](./REDUCTIONS.md) | Reduction catalog for this repo | Converts the Asolaria concept into repo-local, testable claims. |

## Simplicio ecosystem view

This repository is one map inside a larger Simplicio ecosystem:

| Layer | Repo role | Reduction provided |
|---|---|---|
| `simplicio-runtime` | execution substrate | reduces agent action from ad-hoc shell work to bounded runtime contracts |
| `simplicio-mapper` | repo survey/orientation | reduces codebase discovery into compressed maps and queries |
| `simplicio-dev-cli` | deterministic operation | reduces broad coding intent into bounded, test-backed task execution |
| `simplicio-loop` | iterative convergence | reduces long-running work into evidence-gated loops |
| `simplicio-loop-marketing` | technical marketing execution | reduces narrative-to-campaign work into auditable artifacts and DRY_RUN-safe loops |

## Asolaria alignment

Issue #78 asked for two narrative integrations:

1. "what-is-asolaria / how do we get reductions in everything"
2. "Asolaria ASI on metal, fabric, and matrix"

This repo can represent those ideas safely in four ways:

- by naming the reductions the engine already performs
- by documenting how local artifacts replace vague marketing claims
- by framing the engine as "operator-first" and "artifact-first"
- by distinguishing repo-local deliverables from externally hosted campaign surfaces

It should not claim more than the repo can prove.

## Repo-local narrative deliverables

Issue #78 is now grounded in the following repo-local assets:

- [REDUCTIONS.md](./REDUCTIONS.md)
- [Campaign brief](./.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/CAMPAIGN.md)
- [Hypothesis](./.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/HYPOTHESIS.md)
- [Routing plan](./.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/ROUTING.md)
- [Landing page copy deck](./.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/LANDING.md)
- [Demo loop script](./.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/DEMO.md)
- [Case study](./.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/CASE-STUDY.md)

## External dependencies kept explicit

The original issue also asked for public site outcomes that this repo alone cannot publish by itself.

Those items remain external until a real site target exists:

- public landing deployment such as `simpleti.com.br/simplicio/on-metal`
- site navigation / section wiring
- live demo media export
- analytics from a public campaign run

The docs above are written so those external surfaces can be published later without changing engine core logic.
