# Launch playbooks — priority dev/community channels

Issue #50. Defines the launch playbook for each of the ten priority
international technical-status channels. English-first: the artifact
written against these playbooks is always the source of truth; localized
variants (see `lib/channels/registry.ts` language groups) are translated
*from* the approved English piece, never generated independently, and must
preserve technical accuracy and community etiquette.

## Content principle — publish like an engineer, not an influencer

Every playbook below inherits these non-negotiables:

- Show real screenshots, real metrics, real logs.
- Explain the architecture, constraints, tradeoffs, and what failed.
- No influencer-style hype, no fake urgency, no unverifiable claims
  (enforced by `lib/gate/watcher-gate.ts` + `lib/compliance/community.ts`).
- Mention rejections and lessons learned — a launch post that only wins is
  a red flag to a technical audience.
- Every claim traces to an artifact (screenshot, metrics export, commit,
  postmortem) or is marked explicitly as unverified.

### Worked example — promoting a SaaS without sounding like an ad

Bad (ad-voice): *"🚀 Excited to announce our revolutionary AI platform!
Sign up now for 50% off — limited time only!!"*

Good (engineer-voice, matches these playbooks): *"We hit a p99 latency
wall at 40k concurrent users last month. Here's the queue redesign that
got us back under 200ms, including the approach that didn't work first
[screenshot of before/after trace]. Repo/demo linked at the bottom if
you want to poke at it."*

---

## 1. Hacker News

- **Title pattern**: `Show HN: <what it does, no adjectives>` or a plain
  factual headline for a technical article. Never "revolutionary",
  "game-changing", or exclamation marks.
- **Post structure**: one-paragraph technical summary as the first comment
  immediately after submitting — what it does, how it's built, what's
  hard about it, what you'd do differently.
- **Evidence**: link the actual product/demo/repo, not a marketing page.
- **Link policy**: submit the canonical technical URL only.
- **Timing**: weekday, 8-10am US Eastern for best front-page odds.
- **Comment-response protocol**: reply to every substantive technical
  question within the first 2 hours; concede real weaknesses instead of
  deflecting — HN penalizes defensiveness harder than the weakness itself.
- **Anti-spam**: one submission per launch; no vote manipulation; no
  asking others to upvote.

## 2. DEV.to

- **Title pattern**: descriptive, keyword-forward (`How we <did X> with
  <technology>`), no clickbait.
- **Post structure**: long-form technical article with code snippets,
  headers, and a closing "what's next" section.
- **Evidence**: inline code blocks and screenshots of real output/logs.
- **Link policy**: product link allowed in a closing "About" section, not
  mid-article.
- **Timing**: Tuesday-Thursday for peak reads.
- **Comment-response protocol**: reply within 24h; cross-link related
  DEV.to community threads.
- **Anti-spam**: tag accurately (max 4 tags); disclose if the article is
  about your own product in the body, not just a bio link.

## 3. Hashnode

- Same structural rules as DEV.to (long-form technical article via API,
  see `lib/channels/registry.ts` → `hashnode`), with a canonical-URL field
  set when cross-posting from a personal blog to avoid duplicate-content
  penalties.
- **Anti-spam**: identical self-promotion-after-value rule as DEV.to.

## 4. Medium (Programming)

- **Title pattern**: benefit-neutral, specific (`Debugging a 3am latency
  spike in <system>`), not "X things every developer should know".
- **Post structure**: narrative technical walkthrough; Medium's audience
  responds to story-driven postmortems more than reference docs.
- **Evidence**: screenshots of dashboards/graphs are load-bearing here —
  Medium readers scan visuals before committing to read.
- **Link policy**: one contextual link near the end.
- **Timing**: no strong day-of-week signal; optimize for evergreen SEO
  instead.
- **Anti-spam**: publication submission guidelines vary; check the target
  publication's contributor rules before submitting.

## 5. Habr (Russian)

- **Title pattern**: precise, technical, in Russian; Habr's audience
  penalizes marketing framing more aggressively than any other channel
  in this list.
- **Post structure**: deep technical rigor expected — architecture
  diagrams, benchmarks, and reproducible steps, not a summary.
- **Evidence**: benchmarks must be reproducible or explicitly caveated.
- **Link policy**: substance-first; Habr's karma system punishes
  perceived self-promotion.
- **Localization**: native-Russian technical review required before
  publish (see `lib/compliance/community.ts` `content.localization`
  check — this channel's checks are permanently `needs_review` until a
  human confirms tone).
- **Anti-spam**: no cross-posting unedited English content; must be
  written for the Habr audience specifically.

## 6. Qiita (Japanese)

- **Title pattern**: concrete and instructional (`<Technology>で<問題>を解
  決した話`), avoids superlatives per Japanese technical-writing norms.
- **Post structure**: step-by-step technical guide with code; Qiita
  rewards reproducibility (readers copy-paste snippets directly).
- **Evidence**: tested code blocks; broken snippets are heavily
  downvoted.
- **Link policy**: product link only in a clearly marked closing section.
- **Localization**: same native-review requirement as Habr.
- **Anti-spam**: tag precisely; no duplicate posts across Qiita/Zenn
  without noting the cross-post.

## 7. Juejin (Chinese)

- **Title pattern**: specific technical outcome framing, avoids hype
  words that trigger platform moderation.
- **Post structure**: technical deep-dive; screenshots of real dashboards
  build more trust here than prose claims.
- **Evidence**: metrics screenshots required for any performance claim.
- **Link policy**: minimal — Juejin's moderation is stricter on outbound
  commercial links than DEV.to/Hashnode.
- **Localization**: native-review required.
- **Anti-spam**: no bulk cross-posting from CSDN/V2EX without adaptation;
  moderators flag identical duplicate content across Chinese platforms.

## 8. TabNews (Portuguese, Brazil)

- **Title pattern**: direct, technical, in pt-BR; TabNews' community
  actively downvotes anything read as "growth hacking".
- **Post structure**: original technical content only — TabNews explicitly
  discourages pure link-shares (see `lib/channels/registry.ts` →
  `tabnews` link_policy).
- **Evidence**: real logs/metrics; the community is small and highly
  technical, low tolerance for unverifiable claims.
- **Link policy**: link is a reference, not the point of the post.
- **Comment-response protocol**: respond in Portuguese; the community
  expects native fluency, not machine-translated replies.
- **Anti-spam**: no more than one post per week per account (matches the
  registry's `frequency_limit`).

## 9. LinkedIn

- **Title pattern**: N/A (feed post, not a title) — hook in the first
  line before the "see more" fold (210 chars).
- **Post structure**: architecture/metrics-forward professional post;
  short paragraphs, one clear takeaway.
- **Evidence**: a single strong screenshot (dashboard, architecture
  diagram) performs better than a wall of text.
- **Link policy**: native link reduces reach; consider first-comment link
  if organic reach matters more than immediate click-through.
- **Timing**: Tuesday-Thursday, mid-morning local time.
- **Comment-response protocol**: reply to every comment within a
  business day; this is a relationship channel, not a broadcast one.
- **Anti-spam**: no engagement pods, no fake credentials/experience
  claims.

## 10. X / Twitter

- **Title pattern**: N/A — hook tweet must stand alone (first tweet of a
  thread gets algorithmically distributed independently of the rest).
- **Post structure**: thread with one idea per tweet; link in the last
  tweet, not the first (first-tweet links get reach-suppressed).
- **Evidence**: screenshots/GIFs embedded directly in-thread.
- **Timing**: weekday mornings in the audience's dominant timezone.
- **Comment-response protocol**: reply to technical pushback publicly and
  promptly; quote-tweet corrections rather than deleting.
- **Anti-spam**: no engagement-bait ("reply X for Y"), no purchased
  engagement, disclose sponsored threads.
