# Setup Checklist — Marketing Engine

One-page operator checklist. Run from your host project root, not from the marketing-engine repo. See [SETUP.md](./SETUP.md) for full instructions.

## Required (cannot skip)

- [ ] `npx marketing-engine init` ran clean (created `.marketing-engine/` in host project)
- [ ] `npx marketing-engine scan` produced draft specs and they were reviewed and renamed (`BRAND.md`, `PERSONAS.md`, `PILLARS.md`)
- [ ] `cp .marketing-engine/.env.example .marketing-engine/.env`
- [ ] `ANTHROPIC_API_KEY` filled in `.marketing-engine/.env`
- [ ] `npx marketing-engine check` exits 0

## Recommended (most flows assume these)

- [ ] `OPENAI_API_KEY` set (gpt-image, fallback LLM)
- [ ] `DEEPSEEK_API_KEY` set (cheap captions)
- [ ] `ADAPTLYPOST_API_KEY` set (publish)
- [ ] `NOTION_TOKEN` + `NOTION_CALENDAR_DB_ID` set
- [ ] AdaptlyPost MCP added to Claude Desktop config
- [ ] Topview MCP added to Claude Desktop config
- [ ] gpt-image MCP added to Claude Desktop config
- [ ] Claude Desktop restarted after MCP edits

## Pilot dry-run

- [ ] `npx marketing-engine generate` produced mock assets in `.marketing-engine/outputs/`
- [ ] AdaptlyPost shows drafts (not published)
- [ ] `.marketing-engine/data/llm-usage.jsonl` has entries

## Production cutover (only after dry-run looks correct)

- [ ] `DRY_RUN=false` in `.marketing-engine/.env`
- [ ] One piece tested end-to-end manually
- [ ] launchd or cron jobs installed (generation 22:00, promotion 09:00)
- [ ] `launchctl list` (macOS) or `crontab -l` (Linux) confirms both jobs

## Files to NEVER commit (in your host project)

- `.marketing-engine/.env`
- `.marketing-engine/outputs/*` (only `.gitkeep`)
- `.marketing-engine/data/*` (only `.gitkeep`)
- `.marketing-engine/test-results/`, `.marketing-engine/playwright-report/`
- `node_modules/`

Add the patterns above to your project's `.gitignore` if `init` did not append them automatically.
