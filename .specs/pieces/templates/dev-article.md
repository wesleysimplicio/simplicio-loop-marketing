# Template: long-form dev article

For DEV.to / Hashnode / Medium / TabNews / Habr / Qiita / Juejin style
technical articles. See `.specs/strategy/PLAYBOOKS.md` for per-channel
rules.

```yaml
template_id: dev-article
requires_evidence:
  - screenshot_or_metric
  - failure_or_tradeoff
```

## {{title}}

{{hook_paragraph}}

### The problem

{{problem_description}}

### What we tried that didn't work

{{failure_or_tradeoff}}
<!-- EVIDENCE REQUIRED: a concrete tradeoff, rejection, or dead end. If
     none is supplied at generation time, this section is rendered as
     "[EVIDENCE MISSING: no documented failure/tradeoff provided]" rather
     than invented. -->

### The approach

{{solution_description}}

### Evidence

{{screenshot_or_metric}}
<!-- EVIDENCE REQUIRED: screenshot path, metrics export, or log excerpt.
     Same missing-evidence rule as above. -->

### What's next

{{next_steps}}

---
{{cta_line}}
