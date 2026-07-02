# content-engineering-authentic

Generates SaaS promotion copy that reads like an engineer wrote it:
technical, honest, evidence-backed, community-respectful. Implements
issue #57.

## Summary

Five content templates live under `.specs/pieces/templates/`:

| Template | Use | requires_evidence |
|---|---|---|
| `dev-article.md` | Long-form technical article (DEV.to/Hashnode/Medium/TabNews/Habr/Qiita/Juejin) | failure_or_tradeoff, screenshot_or_metric |
| `social-derivative.md` | Short IG/TikTok/LinkedIn/X post, derived from the approved dev-article | one_screenshot_or_metric |
| `video-script.md` | YouTube Shorts/TikTok/Reels build-in-public or demo script | on_screen_demo_or_metric |
| `reddit-forum-answer.md` | Substantive answer in an existing thread, never a drive-by link | technical_answer |
| `launch-thread.md` | HN/Show-HN/X launch thread | architecture_or_metric_summary |

`lib/content/templates.ts` renders a template against supplied data. Any
field listed in the template's `requires_evidence` frontmatter that is not
supplied is rendered as an explicit `[EVIDENCE MISSING: ...]` marker
instead of being silently blank or fabricated — this keeps generated
copy consistent with the claims discipline enforced downstream by
`lib/gate/watcher-gate.ts` (block on overpromise/placeholder language) and
`lib/compliance/community.ts` (block on unverifiable/promotional content).

## English-first, then localize

`renderEnglishFirst()` always produces the English render first as the
source-of-truth artifact. A localized adaptation is a second pass that
overrides only the fields provided; any field not overridden carries the
same evidence forward unchanged — translation must never introduce a new
claim. Every non-English render is flagged `needs_native_review: true`,
matching the `content.localization` check in
`lib/compliance/community.ts`.

## Voice rules (enforced downstream, documented here for the generator)

- English first.
- No influencer-style exaggerated claims, no fake urgency.
- No unverifiable revenue/performance claims — missing evidence is marked,
  never invented.
- Include constraints, tradeoffs, and what did not work.
- Prefer concrete screenshots, logs, metrics, demos, and code snippets
  over adjectives.

## Integration points

- `.specs/pieces/templates/*.md` — the five templates.
- `lib/content/templates.ts` — `loadTemplate`, `renderTemplate`,
  `renderEnglishFirst`.
- `lib/skills/humanizer.ts` — strips AI-writing tells from the rendered
  copy before it reaches compliance; humanization must preserve technical
  terms rather than genericizing engineering language.
- `.specs/strategy/PLAYBOOKS.md` — per-channel structure/timing/anti-spam
  rules a rendered piece must additionally satisfy before publish.
- `lib/gate/watcher-gate.ts`, `lib/compliance/community.ts` — downstream
  gates that block on placeholder/overpromise language and on
  unverifiable/promotional community posts respectively.

## Definition of Done

- [ ] Every template renders with zero unresolved `{{field}}` placeholders.
- [ ] Every `requires_evidence` field is either filled or explicitly
      marked `[EVIDENCE MISSING: ...]` — never silently blank.
- [ ] English artifact exists before any localized variant is generated.
- [ ] Localized variants are flagged `needs_native_review` until a human
      confirms tone/etiquette.
