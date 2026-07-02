# Template: Reddit/forum answer

For answering an existing thread/question with substance first — never a
drive-by link. Gated by `lib/compliance/community.ts` before posting.

```yaml
template_id: reddit-forum-answer
requires_evidence:
  - technical_answer
```

{{direct_answer_to_the_question}}
<!-- EVIDENCE REQUIRED: the technical_answer field must contain a real,
     specific answer (config, snippet, reasoning). If generation could not
     produce a specific answer, render
     "[EVIDENCE MISSING: no verified technical answer available — escalate
     to human]" instead of a generic non-answer. -->

{{caveats_or_alternatives}}

{{optional_mention_of_own_product_with_disclosure}}
<!-- Only include if genuinely relevant to the thread; must carry an
     explicit disclosure per lib/compliance/community.ts checkDisclosure. -->
