# Template: video script (build-in-public / demo)

For YouTube Shorts / TikTok / Reels build-in-public or product-demo
scripts. Provider-neutral — routed via `video-prompt-builder` per
`.specs/architecture/PROVIDERS.md`.

```yaml
template_id: video-script
requires_evidence:
  - on_screen_demo_or_metric
```

**Hook (0-3s)**: {{hook_line}}

**Context (3-10s)**: {{problem_statement}}

**Demo / evidence (10-40s)**: {{on_screen_demo_or_metric}}
<!-- EVIDENCE REQUIRED: a real screen recording, dashboard, or metric to
     show on screen. If none is supplied, render
     "[EVIDENCE MISSING: no demo/metric available for on-screen proof]"
     rather than describing a fabricated demo. -->

**Tradeoff / honesty beat (40-50s)**: {{failure_or_limitation}}

**CTA (50-60s)**: {{cta_line}}
