# PILLARS — Generic Schema

Content pillar schema. Every client override at `.specs/clients/<id>/PILLARS.override.md` MUST define between 3 and 6 pillars whose `share_pct` values sum to 100.

Pillars are the topical buckets the calendar draws from. They are not channels and not formats.

---

## Schema

```yaml
id: <kebab-case-id>
theme: <short label, 2-4 words>
share_pct: <integer, 0-100>
description: <one sentence on what belongs in this pillar>

sample_formats:
  - format: <reel | carousel | story | short | post | thread | newsletter | shorts | live>
    angle: <educational | proof | mythbusting | transformation | utility | behind-the-scenes>
    example_hook: <one-line copy sample for this format>

target_personas: [<persona_id>, <persona_id>]
primary_channel: <single channel id; matches CHANNELS.md>

success_metrics:
  - <metric 1, e.g., "save rate", "watch time", "comments per 100 reach">
  - <metric 2>

cadence_per_week: <integer; how many pieces from this pillar weekly>
```

---

## Generic placeholder set (3 pillars summing to 100)

```yaml
- id: education
  theme: // PLACEHOLDER
  share_pct: 40
  description: // PLACEHOLDER
  sample_formats:
    - { format: carousel, angle: educational, example_hook: "// PLACEHOLDER" }
    - { format: short,    angle: mythbusting, example_hook: "// PLACEHOLDER" }
  target_personas: []
  primary_channel: // PLACEHOLDER
  success_metrics: []
  cadence_per_week: 1

- id: proof
  theme: // PLACEHOLDER
  share_pct: 30
  description: // PLACEHOLDER
  sample_formats:
    - { format: reel,     angle: transformation, example_hook: "// PLACEHOLDER" }
  target_personas: []
  primary_channel: // PLACEHOLDER
  success_metrics: []
  cadence_per_week: 1

- id: utility
  theme: // PLACEHOLDER
  share_pct: 30
  description: // PLACEHOLDER
  sample_formats:
    - { format: post,     angle: utility, example_hook: "// PLACEHOLDER" }
  target_personas: []
  primary_channel: // PLACEHOLDER
  success_metrics: []
  cadence_per_week: 1
```

---

## Hard rules

1. `share_pct` values across all pillars MUST sum to 100. CI fails the brand bundle otherwise.
2. Maximum 6 pillars. Beyond that the calendar loses focus and reporting becomes noise.
3. Every pillar MUST list at least one `target_personas` entry from the client persona override.
4. `primary_channel` MUST be a valid channel id from `CHANNELS.md`.
5. A pillar with `cadence_per_week: 0` is suspended and excluded from the schedule (kept here for audit trail; delete only after one full quarter of zero usage).
