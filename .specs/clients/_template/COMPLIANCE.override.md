# Client Compliance Override Template

Add client- or vertical-specific rules here. These rules are additive only:
they never remove the cross-vertical constraints from
`product/COMPLIANCE.md`.

Use a fenced JSON block with one object per rule.

```json
[
  {
    "rule_id": "healthcare.registration_missing",
    "category": "health",
    "pattern": "CRP-[0-9]{4,}",
    "flags": "i",
    "severity": "warn",
    "remediation": "Add the licensed professional registration to the caption.",
    "applies_to": ["healthcare"]
  },
  {
    "rule_id": "beauty.before_after_disclaimer",
    "category": "health",
    "pattern": "before/after",
    "flags": "i",
    "severity": "block",
    "remediation": "Include the approved 'individual results vary' disclaimer."
  }
]
```
