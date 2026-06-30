---
id: PIECE-XXX
client: <client-id>
campaign: <campaign-id>
date: YYYY-MM-DD
status: draft
type: reel
pillar: <pillar-id from PILLARS>
platforms: [instagram, tiktok, youtube-shorts, facebook]
provider_override:
  llm_text: null
  image: null
  video: null
locale: pt-BR
claims_tag: UNVERIFIED
---

# Brief

One paragraph. What is this piece, who is the audience, what is the single behavior we want from them, and how does it ladder up to the campaign goal. Reference the pillar and any prior piece this responds to.

# Hook (3s)

The exact line spoken or shown in the first three seconds. One sentence. Optimized for stop-scroll.

# Script / Body

Full script for video, or full body for static/carousel. Include speaker cues, pauses, on-screen text. For carousels, list one block per slide.

# Visual Brief

Describe the visual treatment: setting, lighting, framing, props, wardrobe, on-screen text style, color grade. Reference brand visual rules. List any required assets (logo, brand color hex, font).

# Captions

## Instagram

Caption optimized for IG (max ~2200 chars, hooks early, hashtags at end).

## TikTok

Caption optimized for TikTok (short, conversational, max 5 hashtags).

## YouTube Shorts

Caption optimized for Shorts (descriptive, includes 1-line CTA).

## Facebook

Caption optimized for Facebook (longer-form acceptable, link-friendly).

# Tech Specs

- Aspect: 9:16 / 4:5 / 1:1 / 16:9
- Resolution: 1080x1920 (or applicable)
- Duration: <=60s for reels, n/a for static
- File size: <=100 MB
- Codec: MP4 H.264 / PNG / JPG
- Audio: 44.1 kHz stereo, -14 LUFS

# Compliance Check (auto-filled)

```json
{
  "pass": null,
  "violations": [],
  "suggestions": [],
  "checked_at": null,
  "checker": "compliance-<active-client>"
}
```

# Definition of Done

- [ ] Brief approved by client lead
- [ ] Hook tested against pillar voice
- [ ] Script/body matches locale and brand voice
- [ ] Visual brief produced (file paths in `outputs/<piece-id>/`)
- [ ] All platform captions present
- [ ] Tech specs verified against platform constraints
- [ ] Compliance check passed (`pass: true`)
- [ ] Watcher gate passed (claims_tag: MEASURED or CANON)
- [ ] Target metrics defined
- [ ] Schedule set in Notion calendar

# Target Metrics (48h)

- Reach: 0
- Save rate: 0%
- Profile-visit rate: 0%
- Comments per 1k reach: 0
- Share rate: 0%
- Click-through (where applicable): 0%
