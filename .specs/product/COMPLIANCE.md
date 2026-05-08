# COMPLIANCE — Generic Schema

Cross-vertical compliance schema enforced by the `compliance-*` skills before any piece is published. Per-vertical extensions live in `.specs/clients/<id>/COMPLIANCE.override.md` (when needed).

This file defines:

1. Cross-vertical DON'Ts that apply to every client by default.
2. The shape of a compliance report.
3. The escalation path when a violation is flagged.

---

## 1. Cross-vertical DON'Ts (apply to all clients)

### Health and medical claims

- No claim of medical efficacy, diagnosis, treatment, or cure for any condition without a licensed-professional disclaimer in the same piece.
- No "scientifically proven" / "clinically proven" without a citation linked in the caption.
- No before/after of a person without (a) explicit written permission on file and (b) the disclaimer "Individual results vary."
- No weight-loss claims with a specific number (e.g., "lose 5 kg in 2 weeks") unless backed by a real, published study.

### Financial claims

- No guaranteed returns, guaranteed income, or guaranteed cash-back.
- No "risk-free" framing for any paid product. "Refund within X days" is allowed if the refund policy is real and linked.
- No "10x your revenue" / "double your sales" without an averaged-cohort source.

### Comparative deception

- No naming a competitor in a way that misrepresents their product.
- No "better than [Competitor]" without a published, sourced benchmark.
- No screenshot of a competitor's UI presented as if it were the brand's product.

### Audience integrity

- No false scarcity (countdown timers that reset, "only 3 left" without inventory truth).
- No fake testimonials, AI-generated faces presented as customers, or recycled stock photos labelled as users.
- No engagement bait that violates the platform's policy (follow-to-unlock, comment-to-DM with a hidden affiliate trap).

### Legal and IP

- No copyrighted music in long-form video without a licensed source (platform library counts when the platform sells the rights).
- No third-party trademark in piece copy unless the brand has a documented licensing relationship.
- No screenshot of a paid course / book / paywalled article reposted as own content.

### Privacy

- No customer name, photo, location, or email visible in any piece without written consent on file.
- No chat-screenshot reposting (DM, WhatsApp, etc.) without the other party's consent on file.
- No "we know who clicked" framing that suggests surveillance the brand does not perform.

---

## 2. Compliance report shape

The `compliance-*` skill returns this JSON for every piece:

```json
{
  "piece_id": "<piece id>",
  "pass": true,
  "violations": [
    {
      "rule_id": "<short id, e.g., 'health.medical_claim'>",
      "severity": "block",
      "snippet": "<offending text snippet>",
      "remediation": "<what to change>"
    }
  ],
  "warnings": [
    {
      "rule_id": "<id>",
      "snippet": "<text>",
      "note": "<context>"
    }
  ],
  "checked_against": ["product/COMPLIANCE.md", "clients/<id>/COMPLIANCE.override.md"]
}
```

`pass: false` blocks publishing. Warnings are surfaced but do not block.

---

## 3. Per-vertical extensions

Verticals known to need a custom override:

| Vertical | Override file | Adds |
|---|---|---|
| Healthcare | `clients/<id>/COMPLIANCE.override.md` | HIPAA / LGPD-saude scope, professional registration display |
| Finance / fintech | same | local regulator (CVM, SEC, FCA) disclosure rules |
| Beauty / cosmetics | same | Anvisa / FDA registration claim rules, before/after disclaimer |
| Children / minors | same | parental consent, age-gated content rules |
| Alcohol / tobacco / gambling | same | platform age-gate, regional ad restrictions |
| Crypto / Web3 | same | risk warnings, "not financial advice" boilerplate |

The override file ADDS rules to this base. It does not subtract from it. A client cannot opt out of the cross-vertical DON'Ts.

---

## 4. Escalation

1. `severity: warn` -> logged, piece publishes, weekly digest to brand owner.
2. `severity: block` -> piece moves to `data/compliance-blocked/` with full report. Owner reviews, fixes copy, re-runs the pipeline.
3. Repeat block on the same `rule_id` for the same client three times in a week -> automatic alert to the brand owner with the rule and the offending pieces.

---

## 5. Audit trail

Every published piece carries a `compliance_report` field in its metadata pointing to the JSON report saved at `data/compliance/<piece_id>.json`. Pieces published without a report are flagged in the next daily audit run.
