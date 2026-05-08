# BRAND — Generic Schema

Base brand schema for any client served by Marketing Engine. Per-client values live in `.specs/clients/<id>/BRAND.override.md` and supersede this file at render time.

This file defines the **shape** of a brand profile, not the values. Treat empty placeholders as required fields the override must fill.

---

## 1. Mission

> One sentence. What the brand does and for whom. No adjectives without proof.

```
// PLACEHOLDER: <verb> <offering> for <audience> so they <outcome>.
```

---

## 2. Voice axes

Four axes, each scored on a 1-5 integer scale. Used by `humanizer` and `brand-voice` skills to gate copy.

| Axis | 1 | 5 |
|---|---|---|
| `tone` | Casual / informal | Editorial / formal |
| `formality` | First-name, contractions | Title case, full forms |
| `energy` | Calm, paced | High, urgent |
| `warmth` | Detached, professional | Intimate, emotive |

Default placeholder (override per client):

```yaml
voice_axes:
  tone: 3
  formality: 3
  energy: 3
  warmth: 3
```

---

## 3. Tone Do / Don't

### Do

- Speak in second person (you / your).
- Name concrete objects, numbers, materials, outcomes.
- Use imperative verbs in CTAs.
- Acknowledge cost or friction the customer already paid.
- One claim per sentence.

### Don't

- Use abstract aspirational nouns without a concrete referent (journey, transformation, energy, vibe).
- Stack adjectives (premium exclusive elevated curated).
- Use rhetorical questions for engagement farming.
- Promise moral or emotional outcomes ("you will feel powerful").
- Use AI-tell phrasing (delve, leverage, unlock the secret, revolutionize).
- Emoji in long-form copy unless platform convention requires.

---

## 4. Visual identity placeholders

```yaml
palette:
  primary: "// PLACEHOLDER: hex"
  secondary: "// PLACEHOLDER: hex"
  accent: "// PLACEHOLDER: hex"
  neutral_dark: "// PLACEHOLDER: hex"
  neutral_light: "// PLACEHOLDER: hex"

typography:
  display: "// PLACEHOLDER: family"
  body: "// PLACEHOLDER: family"
  mono: "// PLACEHOLDER: family or null"

imagery:
  style: "// PLACEHOLDER: editorial / lifestyle / illustrated / etc."
  aspect_defaults:
    feed_square: "1:1"
    feed_vertical: "4:5"
    story_reel: "9:16"
    landscape: "16:9"

logo:
  primary_path: "// PLACEHOLDER: relative path"
  monochrome_path: "// PLACEHOLDER: relative path"
  clear_space_units: 1
```

---

## 5. Lexicon

### Use

- // PLACEHOLDER: list of preferred nouns, verbs, product terms.

### Avoid

- // PLACEHOLDER: list of banned phrases. Include AI-tell phrases the brand has rejected (delve, leverage, etc.) and category cliches.

### Replace

| Avoid | Use instead |
|---|---|
| // PLACEHOLDER | // PLACEHOLDER |

---

## 6. Per-client overrides

Per-client overrides go in `.specs/clients/<client_id>/BRAND.override.md` and follow the same section order. Any field present in the override replaces the value here. Fields not overridden inherit from this file.

Override files MUST set:

- `mission`
- `voice_axes`
- `palette` (at least primary + neutral_dark + neutral_light)
- `typography.display` and `typography.body`
- At least three `lexicon.use` and three `lexicon.avoid` entries

Anything left as `// PLACEHOLDER` blocks rendering and surfaces in the compliance report.
