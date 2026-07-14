# CASE STUDY — reductions in technical marketing

## Working title

From vague AI-marketing claims to bounded campaign artifacts

## Before

Typical technical-marketing workflows fail in familiar ways:

- campaign intent scattered across chat threads
- no canonical narrative index
- evidence optional
- public claims outrun repo reality
- provider choices bleed into copy and operations

## After

In this repo, the Asolaria-inspired package changes the workflow:

- one canonical map points to the repo's real maps
- one reduction catalog translates philosophy into local proof
- one campaign brief binds scope and review expectations
- one landing deck and one demo script prepare external publishing without forcing it
- one case-study skeleton states what is proven vs what is still external

## Reduction breakdown

| Reduction | Before | After | Proof |
|---|---|---|---|
| Narrative reduction | disconnected docs | canonical map of maps | `SIMPLICIO-MAP-OF-MAPS.md` |
| Claim reduction | hype-prone copy | evidence-aware claims | `REDUCTIONS.md` + template/gate docs |
| Campaign reduction | vague launch idea | bounded campaign brief | `CAMPAIGN.md` |
| Demo reduction | "we should make a video" | storyboarded operator flow | `DEMO.md` |

## Reproducible benchmark (shipped)

Every reduction claim above can be re-verified without reading this file at
all:

```bash
node scripts/reductions-benchmark.mjs
```

The script parses `REDUCTIONS.md`, confirms every listed "Repo proof" file
still exists (fail-closed — a stale link fails the run), and measures the
on-disk footprint of each reduction's proof artifacts. It writes a JSON
receipt to `docs/evidence/reductions-benchmark.json` so runs are comparable
over time. `--check` mode is wired for CI-style gating. This is the
"script que qualquer um pode rodar" the case study asked for — it proves the
narrative still points at real files, not that public conversion happened.

## What is not claimed yet

This repo-local package does not prove:

- production conversion rates
- public traffic results
- real spend efficiency
- a shipped, publicly hosted landing page (the static asset exists at
  [site/simplicio-on-metal/index.html](../../../../site/simplicio-on-metal/index.html)
  but is not deployed to a public domain)

Those need real external publication and analytics.

## Recommended public follow-up

1. Deploy the existing `site/simplicio-on-metal/index.html` to a real domain
2. Record a demo asset of `node scripts/demo-asolaria-loop.mjs` running
3. Publish one technical article and one launch thread
4. Collect real analytics
5. Re-open this case study with measured public receipts
