# PERSONAS.override — <CLIENT_NAME>

Per-client overrides on top of `.specs/product/PERSONAS.md`. Define exactly three personas. Three is the cap.

This is a TEMPLATE. Copy this folder to `.specs/clients/<client-id>/` and fill every `// PLACEHOLDER`.

---

## Persona 1 — Primary

```yaml
id: // PLACEHOLDER
display_name: // PLACEHOLDER
priority: 1

demographics:
  age_range: // PLACEHOLDER
  gender: // PLACEHOLDER
  location: // PLACEHOLDER
  income_band: // PLACEHOLDER
  occupation: // PLACEHOLDER
  household: // PLACEHOLDER

jobs_to_be_done:
  - // PLACEHOLDER
  - // PLACEHOLDER
  - // PLACEHOLDER

pains:
  - // PLACEHOLDER
  - // PLACEHOLDER
  - // PLACEHOLDER

gains:
  - // PLACEHOLDER
  - // PLACEHOLDER
  - // PLACEHOLDER

channels:
  primary: // PLACEHOLDER
  secondary: []
  research: // PLACEHOLDER

content_angles:
  - // PLACEHOLDER
  - // PLACEHOLDER
  - // PLACEHOLDER

objections:
  - // PLACEHOLDER
  - // PLACEHOLDER

vocabulary:
  uses: []
  rejects: []
```

---

## Persona 2 — Secondary

```yaml
id: // PLACEHOLDER
display_name: // PLACEHOLDER
priority: 2

# (same schema as Persona 1, fill all fields)
```

---

## Persona 3 — Tertiary

```yaml
id: // PLACEHOLDER
display_name: // PLACEHOLDER
priority: 3

# (same schema as Persona 1, fill all fields)
```

---

## Notes for human reviewer

// HUMAN REVIEW: validate each persona against at least one real customer interview transcript or survey response before locking.
