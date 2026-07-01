# Release Readiness & Handoff

Documento curto para manter o repositório honesto sobre claims, evidência e estado real antes de merge/release.

## Objective

Antes de declarar um PR ou release como pronto, registre:

1. o que realmente mudou;
2. o que foi realmente validado;
3. quais comandos falharam ou ficaram bloqueados;
4. qual evidência ficou disponível para revisão.

Isso evita handoffs com status implícito ou claims sem prova.

## Minimum readiness checklist

- [ ] `npm run typecheck`
- [ ] `npm run test:e2e`
- [ ] `CHANGELOG.md` atualizado se houve mudança user-facing
- [ ] Nenhum segredo ou `.env` entrou no diff
- [ ] Se o trabalho toca generate/promote/gates, o resumo final menciona explicitamente watcher / claims behavior
- [ ] O handoff informa se a validação foi local, CI, parcial, ou bloqueada

## Claims & evidence rules

- Não diga “passou” sem citar o comando executado.
- Não diga “pronto para release” se `typecheck` ou `test:e2e` não rodaram ou falharam.
- Se a validação foi bloqueada por ambiente, cite o bloqueio literalmente (ex.: Node 16 local, suite exige Node 18+).
- Quando houver artifacts, referencie o caminho (`playwright-report/`, `test-results/`, `.marketing-engine/data/gate/...`).
- Se o comando não cobre o fluxo inteiro, diga o escopo real (“docs only”, “typecheck only”, “workspace command not exercised”).

## Recommended command set

```bash
node -v
npm run typecheck
npm run test:e2e
node bin/marketing-engine.mjs help
```

Quando houver host workspace inicializado, adicione os comandos relevantes ao change surface, por exemplo:

```bash
node bin/marketing-engine.mjs status
node bin/marketing-engine.mjs generate --max-iter 1
node bin/marketing-engine.mjs promote --window 7d
```

## Handoff template

```md
## Outcome
- <one-line result>

## Files touched
- <path>
- <path>

## Validation
- PASS | `npm run typecheck`
- FAIL/BLOCKED | `npm run test:e2e` — <literal reason>
- PASS | `node bin/marketing-engine.mjs help`

## Evidence
- <artifact path or "none generated">

## Risks / follow-ups
- <anything still unverified>
```

## Readiness states

Use these labels exactly:

- `ready` — requested validation ran and passed for the touched surface.
- `partially-ready` — some relevant checks passed, but at least one expected proving step did not run.
- `blocked` — a required proving step failed or the environment prevented execution.

## Notes for this repository

- `npm run test:e2e` is environment-sensitive because Playwright requires Node 18+.
- Commands like `status`, `logs`, `cost`, `alerts`, `generate`, and `promote` are only meaningful against a real `.marketing-engine/` workspace.
- Claims-gate / watcher-gate behavior is part of product correctness, not optional polish; if those surfaces are touched, the handoff should say how they were exercised or why they were not.
