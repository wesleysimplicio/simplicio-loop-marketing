# PERSONAS — Generic Schema

Generic three-persona template. Every client override at `.specs/clients/<id>/PERSONAS.override.md` MUST define exactly three personas using this schema. Three is the cap to keep prioritization honest — additional segments are tracked as variants of a primary persona, not net-new personas.

---

## Schema

Each persona is a YAML-style block. All fields required unless marked optional.

```yaml
id: <kebab-case-id>
display_name: <short label, 2-4 words>
priority: <1 | 2 | 3>            # 1 = primary, 2 = secondary, 3 = tertiary

demographics:
  age_range: <e.g., "28-40">
  gender: <single value or list>
  location: <country / region scope>
  income_band: <single bucket>
  occupation: <single short label>
  household: <optional context, e.g., "single", "married with kids">

jobs_to_be_done:
  - <verb-led JTBD statement, 1 sentence>
  - <verb-led JTBD statement, 1 sentence>
  - <verb-led JTBD statement, 1 sentence>

pains:
  - <concrete pain, no abstractions>
  - <concrete pain, no abstractions>
  - <concrete pain, no abstractions>

gains:
  - <concrete gain, measurable when possible>
  - <concrete gain>
  - <concrete gain>

channels:
  primary: <single channel where this persona spends most time>
  secondary: [<channel>, <channel>]
  research: <where they validate before buying>

content_angles:
  - <angle 1: educational | proof | mythbusting | transformation | utility>
  - <angle 2>
  - <angle 3>

objections:
  - <objection 1 + one-sentence rebuttal>
  - <objection 2 + one-sentence rebuttal>

vocabulary:
  uses: [<word>, <word>, <word>]
  rejects: [<word>, <word>]
```

---

## Generic placeholders

### Persona 1 — Primary

```yaml
id: primary-persona
display_name: // PLACEHOLDER
priority: 1
demographics:
  age_range: // PLACEHOLDER
  gender: // PLACEHOLDER
  location: // PLACEHOLDER
  income_band: // PLACEHOLDER
  occupation: // PLACEHOLDER
jobs_to_be_done:
  - // PLACEHOLDER
pains:
  - // PLACEHOLDER
gains:
  - // PLACEHOLDER
channels:
  primary: // PLACEHOLDER
  secondary: []
  research: // PLACEHOLDER
content_angles:
  - // PLACEHOLDER
objections:
  - // PLACEHOLDER
vocabulary:
  uses: []
  rejects: []
```

### Persona 2 — Secondary

```yaml
id: secondary-persona
display_name: // PLACEHOLDER
priority: 2
# (same schema, fill all fields)
```

### Persona 3 — Tertiary

```yaml
id: tertiary-persona
display_name: // PLACEHOLDER
priority: 3
# (same schema, fill all fields)
```

---

## Routing rule

When a piece is generated, the brief MUST set `persona_id` to one of the three IDs from the client override. The router uses `persona.channels.primary` to pick the publishing surface unless the brief overrides it.

If a piece targets two personas, split it into two pieces. One piece, one persona.
