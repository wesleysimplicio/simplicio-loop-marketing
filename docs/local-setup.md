# Local Setup

Guia real do repositório `marketing-engine` para desenvolvimento e validação local.

## Prerequisites

- Runtime / stack: Node.js ESM + TypeScript + Playwright
- Node.js: `>=18.0.0` (declarado em `package.json#engines`)
- Package manager: npm
- Database: none
- External services: opcionais no fluxo local; provider credentials só são necessárias para rotas reais fora de mocks / `DRY_RUN`
- Secrets: revise `.env`, `.marketing-engine/.env` e secrets de CI antes de rodar fluxos protegidos

## Install

```bash
npm install
```

## Smoke / CLI entrypoint

Este repositório é uma CLI package; não há `npm run dev` nem servidor web local obrigatório.

```bash
node bin/marketing-engine.mjs help
```

Se quiser exercitar o workspace completo da engine:

```bash
cp .env.example .env   # ou use .marketing-engine/.env em um host repo inicializado
node bin/marketing-engine.mjs check
```

## Validate

```bash
npm run typecheck
npm run test:e2e
```

Notas:

- `npm run test:e2e` usa Playwright como harness de CLI e exige Node 18+.
- Os testes usam mocks por padrão; não precisam subir um app HTTP do projeto.

## Expected services

Nenhum serviço HTTP local é obrigatório para o loop padrão deste repositório.

| Surface | Entry point | Health check |
|---|---|---|
| CLI | `node bin/marketing-engine.mjs help` | saída de usage sem erro |
| TypeScript | `npm run typecheck` | exit code `0` |
| Playwright harness | `npm run test:e2e` | suíte concluída |

## Workspace expectations

- `marketing-engine status`, `logs`, `cost`, `alerts` e fluxos semelhantes esperam um workspace `.marketing-engine/` válido no host.
- Para testar isso end-to-end, inicialize um host repo com `marketing-engine init` antes de chamar comandos dependentes de dados.
- `DRY_RUN=true` é o default seguro quando o ambiente não define o contrário.

## Evidence

```bash
npm run test:e2e
```

Artefatos esperados:

- `playwright-report/`
- `test-results/`
- anexos de stdout/stderr/meta gerados pelos specs de CLI
