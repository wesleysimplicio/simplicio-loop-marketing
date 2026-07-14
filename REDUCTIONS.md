# REDUCTIONS

Canonical reduction catalog for the Asolaria integration requested in issue #78.

This file only lists reductions that can be traced to code, specs, or tests in this repository. It does not claim public-site outcomes that have not been shipped yet.

## Reduction 1 — provider rewrite to routing contract

- Before: changing LLM/image/video vendors usually means rewriting prompts, adapters, and workflows together.
- After: `task_type` routes through documented matrices and provider factories.
- Repo proof:
  - [README.md](./README.md)
  - [PROVIDERS](./.specs/architecture/PROVIDERS.md)
  - [lib/router.ts](./lib/router.ts)
  - [e2e/provider-router.spec.ts](./e2e/provider-router.spec.ts)
- Narrative angle: this reduces vendor churn into configuration work.

## Reduction 2 — campaign intent to bounded artifact set

- Before: a "campaign" is a loose collection of ideas, posts, screenshots, and tribal knowledge.
- After: a campaign is expressed as a bounded set of documents with identity, targets, channels, routing, and proof expectations.
- Repo proof:
  - [CAMPAIGN template](./.specs/strategy/CAMPAIGN-template.md)
  - [Campaign CLI](./lib/cli/campaign.ts)
  - [Campaign planner](./lib/campaigns/campaign.ts)
  - [e2e/campaign-loop.spec.ts](./e2e/campaign-loop.spec.ts)
- Narrative angle: this reduces go-to-market ambiguity into inspectable planning artifacts.

## Reduction 3 — generated content to evidence-aware content

- Before: marketing copy can overclaim or silently omit evidence.
- After: templates mark evidence gaps explicitly and community/compliance gates block unsafe outputs.
- Repo proof:
  - [content templates](./.specs/pieces/templates/)
  - [template renderer](./lib/content/templates.ts)
  - [community compliance](./lib/compliance/community.ts)
  - [e2e/content-templates.spec.ts](./e2e/content-templates.spec.ts)
- Narrative angle: this reduces persuasive noise into claims that can be challenged and revised.

## Reduction 4 — "done" as intuition to "done" as receipt

- Before: a run can be described as complete without stable artifacts.
- After: manifests, reports, journals, receipts, and logs anchor completion.
- Repo proof:
  - [artifact schemas](./contracts/marketing-artifacts/v1/schemas/)
  - [fixtures](./contracts/marketing-artifacts/v1/fixtures/)
  - [report builder](./lib/report/builder.ts)
  - [e2e/contracts.spec.ts](./e2e/contracts.spec.ts)
- Narrative angle: this reduces unverifiable status updates into receipts.

## Reduction 5 — manual promotion flow to guarded promotion

- Before: promoting a post to paid distribution can bypass review or hide spend assumptions.
- After: budget guardrails, action gates, and publish/promotion evidence are first-class.
- Repo proof:
  - [budget guardrail](./lib/promotion/budget-guardrail.ts)
  - [action gate](./lib/gate/action-gate.ts)
  - [verify pipeline](./lib/publish/verify-pipeline.ts)
  - [e2e/promotion.spec.ts](./e2e/promotion.spec.ts)
- Narrative angle: this reduces "growth hacking" into governed paid experimentation.

## Reduction 6 — long-running marketing work to looped, inspectable state

- Before: repeated generation and promotion attempts are easy to lose across sessions.
- After: loop state, journals, retrospectives, and watcher-style checks preserve state and lessons.
- Repo proof:
  - [loop CLI](./lib/cli/loop.ts)
  - [loop journal](./lib/loop/journal.ts)
  - [retrospective](./lib/learning/retrospective.ts)
  - [e2e/loop-drain.spec.ts](./e2e/loop-drain.spec.ts)
- Narrative angle: this reduces campaign drift into bounded iteration.

## Reproducible verification

Every proof link above can be re-checked mechanically, not just read:

```bash
node scripts/reductions-benchmark.mjs --check
```

The script fails closed if any listed proof file has gone stale, and (in its
default, non-`--check` mode) writes a footprint receipt to
`docs/evidence/reductions-benchmark.json`.

## What is still external

The issue also asked for reductions measured on public landing pages and public campaign runs. Those remain external until they exist:

- public site deployment (deploy-ready asset: [site/simplicio-on-metal/index.html](./site/simplicio-on-metal/index.html))
- real production benchmark dashboards
- public demo video export
- live traffic / conversion data

Until then, this catalog should be treated as repo-local narrative infrastructure, not proof of external campaign performance.
