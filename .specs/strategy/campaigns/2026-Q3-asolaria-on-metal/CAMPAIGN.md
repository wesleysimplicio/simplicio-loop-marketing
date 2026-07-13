# CAMPAIGN — 2026-Q3-asolaria-on-metal

## 1. Identity

```yaml
id: 2026-Q3-asolaria-on-metal
client_id: _template
title: Simplicio + Asolaria — on metal, with reductions
owner: issue-78-agent-6
status: planning
```

## 2. Window

```yaml
start_date: 2026-07-13
end_date:   2026-09-30
review_cadence: weekly
```

## 3. Hypothesis

Technical operators respond better to a reduction-first narrative than to generic AI-marketing language, especially when every claim points back to a repo artifact, spec, or test.

## 4. KPI targets

```yaml
primary_kpi:
  name: qualified_repo_visits
  target: 500
  current_baseline: external-baseline-required

secondary_kpis:
  - { name: doc_to_demo_ctr, target: 0.12 }
  - { name: campaign_asset_completion, target: 1.0 }

guardrails:
  - { name: unverifiable_claims_per_asset, max: 0 }
  - { name: live_spend_without_human_gate, max: 0 }
```

## 5. Channels

```yaml
channels:
  primary: linkedin
  secondary: [x, devto, hackernews]
  test: [tabnews]
```

## 6. Budget split

```yaml
budget:
  currency: USD
  total: external-budget-required

  phases:
    - { name: organic-only, weeks: "1-4", paid_amount: 0 }
    - { name: paid-ramp, weeks: "5-8", paid_amount: external-budget-required, channels: [meta_ads] }

  promotion_rule: "Only promote pieces that already have repo-local evidence, external proof links, and human approval receipts."
```

## 7. Pieces planned

```yaml
pieces_per_week: 4
distribution:
  - { pillar: reductions, pieces: 2 }
  - { pillar: on-metal, pieces: 1 }
  - { pillar: operator-discipline, pieces: 1 }

paid_creatives:
  rule: "Promote only the top organic piece with a linked proof trail."
  variants_per_creative: 3
```

## 8. Routing reference

See [ROUTING.md](./ROUTING.md).

## 9. Compliance scope

```yaml
applies:
  - product/COMPLIANCE.md
  - clients/_template/COMPLIANCE.override.md
  - "No claim may imply AGI/ASI capability beyond what the repo can demonstrate."
```

## 10. Success / kill criteria

```yaml
success: "All repo-local campaign assets exist, cross-link cleanly, and can be turned into publishable pieces without changing engine core."
kill:    "Pause if public-site or live-metrics dependencies remain unresolved for two review cycles."
```

## 11. Notes for human reviewer

- The repo-local package is complete when the map, reductions, landing, demo, and case-study docs exist and pass tests.
- Public deployment, public video export, and live analytics remain external follow-up items.
