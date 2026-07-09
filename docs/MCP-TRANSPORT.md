# MCP transport — contrato para ligar providers reais (fase opcional)

Os providers de creative (Higgsfield/TopView), publish (adaptlypost) e ads
(meta-ads) hoje são **stubs DRY_RUN** que exigem um transporte MCP injetado
pelo caller. Este documento é o contrato para ligá-los de verdade — nenhum
código desta fase roda sem credenciais humanas e `DRY_RUN=false` explícito.

## Princípios (não negociáveis)

1. **Provider-agnostic**: nenhum skill/agent nomeia provider; o roteamento
   vem de `.specs/architecture/PROVIDERS.md` + `.env`
   (`lib/providers/matrix.ts`, `lib/integrations/broker.ts`).
2. **DRY_RUN default**: o bin injeta `DRY_RUN=true` quando ausente. Nenhum
   código flipa isso sozinho — só um humano, via `.env`, depois de revisar
   uma peça.
3. **Publicação sempre verificada**: o caminho real passa por
   `lib/publish/verify-pipeline.ts` (manifest contract → claims gate →
   compliance → publish → receipt) — um transporte real NUNCA é chamado
   com conteúdo `UNVERIFIED`.
4. **Falha nunca vira fake-pass**: transporte ausente/erro = receipt
   `blocked`/`failed` com `failure_class`, jamais um sucesso simulado.

## Pontos de injeção

| Superfície | Stub atual | Onde plugar o transporte |
|---|---|---|
| Imagem (higgsfield/topview) | `lib/providers/image.ts` ("MCP transport required") | Implementar `ImageProvider` que fala com o MCP do caller; registrar no registry do módulo |
| Vídeo (higgsfield/topview) | `lib/providers/video.ts` | Idem, `VideoProvider` |
| Publish | `lib/publish/adaptlypost.ts` (`PublishClient`) | Implementar `PublishClient.schedule()` real; `lib/publish/verify-pipeline.ts` já aceita injeção via `opts.publishClient` |
| Ads | `lib/publish/meta-ads.ts` (`META_ADS_MCP_ACTIVE`) | Transporte MCP meta-ads; drafts continuam `paused: true` por default |

O host que orquestra (Claude Code, Cursor, etc.) possui as conexões MCP —
o CLI não embute transporte próprio. O padrão é o caller injetar um client
que satisfaz a interface da camada (`ImageProvider`/`VideoProvider`/
`PublishClient`), mantendo `lib/` livre de SDKs de vendor.

## Checklist para ligar um transporte real

- [ ] Credencial no `.env` (nunca commitada; `.env.example` atualizado).
- [ ] Linha na matriz de `.specs/architecture/PROVIDERS.md` com task types
      e racional.
- [ ] Client implementando a interface da camada + mock em `__mocks__/`.
- [ ] `marketing-engine check` verde com a credencial presente.
- [ ] Peça de teste com `DRY_RUN=true` primeiro; promover com
      `DRY_RUN=false` só após revisão humana do draft.
- [ ] Receipt `marketing-publish-receipt/v1` do primeiro publish real
      anexado como evidência no PR que ligou o transporte.
