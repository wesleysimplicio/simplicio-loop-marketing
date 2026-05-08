# SETUP — Marketing Engine in your project

This guide installs Marketing Engine into a host project. Run every command from your project root unless noted.

## 1. Install (pick one path)

### Path A — As an npx tool (recommended once published to npm)

```
cd /path/to/your-project
npx marketing-engine init
```

### Path B — As a git submodule

```
cd /path/to/your-project
git submodule add https://github.com/wesleysimplicio/marketing-engine .marketing-engine-tool
bash .marketing-engine-tool/bootstrap.sh
```

### Path C — As a cloned dev tool

```
git clone https://github.com/wesleysimplicio/marketing-engine ~/tools/marketing-engine
alias me="node ~/tools/marketing-engine/bin/marketing-engine.mjs"
cd /path/to/your-project
me init
```

## 2. Initialize

```
npx marketing-engine init
```

Creates `.marketing-engine/` in the host project with the directory layout, `.env.example`, and a placeholder `clients/<id>/` scaffold for client-specific overrides.

## 3. Scan the host project

```
npx marketing-engine scan
```

Reads `package.json`, `README.md`, the source tree, and any existing brand assets, then writes draft specs:

- `.marketing-engine/specs/BRAND.draft.md`
- `.marketing-engine/specs/PERSONAS.draft.md`
- `.marketing-engine/specs/PILLARS.draft.md`

Review each `*.draft.md`, edit freely, then rename to the final filename (`BRAND.md`, `PERSONAS.md`, `PILLARS.md`). The pipeline only reads the finalized files.

## 4. Configure .env

```
cp .marketing-engine/.env.example .marketing-engine/.env
```

Fill at least `ANTHROPIC_API_KEY`. Any optional provider you skip will produce a warning during `check`, not a failure.

## 5. MCP servers (Claude Desktop)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` and add the entries below to `mcpServers` (keep existing entries):

```json
"adaptlypost": {
  "command": "npx",
  "args": ["-y", "@adaptlypost/mcp-server"],
  "env": { "ADAPTLYPOST_API_KEY": "${ADAPTLYPOST_API_KEY}" }
},
"topview": {
  "command": "npx",
  "args": ["-y", "@topview/mcp-server"],
  "env": { "TOPVIEW_API_KEY": "${TOPVIEW_API_KEY}" }
},
"gpt-image": {
  "command": "npx",
  "args": ["-y", "mcp-image"],
  "env": {
    "IMAGE_PROVIDER": "openai",
    "OPENAI_API_KEY": "${OPENAI_API_KEY}",
    "IMAGE_OUTPUT_DIR": "/absolute/path/to/your-project/.marketing-engine/outputs"
  }
}
```

Restart Claude Desktop. `higgsfield` and `meta-ads` MCPs are already active globally.

## 6. Notion (optional)

- Create a database "Calendar Marketing Engine".
- Schema: `Title` (text), `Date` (date), `Pillar` (select), `Type` (select: reel/carousel/static/story/shorts), `Status` (select: draft/scheduled/published), `Platforms` (multi-select).
- Share the database with your Notion integration user.
- Copy the database id into `.marketing-engine/.env` as `NOTION_CALENDAR_DB_ID`.
- Generate a token at notion.so/my-integrations and set `NOTION_TOKEN` in `.marketing-engine/.env`.

## 7. Validate

```
npx marketing-engine check
```

Must exit 0. Required: `ANTHROPIC_API_KEY`. Anything else missing prints a `WARN` line.

## 8. Pilot dry-run

```
npx marketing-engine generate
```

`DRY_RUN=true` is the default. Inspect:

- `.marketing-engine/outputs/` for generated mock assets.
- AdaptlyPost dashboard for drafts (nothing should be published yet).
- `.marketing-engine/data/llm-usage.jsonl` for one line per LLM call.

## 9. Production cutover

Only after the dry-run looks correct:

1. Set `DRY_RUN=false` in `.marketing-engine/.env`.
2. Run one piece end-to-end manually first.
3. Schedule via launchd (macOS) or cron (Linux). Manual install — the bootstrap will not write a cron without explicit confirmation. Suggested cadence: generation daily at 22:00, promotion daily at 09:00.
4. Validate with `launchctl list` (macOS) or `crontab -l` (Linux) after install.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `tsc --noEmit` fails | Re-run `npm install`, confirm `@types/node` resolved |
| Playwright tests fail to launch browser | `npx playwright install --with-deps chromium` |
| `marketing-engine check` exits 1 | At least `ANTHROPIC_API_KEY` must be set |
| AdaptlyPost MCP not loading | Restart Claude Desktop after editing config |
| Notion sync returns 0 pieces | Confirm DB shared with integration AND DB id correct |
| `marketing-engine` command not found in PATH | Use `node ~/tools/marketing-engine/bin/marketing-engine.mjs` directly, or alias it as shown in Path C |
