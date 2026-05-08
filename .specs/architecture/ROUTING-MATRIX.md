# Routing Matrix (Operational View)

This is the operator-facing companion to `PROVIDERS.md`. While `PROVIDERS.md` lists the default and fallback per task, this matrix maps `(task type x constraint)` to the winning provider so an operator can answer "given this brief, who should I route to" in one lookup. The constraints are: `cheap` (cost is the binding limit), `brand-strict` (voice and policy fidelity matters more than novelty), `speed` (turnaround under fifteen minutes), `quality` (top output, cost not a constraint).

## Decision Table

| Task | Constraint | Winning Provider | Notes |
|------|------------|------------------|-------|
| caption | cheap | deepseek | Default for copy-short; cheapest token rate. |
| caption | brand-strict | claude | Highest adherence to brand voice and compliance rules. |
| caption | speed | deepseek | Fast inference; same as cheap. |
| caption | quality | claude | Use for hero posts and pinned content. |
| script (long copy) | cheap | deepseek | Acceptable for outline drafts; promote with claude pass. |
| script (long copy) | brand-strict | claude | Default; matches PROVIDERS.md long-copy default. |
| script (long copy) | speed | claude | Streaming + tool use shortens iteration loop. |
| script (long copy) | quality | claude | Default. |
| compliance check | cheap | claude | Always claude; cheap variants miss edge cases. |
| compliance check | brand-strict | claude | Same. |
| compliance check | quality | claude | Same. |
| translation | cheap | deepseek | Default. |
| translation | brand-strict | claude | When tone preservation is critical. |
| humanization | cheap | claude | Even on cheap, do not downgrade humanization. |
| humanization | quality | claude | Default. |
| image carousel | consistency | gpt-image | Template lock across slides. |
| image carousel | cheap | wavespeed | Acceptable when slides are independent visuals. |
| image carousel | brand-strict | gpt-image | Typography and brand color fidelity. |
| image quote card | quality | gpt-image | Typography precision. |
| image batch (A/B) | cheap | wavespeed | Default for batch hook variants. |
| image batch (A/B) | speed | wavespeed | Default. |
| image cinematic | quality | higgsfield | Soul 2.0 lighting and grade. |
| image UGC avatar | quality | topview | Native avatar templates. |
| image inpaint / edit | quality | gpt-image | Precise local edits. |
| image before/after | brand-strict | gpt-image | Precise consulting comparisons. |
| video reel | quality | higgsfield | Seedance 2.0; cinematic motion. |
| video reel | cheap | wavespeed | Hook-test variants only. |
| video reel | speed | wavespeed | Batch turnaround. |
| video UGC | ad-test | topview | Native avatar holds product; best ad CTR. |
| video product demo (URL) | quality | topview | Auto scrape and script. |
| video talking head | quality | topview | AI presenter. |
| video motion control | quality | higgsfield | DoP module. |

## How to use

1. Identify the task type (must match a `PROVIDERS.md` row).
2. Pick the dominant constraint for this piece. Only one wins.
3. Look up the row above. If the constraint is not listed for that task, fall back to the `PROVIDERS.md` default.
4. To override on a single piece, set `provider_override` in its frontmatter; this matrix is advisory only.
