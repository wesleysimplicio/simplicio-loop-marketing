# INSTALL.md — Instalando o LLM Project Mapper em um projeto existente

> 🇺🇸 English version: [INSTALL.en.md](INSTALL.en.md).

> Guia passo-a-passo para usar o LLM Project Mapper **como overlay privado** em cima de um projeto que já existe (ex.: front-end Angular/React/Next, API .NET, monorepo, etc.). Os arquivos do starter ficam **no disco do dev**, mas **fora do git do projeto host** — cada dev instala o seu, o repo principal não é poluído.
>
> Se você quer rodar o starter como repo standalone (clone direto, sem projeto host), veja o [README](README.md). Esse guia é só para **overlay**.

<img src="assets/overlay-install.svg" alt="Terminal animado mostrando cd no host-project, npx llm-project-mapper, prompts do CLI e ls .specs/" width="100%">

---

## TL;DR — 4 passos

1. **Baixa** o llm-project-mapper num diretório temporário.
2. **Copia** o conteúdo (sem `.git`) para a raiz do projeto host.
3. **Remove** o diretório temporário e qualquer rastro de git do starter.
4. **Adiciona** os caminhos do starter ao `.gitignore` do host.

Depois, roda `bootstrap.sh` / `bootstrap.ps1` dentro do host para preencher placeholders e gerar `.starter-meta.json`.

---

## Pré-requisitos

| Requisito | Para que serve |
|---|---|
| Git | clonar o starter |
| Bash 4+ ou PowerShell 5.1+ | rodar o bootstrap |
| Node.js >= 16.7 (opcional) | se preferir `npx @wesleysimplicio/llm-project-mapper` em vez de clone |

---

## Passo 1 — Baixar o starter

### macOS / Linux / Git Bash / WSL

```bash
cd /tmp
git clone --depth=1 https://github.com/wesleysimplicio/llm-project-mapper.git llm-project-mapper-src
```

### Windows PowerShell

```powershell
cd $env:TEMP
git clone --depth=1 https://github.com/wesleysimplicio/llm-project-mapper.git llm-project-mapper-src
```

> Alternativa sem clone: `npx @wesleysimplicio/llm-project-mapper` dentro do projeto host (Passo 2 e Passo 3 ficam automáticos). Pula para o **Passo 4** depois.

---

## Passo 2 — Copiar para o projeto host (sem sobrescrever arquivos do host)

Assuma que o seu projeto host é `~/code/meu-front` (Linux/macOS) ou `C:\Users\me\source\meu-front` (Windows).

> ⚠️ **Atenção**: o starter contém arquivos com nomes comuns (`README.md`, `package.json`, `playwright.config.ts`, `tests/`, `AGENTS.md`, `CLAUDE.md`, `INIT.md`, `.gitignore`). Se o host já tem qualquer deles, **use `--ignore-existing` (rsync) ou `/XC /XN /XO` (robocopy)** para nunca sobrescrever. O bootstrap depois lê os pré-existentes via `.starter-meta.json` e mescla via `INIT.md`.

### macOS / Linux / Git Bash / WSL

```bash
cd ~/code/meu-front

# copia tudo do starter, exceto .git do starter, e NUNCA sobrescreve arquivos do host
rsync -av --ignore-existing --exclude='.git' /tmp/llm-project-mapper-src/ ./
```

> Se `rsync` não estiver instalado, instala (`brew install rsync` / `sudo apt install rsync`) — **não use `cp -R`** sem proteção contra sobrescrita.

### Windows PowerShell

Sempre **com aspas duplas** em paths (Windows pode ter espaços tipo `C:\Users\Wesley Simplicio\source`):

```powershell
cd "C:\Users\me\source\meu-front"

# /E recursivo; /XD .git exclui pasta .git do starter;
# /XC /XN /XO pula arquivos que já existem no destino (changed/newer/older).
robocopy "$env:TEMP\llm-project-mapper-src" "." /E /XD .git /XC /XN /XO
# robocopy retorna 0-7 como sucesso; código 1 = arquivos copiados, OK.
```

---

## Passo 3 — Limpar rastros de git do starter

Garante que o repo do host **não** vira clone do llm-project-mapper.

> A `--exclude='.git'` no `rsync` (Passo 2) e o `/XD .git` no `robocopy` já garantem que o `.git` do starter **não** foi copiado. Esse passo é só validação + limpeza do diretório temporário.

### macOS / Linux / Git Bash / WSL

```bash
cd ~/code/meu-front

# remove diretório temporário do starter
rm -rf /tmp/llm-project-mapper-src

# confirma que NÃO há remote apontando pro repo do starter
git remote -v
# se aparecer algo como 'origin → wesleysimplicio/llm-project-mapper',
# significa que o .git do starter foi copiado por engano.
# NÃO rode rm -rf .git cegamente — você pode estar deletando o git do HOST.
# Em vez disso:
#   1. Verifica se o host tem commits próprios:  git log --oneline -5
#   2. Se o log é só do starter, remove o remote:  git remote remove origin
#   3. Se há commits do host misturados, pede ajuda manual.
```

### Windows PowerShell

```powershell
cd "C:\Users\me\source\meu-front"

Remove-Item -Recurse -Force "$env:TEMP\llm-project-mapper-src"

# confere remotes
git remote -v
# mesmo princípio: se apontar pro starter, investiga antes de deletar nada.
```

---

## Passo 4 — Adicionar starter ao `.gitignore` do host

Cole o bloco abaixo no fim do `.gitignore` do projeto host para manter o overlay fora do git do projeto:

```gitignore
# === LLM Project Mapper (overlay privado, per-dev) — não commitar no repo do host ===
# LLM Project Mapper tracked files
.starter-meta.json
.claude/settings.local.json
AGENTS.md
CLAUDE.md
INIT.md
_BOOTSTRAP.md
.agents/
.agents/**
.claude/
.claude/**
.codex/
.codex/**
.github/
.github/**
.skills/
.skills/**
.specs/
.specs/**
docs/**
scripts/**
playwright-report/**
tests/**
test-results/**
coverage/**
bootstrap.ps1
bootstrap.sh
playwright.config.ts
```

> Se algum desses arquivos já for rastreado pelo git do host, o arquivo continua no disco e no histórico, mas novas mudanças podem ficar menos óbvias no fluxo diário. Antes de usar como overlay privado, confirme com `git ls-files <arquivo>` quando houver dúvida.

### Atenção a colisões

Como o **Passo 2 usa `--ignore-existing`**, nenhum arquivo do host é sobrescrito pela cópia. O comportamento por arquivo é:

| Arquivo do starter | Se o host já tem | Resultado |
|---|---|---|
| `README.md` | sim | starter NÃO copia; host fica como está |
| `package.json` | sim | starter NÃO copia; host fica como está |
| `playwright.config.ts` | sim | starter NÃO copia |
| `tests/` | sim | starter NÃO mescla arquivos individuais que já existem |
| `AGENTS.md` / `CLAUDE.md` / `INIT.md` | sim | starter NÃO copia. Bootstrap registra em `.starter-meta.json -> existing_instruction_files`; `INIT.md` lê e **mescla** preservando o conteúdo do host |
| `.gitignore` | sim | starter NÃO sobrescreve. Bootstrap só **adiciona** ao final com cabeçalho marcador (se você responder `yes` no prompt) |
| `.github/workflows/` | sim | starter NÃO sobrescreve workflows existentes; só adiciona `dod.yml` se não houver homônimo |

> Você nunca terá "dois `package.json`" — `rsync --ignore-existing` / `robocopy /XC /XN /XO` pulam o arquivo se já existe.

---

## Passo 5 — Rodar bootstrap dentro do host

Substitui placeholders (`<PRODUCT_NAME>`, `<STACK>`) pelos valores reais detectados no host e gera `.starter-meta.json`.

### macOS / Linux / Git Bash / WSL

```bash
cd ~/code/meu-front
chmod +x ./bootstrap.sh
./bootstrap.sh
```

### Windows PowerShell

```powershell
cd "C:\Users\me\source\meu-front"

# PowerShell 7+
pwsh -File .\bootstrap.ps1

# PowerShell 5.1 (Windows 10/11)
powershell -ExecutionPolicy Bypass -File .\bootstrap.ps1
```

> No Windows não roda `chmod` — o PowerShell não usa bit de execução. Basta invocar o `.ps1` diretamente.

### Não-interativo (CI / script)

```bash
./bootstrap.sh --yes --cli skip --append-gitignore no
```

> No modo overlay com `.gitignore` já contendo o starter, responde **não** quando o bootstrap perguntar se quer fazer append. Os arquivos do starter já estão sendo ignorados pelo seu bloco — não precisa do bloco do bootstrap (que mira em uso standalone).

---

## Passo 6 — Confirmar que o git do host está limpo

```bash
git status
```

Esperado: nenhum arquivo do starter aparece como untracked/modified. Se algum aparecer, ajusta o `.gitignore` para cobrir.

---

## Atualizar o starter depois

Quando sair uma versão nova do llm-project-mapper:

```bash
# baixa nova versão
cd /tmp
rm -rf llm-project-mapper-src
git clone --depth=1 https://github.com/wesleysimplicio/llm-project-mapper.git llm-project-mapper-src

# repete o Passo 2 — rsync mantém os seus específicos
cd ~/code/meu-front
rsync -av --exclude='.git' --exclude='.specs/product' --exclude='.specs/architecture' --exclude='.specs/sprints' /tmp/llm-project-mapper-src/ ./
```

O `--exclude` preserva o conteúdo que **você** escreveu em `.specs/` (vision, ADRs, sprints). Adapta se você customizou outras pastas.

---

## Desinstalar o starter (overlay)

```bash
cd ~/code/meu-front

# arquivos seguros (não colidem com host)
rm -rf .agents .skills .specs .claude .codex bin
rm -f _BOOTSTRAP.md INSTALL.md .starter-meta.json
rm -f bootstrap.sh bootstrap.ps1
rm -rf .github/copilot presentation video
rm -f .github/copilot-instructions.md .github/workflows/dod.yml

# arquivos do starter SÓ se você confirmou que NÃO são do host
# (mesma lista comentada no .gitignore — checa primeiro)
# rm -f AGENTS.md CLAUDE.md INIT.md README.pt-BR.md
# rm -f playwright.config.ts
# rm -rf tests/  presentation/  video/

# tira o bloco "LLM Project Mapper (overlay privado)" do .gitignore manualmente
```

Não há `git rm` envolvido — esses arquivos estão gitignored, nunca foram commitados.

---

## Quando NÃO usar overlay privado

Se o seu **time inteiro** vai usar os agents e você quer que skills/specs/agents sejam compartilhados:

- Não gitignora os arquivos do starter.
- Commita `.agents/`, `.skills/`, `.specs/`, `AGENTS.md`, `CLAUDE.md`, `INIT.md`, `.github/copilot*` no repo do host.
- Mantém `.claude/sessions`, `.claude/cache`, `.codex/local`, `.codex/history`, `.starter-meta.json` no `.gitignore` (estado local de cada dev, não compartilha).

O bloco recomendado para esse caso (modo compartilhado) é o que o `bootstrap.sh --append-gitignore yes` já adiciona — só ele, sem o bloco "overlay privado" acima.

---

## Decisão rápida

| Cenário | Modo |
|---|---|
| Sou o único dev usando agents nesse projeto | **Overlay privado** (este guia) |
| Quero testar antes de commitar para o time | **Overlay privado** primeiro |
| Time inteiro vai trabalhar com agents | **Shared** (commita no repo do host) |
| Projeto novo do zero, agents desde o dia 1 | **Standalone** — clona o llm-project-mapper direto, não overlay |

---

## Próximos passos

1. Confere que `git status` está limpo no host.
2. Abre o seu CLI/IDE de agente favorito na pasta do host.
3. Pede para o agente ler `INIT.md` (ou roda o handoff que o bootstrap configurou).
4. O agente vai inferir VISION/DOMAIN/PERSONAS do código do host e escrever em `.specs/`.
5. Primeira task técnica passa pelo loop obrigatório de `AGENTS.md`.
