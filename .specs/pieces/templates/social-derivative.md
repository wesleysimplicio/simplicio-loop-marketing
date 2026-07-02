# Template: short social derivative

Fans a long-form dev article down into a short post for X/LinkedIn/TikTok/
YouTube Shorts. Always generated *from* the approved English dev-article,
never independently — see `.specs/strategy/PLAYBOOKS.md`.

```yaml
template_id: social-derivative
requires_evidence:
  - one_screenshot_or_metric
source_template: dev-article
```

{{hook_line}}

{{key_insight}}

{{screenshot_or_metric}}
<!-- EVIDENCE REQUIRED: reuse the single strongest visual from the source
     dev-article. If none is supplied, render
     "[EVIDENCE MISSING: no screenshot/metric carried over from source]". -->

{{cta_line}}

<!-- platform variants filled by caption-multi-platform skill for
     IG/TikTok/LinkedIn/X length + tone deltas -->
