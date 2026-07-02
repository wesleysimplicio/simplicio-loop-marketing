# Template: launch thread (HN / X / Show-HN style)

For a launch-day submission or thread. See `.specs/strategy/PLAYBOOKS.md`
§1 (Hacker News) and §10 (X).

```yaml
template_id: launch-thread
requires_evidence:
  - architecture_or_metric_summary
```

**Tweet/comment 1 (hook, must stand alone)**: {{what_it_does_plainly}}

**Tweet/comment 2**: {{how_its_built}}

**Tweet/comment 3**: {{architecture_or_metric_summary}}
<!-- EVIDENCE REQUIRED: a real architecture detail or metric. If none is
     supplied, render
     "[EVIDENCE MISSING: no architecture/metric detail available]". -->

**Tweet/comment 4**: {{what_was_hard_or_rejected}}

**Final (link)**: {{link_and_cta}}
