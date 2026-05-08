# PILLARS.override — <CLIENT_NAME>

Per-client overrides on top of `.specs/product/PILLARS.md`. The list below replaces the base set entirely. `share_pct` values MUST sum to 100.

This is a TEMPLATE. Copy this folder to `.specs/clients/<client-id>/` and fill every `// PLACEHOLDER`.

---

```yaml
- id: // PLACEHOLDER
  theme: // PLACEHOLDER
  share_pct: 0
  description: // PLACEHOLDER
  sample_formats:
    - { format: // PLACEHOLDER, angle: // PLACEHOLDER, example_hook: "// PLACEHOLDER" }
  target_personas: []
  primary_channel: // PLACEHOLDER
  success_metrics: []
  cadence_per_week: 0

- id: // PLACEHOLDER
  theme: // PLACEHOLDER
  share_pct: 0
  description: // PLACEHOLDER
  sample_formats:
    - { format: // PLACEHOLDER, angle: // PLACEHOLDER, example_hook: "// PLACEHOLDER" }
  target_personas: []
  primary_channel: // PLACEHOLDER
  success_metrics: []
  cadence_per_week: 0

- id: // PLACEHOLDER
  theme: // PLACEHOLDER
  share_pct: 0
  description: // PLACEHOLDER
  sample_formats:
    - { format: // PLACEHOLDER, angle: // PLACEHOLDER, example_hook: "// PLACEHOLDER" }
  target_personas: []
  primary_channel: // PLACEHOLDER
  success_metrics: []
  cadence_per_week: 0
```

---

## Notes for human reviewer

// HUMAN REVIEW: validate share_pct sum = 100 and that each pillar has at least one matching persona id from PERSONAS.override.md.
