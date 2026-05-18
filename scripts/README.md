# Scripts

Scripts should make the project runnable and verifiable without tribal knowledge.

Expected scripts:

- `start.ps1` / `start.sh`: start local services or print the commands to start them.
- `test.ps1` / `test.sh`: run the project's relevant validation.
- `evidence.ps1` / `evidence.sh`: capture Playwright evidence for a smoke scenario.
- `update-starter.ps1` / `update-starter.sh`: update the installed starter structure safely.

Adapt these scripts to the real stack after applying the starter.

Rules:

- Fail with a non-zero exit code on errors.
- Print clear next steps when a required command is missing.
- Keep secrets out of scripts.
- Prefer environment variables for URLs and credentials.

Update command:

```powershell
.\scripts\update-starter.ps1
```

Use `LLM_PROJECT_MAPPER_SOURCE` to test from a local clone instead of npm:

```powershell
$env:LLM_PROJECT_MAPPER_SOURCE="C:\Users\you\source\repos\llm-project-mapper"
.\scripts\update-starter.ps1
```
