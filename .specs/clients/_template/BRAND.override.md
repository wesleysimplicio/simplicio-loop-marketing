# BRAND.override — <CLIENT_NAME>

Per-client overrides on top of `.specs/product/BRAND.md`. Any field set here replaces the base value.

This is a TEMPLATE. Copy this folder to `.specs/clients/<client-id>/` and fill every `// PLACEHOLDER`.

---

## 1. Mission

```
// PLACEHOLDER: <verb> <offering> for <audience> so they <outcome>.
```

---

## 2. Voice axes

```yaml
voice_axes:
  tone:       3   # 1 casual ... 5 editorial
  formality:  3   # 1 informal ... 5 formal
  energy:     3   # 1 calm ... 5 high
  warmth:     3   # 1 detached ... 5 intimate
```

---

## 3. Tone Do / Don't (client-specific)

### Do

- // PLACEHOLDER

### Don't

- // PLACEHOLDER

---

## 4. Visual identity

```yaml
palette:
  primary:        "// PLACEHOLDER: hex"
  secondary:      "// PLACEHOLDER: hex"
  accent:         "// PLACEHOLDER: hex"
  neutral_dark:   "// PLACEHOLDER: hex"
  neutral_light:  "// PLACEHOLDER: hex"

typography:
  display: "// PLACEHOLDER"
  body:    "// PLACEHOLDER"
  mono:    null

imagery:
  style: "// PLACEHOLDER"

logo:
  primary_path:    "// PLACEHOLDER"
  monochrome_path: "// PLACEHOLDER"
```

---

## 5. Lexicon

### Use

- // PLACEHOLDER

### Avoid

- // PLACEHOLDER

### Replace

| Avoid | Use instead |
|---|---|
| // PLACEHOLDER | // PLACEHOLDER |

---

## 6. CTAs (canonical)

| Context | Locale | Copy |
|---|---|---|
| Primary | en | // PLACEHOLDER |
| Primary | // PLACEHOLDER | // PLACEHOLDER |
| Secondary | en | // PLACEHOLDER |

---

## 7. Notes for human reviewer

// HUMAN REVIEW: confirm voice axes against three real recent posts before locking.
