---
name: compliance-generic
description: Cross-vertical compliance audit that blocks medical claims, financial guarantees, deceptive comparisons, and copyright issues
version: 0.1.0
---

# Compliance Generic

Fallback compliance auditor for any client without a vertical-specific rule set. Covers medical claim risk, financial guarantee risk, deceptive comparison, copyright sanity, and basic truthfulness. Returns the same JSON shape as the vertical auditors so downstream steps stay uniform.

## When to invoke

- Any piece without a matching vertical auditor in `.skills/compliance-*`.
- After `caption-multi-platform` and before publishing.
- During QA on a campaign plan when no specialized auditor applies.
- Pre-flight on imported third-party copy (UGC, influencer scripts, partner content).
- Sanity check on user-submitted testimonials.

## Inputs

- `text`: string. Copy to audit.
- `vertical`: string, optional. Vertical hint (`saas`, `ecommerce`, `finance`, `health`, `education`, `default`).
- `claims`: array of strings, optional. Specific claim phrases the editor flagged for review.
- `assets_described`: array of strings, optional. Visual elements referenced in the copy.
- `comparison_targets`: array of strings, optional. Brands or products explicitly compared.

## Process

1. Run a regex and lexical pass for medical-claim risk (`cura`, `treats`, `prevents`, `diagnose`, drug names).
2. Run a pass for financial-guarantee risk (`guaranteed return`, `risk free`, `lucro garantido`, `100% return`).
3. Check `comparison_targets`. If the copy claims superiority without evidence, mark as deceptive.
4. Check `assets_described` for trademark or copyright risk (named song, branded product imagery, celebrity likeness).
5. If `vertical` is `health`, `finance`, or `legal`, raise the strictness threshold and require an explicit disclaimer.
6. Build the violations list with rule id, phrase, severity, and location.
7. Build the suggestions list with concrete rewrites.
8. Return JSON `{ pass, violations, suggestions }` matching the shape used by the vertical auditors.

## Outputs

- `pass`: boolean. True only if zero high-severity violations.
- `violations`: array of objects. Each `{ rule, phrase, severity, location }`.
- `suggestions`: array of strings.
- `vertical_used`: string. Echo of the resolved vertical, useful for debugging.

## Examples

### Example 1: finance copy with a guaranteed-return phrase

Input: `{ text: "Invista hoje e garantimos 12% ao ano sem risco.", vertical: "finance" }`
Output: `{ pass: false, violations: [{ rule: "no_guaranteed_return", phrase: "garantimos 12% ao ano sem risco", severity: "high" }], suggestions: ["Remove guarantee language, add 'rentabilidade passada nao garante futura'"], vertical_used: "finance" }`

### Example 2: clean ecommerce copy

Input: `{ text: "Frete gratis acima de R$199. Veja a colecao nova.", vertical: "ecommerce" }`
Output: `{ pass: true, violations: [], suggestions: [], vertical_used: "ecommerce" }`

## Failure modes

- vertical unknown: default to `default` and raise the strictness one notch on every category.
- Ambiguous phrase: mark as `severity: medium` and surface for human review rather than pass.
- Missing `assets_described` when the copy clearly references a song or celebrity: flag a `severity: medium` copyright check.
- Disclaimer present but in fine print or off-screen: warn that disclaimers must remain visible in the final asset.

## Related skills

- `compliance-<active-client>`: optional vertical-specific auditor; if present in `.skills/`, takes priority over this generic skill for the active client.
- `caption-multi-platform`: each variant should pass through this skill before publish.
- `revisao-humanizada`: applies humanization after compliance edits.
- `llm-router`: invoked when a violation needs an LLM-generated rewrite.
