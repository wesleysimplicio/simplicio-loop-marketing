# SessionStart hook — `session-start-skills.sh`

> Operational doc for the always-on skills SessionStart hook shipped with the LLM Project Mapper starter.
> File: `.claude/hooks/session-start-skills.sh` (Bash) — wired in `.claude/settings.json` under `hooks.SessionStart`.

## What it does

Every time Claude Code starts (or resumes) a session inside a directory that contains `.claude/`, the hook runs and writes a small block to `stdout`. Claude Code captures that block and prepends it to the conversation as a `<system-reminder>`. The end result: three skills are **already loaded** for the agent without any explicit user request.

The three injected skills:

| Skill | Level | Effect |
|---|---|---|
| `caveman` | `full` | Terse output mode. Drops articles/filler. Preserves code, commits, PRs and canonical docs in normal prose. |
| `ralph-loop` | always-on | Wraps every technical task in `read → plan → execute → lint → unit → e2e → fix → repeat` until DoD turns green. Dual exit gate (indicators + `EXIT_SIGNAL: true`). |
| `everything-claude-code` | always-on | Forces maximum parallelism on agent invocations after edits. Stack-specific reviewers + `security-reviewer` are mandatory. |

## When the hook fires

| Trigger | Fires? |
|---|---|
| `claude` invoked fresh in a directory with `.claude/settings.json` | yes (event `SessionStart`) |
| `claude /resume <session>` | yes (event `SessionResume`) |
| Sub-agent invoked inside an existing session | no — the parent's reminder already contains the block |
| Different IDE/CLI (Codex, Cursor, Copilot) | no — they do not honor Claude Code hooks; equivalent context lives in `AGENTS.md` |

## How to debug

Run the hook manually:

```bash
bash .claude/hooks/session-start-skills.sh
```

Expected output: the same block you see at the top of a fresh `claude` session. If you see nothing, the hook is not executable — re-run `chmod +x .claude/hooks/session-start-skills.sh`.

To see whether Claude Code is actually invoking the hook, set `CLAUDE_LOG=debug` and look for the `hook_executed` event in `~/.claude/logs/`.

## How to customize

The hook is plain Bash. To add a new always-on skill, edit the heredoc inside `session-start-skills.sh`:

```bash
4. `your-skill` — short description. Detalhe: .skills/your-skill/SKILL.md
```

Do not invent skills that do not exist on disk — the message becomes a lie and the agent will eventually call out the mismatch. Always pair a new line in the hook with a real `.skills/<name>/SKILL.md`.

## How to disable temporarily

Three escape hatches, increasing in scope:

1. **Per-prompt** — say `stop caveman` or `normal mode` in chat. Disables the terse style; the other skills remain.
2. **Per-session** — start Claude Code with `SKIP_CLAUDE_HOOKS=1 claude` (the harness checks this env var before running any hook).
3. **Per-repo** — remove the entry from `.claude/settings.json`:

   ```jsonc
   {
     "hooks": {
       "SessionStart": []
     }
   }
   ```

To make the change reversible across teammates, gate the hook on a `STARTER_SKILLS_OFF` env var instead of deleting the file — then anyone can re-enable with `unset STARTER_SKILLS_OFF`.

## Why a hook instead of `AGENTS.md`

`AGENTS.md` is read by the agent **on demand**. The hook output is injected **automatically** by the harness, before the agent reads anything. That guarantees the three skills are active from token 1, even on quick "ask me something" sessions where the agent might otherwise skip reading the master instruction file.

## Related files

- `.claude/settings.json` — declares `hooks.SessionStart`.
- `.skills/caveman/SKILL.md`, `.skills/ralph-loop/SKILL.md`, `.skills/everything-claude-code/SKILL.md` — full skill definitions.
- `bin/hook-runner.js` — shared cross-platform runner used by post-edit + pre-commit hooks (not by SessionStart, which is Bash-only).
