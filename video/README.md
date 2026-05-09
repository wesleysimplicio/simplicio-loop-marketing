# Marketing Engine — Skills Explainer (Remotion)

Vídeo explicativo animado, criado com [Remotion](https://www.remotion.dev/), cobrindo cada uma das 11 skills do Marketing Engine: o que faz, em que estágio do pipeline entra e como invocar.

- **Resolução:** 1920×1080 @ 30 fps
- **Duração:** ~91 segundos (2720 frames)
- **Composição:** `marketing-engine-skills`

## Roteiro das cenas

1. **Intro** — logo animado + tagline "Marketing Engine · Como usar as Skills".
2. **Pipeline** — as 8 etapas do motor (`brief → script → creative → caption → compliance → publish → metrics → ads`) com destaque sequencial.
3. **Provider-agnostic** — `llm-router` no centro, providers orbitando (claude, codex, deepseek, higgsfield, topview, wavespeed).
4. **llm-router** — task → provider resolvido + snippet de chamada.
5. **copywriter-curto** — typewriter com contadores hook/caption/headline.
6. **revisao-humanizada** — diff "antes ↔ depois" da copy AI-fied.
7. **caption-multi-platform** — fan-out IG/TikTok/LinkedIn/X com limites por canal.
8. **higgsfield-prompt-builder** — viewport cinematográfico + parâmetros (lens, motion, mood).
9. **topview-prompt-builder** — avatar UGC com script falado tipográfico.
10. **wavespeed-batch** — grid 3×2 de variantes A/B com winner glow.
11. **gpt-image-prompt-builder** — quote cards / carrossel.
12. **video-prompt-builder** — dispatcher que envia o brief ao especialista.
13. **compliance-generic** — escudo + lista de violations bloqueadas.
14. **qa-tech-specs** — checagens de aspect, duração, codec, safe-area.
15. **Outro** — Definition of Done com 6 gates obrigatórios e CLI snippet.

## Como rodar

```bash
cd video
npm install            # instala remotion + react
npm start              # abre o Remotion Studio em http://localhost:3000
npm run build          # exporta out/marketing-engine-skills.mp4
npm run still          # gera uma cover PNG (frame 60)
```

> O bundler do Remotion baixa um Chromium headless na primeira renderização. Em ambientes restritos, use `REMOTION_CHROMIUM_HEADLESS=true` ou aponte para um Chrome local com `--browser-executable`.

## Estrutura

```
video/
├─ src/
│  ├─ index.ts                # registerRoot
│  ├─ Root.tsx                # Composition (1920×1080, 30fps, 2720f)
│  ├─ MarketingEngineVideo.tsx# Series com todas as cenas
│  ├─ theme.ts                # cores, fonte, lista canônica de skills
│  ├─ components/
│  │  ├─ Background.tsx       # gradiente + grid + partículas animadas
│  │  ├─ AnimatedText.tsx     # texto char-a-char com spring
│  │  ├─ SkillCard.tsx        # cartão padrão de skill (emoji, bullets)
│  │  ├─ Pipeline.tsx         # fila horizontal das 8 etapas
│  │  ├─ CodeBlock.tsx        # snippet com tokens coloridos
│  │  ├─ Layout.tsx           # SceneFrame com fade in/out, Stack, SceneTitle
│  │  ├─ Tag.tsx              # chip arredondado
│  │  └─ visuals/             # um visual por skill
│  └─ scenes/
│     ├─ Scene01Intro.tsx
│     ├─ Scene02Pipeline.tsx
│     ├─ Scene03ProviderAgnostic.tsx
│     ├─ SkillSpotlight.tsx   # template usado por cada skill
│     └─ Scene99Outro.tsx
├─ remotion.config.ts
├─ tsconfig.json
└─ package.json
```

## Princípio editorial

O vídeo respeita o charter do projeto: **nenhuma skill, em momento algum, é apresentada como acoplada a um provider específico**. O `llm-router` aparece como peça central, e os provedores são citados apenas como "alvos resolvidos pelo router" — exatamente como `PROVIDERS.md` orienta.
