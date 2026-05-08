# CAMPAIGN — Template

Skeleton for a campaign brief. Copy this file to `.specs/strategy/campaigns/<campaign-id>/CAMPAIGN.md` and fill all `// PLACEHOLDER` fields. Add `HYPOTHESIS.md` and `ROUTING.md` siblings in the same folder.

`<campaign-id>` format: `YYYY-QN-<short-slug>` (e.g., `2026-Q2-launch-pilot`).

---

## 1. Identity

```yaml
id: // PLACEHOLDER  # YYYY-QN-<short-slug>
client_id: // PLACEHOLDER  # matches .specs/clients/<id>/
title: // PLACEHOLDER
owner: // PLACEHOLDER
status: planning  # planning | active | paused | concluded
```

---

## 2. Window

```yaml
start_date: YYYY-MM-DD
end_date:   YYYY-MM-DD
review_cadence: weekly  # weekly | biweekly
```

---

## 3. Hypothesis (one-line; full detail in HYPOTHESIS.md)

```
// PLACEHOLDER: We believe that <intervention> for <persona> on <channel> will produce <metric movement> within <timeframe>.
```

---

## 4. KPI targets

```yaml
primary_kpi:
  name: // PLACEHOLDER          # e.g., paid_reports_per_month
  target: // PLACEHOLDER        # e.g., 50
  current_baseline: // PLACEHOLDER

secondary_kpis:
  - { name: // PLACEHOLDER, target: // PLACEHOLDER }
  - { name: // PLACEHOLDER, target: // PLACEHOLDER }

guardrails:
  - { name: cost_per_paid_report, max: // PLACEHOLDER }
  - { name: refund_rate, max: // PLACEHOLDER }
```

---

## 5. Channels

```yaml
channels:
  primary:   // PLACEHOLDER     # single id from CHANNELS.md
  secondary: [// PLACEHOLDER]
  test:      [// PLACEHOLDER]   # exploratory channels
```

---

## 6. Budget split

```yaml
budget:
  currency: USD
  total: // PLACEHOLDER

  phases:
    - { name: organic-only, weeks: "1-N", paid_amount: 0 }
    - { name: paid-ramp,    weeks: "N-M", paid_amount: // PLACEHOLDER, channels: [meta_ads, // PLACEHOLDER] }

  promotion_rule: "// PLACEHOLDER: e.g., 'top 20% organic pieces by save rate get promoted'"
```

---

## 7. Pieces planned

```yaml
pieces_per_week: // PLACEHOLDER
distribution:
  - { pillar: // PLACEHOLDER, pieces: // PLACEHOLDER }
  - { pillar: // PLACEHOLDER, pieces: // PLACEHOLDER }

paid_creatives:
  rule: "// PLACEHOLDER: how organic gets promoted (top N by metric)"
  variants_per_creative: // PLACEHOLDER  # for A/B
```

---

## 8. Routing reference

Provider routing for this campaign is defined in `ROUTING.md` in the same folder.

---

## 9. Compliance scope

```yaml
applies:
  - product/COMPLIANCE.md
  - clients/<client_id>/COMPLIANCE.override.md
  - // PLACEHOLDER: campaign-specific extra rules (e.g., legal-reviewed claims allowed only in this window)
```

---

## 10. Success / kill criteria

```yaml
success: "// PLACEHOLDER: hit primary KPI by end_date with secondary KPIs at >= 70% of target"
kill:    "// PLACEHOLDER: pause if guardrail breached for two consecutive weekly reviews"
```

---

## 11. Notes for human reviewer

// HUMAN REVIEW: confirm baseline numbers from the previous month's analytics export before locking targets.
