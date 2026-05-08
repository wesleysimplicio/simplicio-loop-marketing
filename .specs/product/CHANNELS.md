# CHANNELS — Generic Channel Specs

Per-platform technical and editorial specs the engine respects when generating, formatting, and scheduling pieces. Numbers reflect platform defaults at time of writing; revisit quarterly.

A pillar's `primary_channel` and a piece's `channel` MUST match an `id` in the table below.

---

## Channel index

| id | Platform | Primary surface | Secondary surfaces |
|---|---|---|---|
| `ig_reels` | Instagram | Reels | Feed, Explore |
| `ig_carousel` | Instagram | Feed carousel | Profile grid |
| `ig_stories` | Instagram | Stories | Highlights |
| `tiktok` | TikTok | For You feed | Profile |
| `yt_shorts` | YouTube | Shorts shelf | Channel page |
| `fb_feed` | Facebook | Feed post | Page tab |
| `fb_reels` | Facebook | Reels | Watch |
| `linkedin_post` | LinkedIn | Feed | Profile activity |

---

## Per-platform specs

### `ig_reels` — Instagram Reels

| Field | Value |
|---|---|
| Aspect ratio | 9:16 |
| Resolution | 1080 x 1920 minimum |
| Max duration | 90 s (publish), 180 s (rolling out) |
| Recommended duration | 7-21 s for hook, 30-60 s for tutorials |
| Caption length | 2,200 chars hard cap; first 125 chars visible above the fold |
| Hashtags | 3-5 (over-tagging hurts reach) |
| Cover | 1080 x 1920 still extracted from the video or custom upload |
| Audio | Trending audio gives reach boost; original audio enables remix |
| Posting cadence default | 3 / week |

### `ig_carousel` — Instagram Carousel

| Field | Value |
|---|---|
| Aspect ratio | 4:5 (vertical) preferred; 1:1 acceptable |
| Resolution | 1080 x 1350 (4:5) or 1080 x 1080 (1:1) |
| Slides | 3-10 (sweet spot 5-7) |
| Caption length | 2,200 chars hard cap; first 125 chars above fold |
| Hashtags | 3-5 |
| Posting cadence default | 2 / week |

### `ig_stories` — Instagram Stories

| Field | Value |
|---|---|
| Aspect ratio | 9:16 |
| Resolution | 1080 x 1920 |
| Max duration per slide | 60 s (auto-splits into 60 s segments) |
| Slides per story set | up to 100 / day |
| Caption length | text overlays, 250 chars per sticker |
| Stickers / interactives | poll, quiz, slider, question, link (single per story) |
| Lifespan | 24 h (Highlights for permanent) |
| Posting cadence default | daily |

### `tiktok` — TikTok

| Field | Value |
|---|---|
| Aspect ratio | 9:16 |
| Resolution | 1080 x 1920 |
| Max duration | 10 min (publish), 60 s for max algorithmic boost in most niches |
| Recommended duration | 15-45 s for hook-led content, 60-180 s for storytelling |
| Caption length | 4,000 chars hard cap; first ~70 chars visible above fold |
| Hashtags | 3-5 mixed (broad + niche) |
| Cover | 1080 x 1920 custom or auto |
| Audio | Trending sound is decisive; original audio for credibility content |
| Posting cadence default | 4 / week |

### `yt_shorts` — YouTube Shorts

| Field | Value |
|---|---|
| Aspect ratio | 9:16 |
| Resolution | 1080 x 1920 minimum, 1440 x 2560 preferred |
| Max duration | 60 s (publish) |
| Recommended duration | 30-50 s |
| Title length | 100 chars; only first ~50 visible on Shorts shelf |
| Description | 5,000 chars; first 2 lines visible without expand |
| Hashtags | up to 15; #Shorts placement boosts surfacing |
| Cover | not selectable on Shorts; first frame becomes thumb |
| Posting cadence default | 2 / week |

### `fb_feed` — Facebook Feed

| Field | Value |
|---|---|
| Aspect ratio | 1:1 or 4:5 image, 16:9 video |
| Resolution | 1080 x 1080 (1:1), 1080 x 1350 (4:5), 1280 x 720 (video) |
| Max video duration | 240 min (publish), 90 s for Reels surface |
| Caption length | 63,206 chars hard cap; first 80 chars visible |
| Hashtags | 1-3 (low signal on Facebook) |
| Posting cadence default | 2 / week |

### `fb_reels` — Facebook Reels

| Field | Value |
|---|---|
| Aspect ratio | 9:16 |
| Resolution | 1080 x 1920 |
| Max duration | 90 s |
| Caption length | 2,200 chars; first 80 chars visible |
| Hashtags | 1-3 |
| Posting cadence default | 2 / week (cross-post from `ig_reels` acceptable) |

### `linkedin_post` — LinkedIn Feed Post

| Field | Value |
|---|---|
| Image aspect | 1.91:1 (1200 x 627) for link / share image; 1:1 for native upload |
| Video | 16:9 or 1:1; 4:5 supported |
| Max video duration | 10 min |
| Recommended duration | 30-90 s |
| Post text length | 3,000 chars hard cap; first 210 chars visible above "see more" |
| Hashtags | 3-5 (mid-tail performs best) |
| Carousel (PDF document) | up to 300 pages, recommend 8-12 |
| Posting cadence default | 3 / week |

---

## Cadence summary (default per channel, per week)

| Channel | Default cadence |
|---|---|
| `ig_reels` | 3 |
| `ig_carousel` | 2 |
| `ig_stories` | 7 |
| `tiktok` | 4 |
| `yt_shorts` | 2 |
| `fb_feed` | 2 |
| `fb_reels` | 2 |
| `linkedin_post` | 3 |

Override per client in the campaign brief (`channels` block of `CAMPAIGN.md`). The default is a starting point, not a contract.

---

## Cross-posting rules

1. `ig_reels` MAY auto-cross-post to `fb_reels` and `yt_shorts` if the cover, caption length, and audio license all qualify.
2. `linkedin_post` is NEVER auto-cross-posted from another channel; the formality and audience differ enough that copy must be re-derived by the `crosspost` skill.
3. `tiktok` is NEVER auto-cross-posted to `ig_reels` because the hook conventions differ; the engine generates a fresh first-3-seconds variant.
4. `ig_stories` is single-channel. Stories are never reused as Reels covers.

---

## Notes

- Numbers above match platform docs as of 2026 Q2. Re-verify each quarter; track changes in `CHANGELOG.md`.
- Cadence defaults assume a single account per channel. Multi-account fan-out is configured per client in `clients/<id>/CHANNELS.override.md` if needed.
