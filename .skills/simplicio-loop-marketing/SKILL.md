# simplicio-loop-marketing

Root super-skill orchestrator for the autonomous SaaS marketing loop.
Implements issue #48 (parent epic: #46). This skill does not duplicate any
existing capability — it sequences the lanes that already exist in this
repo and routes work through capability requests, never vendor-specific
code.

## Inputs

A campaign brief (`.specs/strategy/CAMPAIGN-template.md` shape, see
`lib/campaigns/campaign.ts`) supplies:

- `product`, `client_id` — which client under `.specs/clients/<slug>/`.
- `channels` — primary/secondary/test, resolved against
  `lib/channels/registry.ts`.
- `budget` — phases (organic-only first, then paid-ramp), consumed by
  `lib/promotion/budget-guardrail.ts`.
- `pieces_per_week` / `distribution` — pillar → piece count.
- `KPI` — primary/secondary metrics, see `lib/analytics/score.ts`
  `BUSINESS_METRICS` / `QUALITY_ENGAGEMENT_METRICS`.
- `language` — English-first; see `lib/channels/registry.ts`
  `englishFirstOrder()`.
- `DRY_RUN` — defaults true everywhere in this loop; live actions require
  explicit human promotion.

## Loop

```text
discover -> orient -> decide -> create -> verify -> publish -> measure -> promote -> learn -> repeat
```

| Stage | Capability | Owning module |
|---|---|---|
| discover | product/ICP scan | `.specs/product/*`, campaign brief |
| orient | channel plan | `lib/campaigns/campaign.ts` `planPieceQueue` |
| decide | piece queue → yool board | `lib/yool/board.ts` (`piece.plan` tuples) |
| create (copy) | script/caption generation | `lib/cli/generate.ts`, `lib/content/templates.ts`, `.skills/content-engineering-authentic/` |
| create (creative) | image/video generation | `lib/providers/image.ts`, `lib/providers/video.ts`, routed via `.specs/architecture/PROVIDERS.md` |
| verify (brand/humanize) | brand-voice + humanizer critics | `lib/skills/brand-voice.ts`, `lib/skills/humanizer.ts` |
| verify (claims) | watcher gate | `lib/gate/watcher-gate.ts`, `lib/gate/claims-gate.ts` |
| verify (compliance) | generic + community compliance | `lib/compliance/loader.ts`, `lib/compliance/community.ts` |
| publish | broker-routed publish/schedule | `lib/integrations/broker.ts`, `lib/publish/adaptlypost.ts`, `lib/automation/browser-lane.ts` |
| measure | metrics snapshot + accrual scoring | `lib/analytics/score.ts` |
| promote | winner → paused ads-draft, guardrails | `lib/cli/promote.ts`, `lib/promotion/budget-guardrail.ts` |
| community | comment monitor + reply drafts | `lib/community/reply-loop.ts` |
| learn | learnings + objection feed | `lib/promotion/learnings.ts`, `data/learnings.md` |

Every stage transition is a tuple write on the Yool board
(`.specs/architecture/YOOL-BOARD.md`) so the loop's state is inspectable
without re-deriving it from scratch.

## Required lanes (all present)

Market/product discovery, SaaS offer/ICP strategy, organic content
planning, copy/script generation, creative asset generation, brand
voice/humanization, compliance and anti-spam review, publish/schedule,
metrics ingestion, paid traffic draft/promotion, learning replay,
browser/computer-use evidence — see the Yool worker-lane list in
`.specs/architecture/YOOL-BOARD.md` for the 1:1 mapping.

## Definition of Done

**Per piece** (see also `CLAUDE.md` → "Definition of Done (per piece)"):

- [ ] Compliance JSON returns `pass: true` (generic) AND, for
      community/forum channels, `status: "pass"` from
      `lib/compliance/community.ts` (`"needs_review"` holds for a human,
      it is never treated as a pass).
- [ ] Watcher gate tag is `MEASURED` or `CANON`, never `UNVERIFIED`, before
      the piece leaves `draft`.
- [ ] 4-platform caption set generated where applicable.
- [ ] Evidence recorded (screenshot/metric) or the template explicitly
      marks `[EVIDENCE MISSING: ...]` — never fabricated.
- [ ] Manifest written under `outputs/<client>/<date>/<piece-id>/`.

**Per campaign loop**:

- [ ] Organic phase runs before paid ramp
      (`lib/campaigns/campaign.ts` `organicPhaseActive`) unless explicitly
      overridden.
- [ ] Every paid promotion passes `lib/promotion/budget-guardrail.ts`
      `checkGuardrails` and is recorded with its hypothesis.
- [ ] `marketing-engine campaign review <id>` summarizes winners, losers,
      spend, and lessons.

## Guardrails

- `DRY_RUN=true` by default across generate, promote, publish, and the
  browser/computer-use lane.
- Publish and paid actions require human review unless a piece/campaign
  is explicitly promoted — no skill or agent flips `DRY_RUN` itself.
- No skill or agent hardcodes a provider or channel-specific client; all
  routing goes through `lib/providers/matrix.ts` (LLM/image/video) and
  `lib/integrations/broker.ts` (publish/schedule/metrics/ads/comments/
  evidence).
