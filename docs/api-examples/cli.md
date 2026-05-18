# CLI examples

> Template for documenting command-line entry points that other automations or humans invoke.

---

## Command: `myapp orders create`

| Field | Value |
|---|---|
| Binary | `myapp` (npm: `npx @example/myapp`) |
| Exit codes | 0 success · 1 generic error · 2 validation · 3 auth · 4 rate-limit · 5 transient (retry) |
| Output format | JSON Lines on stdout when `--json`, human-readable otherwise |
| Errors | stderr, structured when `--json` |

### Usage

```bash
myapp orders create \
  --customer cus_01H... \
  --item SKU-001:2 \
  --item SKU-002:1 \
  --idempotency-key 4b6f7d6a-1234-5678-90ab-c0ffee000001 \
  --json
```

### Successful stdout (JSON)

```json
{"id":"ord_01H...","status":"pending_payment","total_amount_cents":12990,"currency":"BRL"}
```

### Error stderr (JSON)

```json
{"error":"out_of_stock","sku":"SKU-001","exit_code":2}
```

---

## Conventions

- Long flags double-dashed (`--customer`), short flags single-letter (`-c`).
- Booleans use `--enable-x` / `--no-enable-x` (no `--enable-x=false`).
- Multi-value flags repeatable (`--item A --item B`) rather than comma-separated.
- `--json` toggles machine output; default is human-friendly.
- `--quiet` suppresses progress bars but keeps results on stdout.
- `--verbose` (or `-v`, `-vv`, `-vvv`) raises log level on stderr.
- Reading config: `~/.config/myapp/config.toml` then `$MYAPP_*` env vars then flags (last wins).

## Streaming input

```bash
cat orders.jsonl | myapp orders bulk-create --json
```

- One JSON object per line.
- On error, stderr includes `{"line": <n>, "error": "..."}` and the command exits non-zero AFTER processing all lines (so the caller can collect every failure in one run).

## Exit-code playbook for orchestrators

| Exit | What to do |
|---|---|
| `0` | continue pipeline |
| `1` | log, fail fast |
| `2` | log, fail fast (validation error is the caller's bug) |
| `3` | refresh credentials and retry once |
| `4` | wait `Retry-After` from stderr, retry up to 3x |
| `5` | exponential backoff retry up to 5x |
| `>=128` | killed by signal — investigate, do not retry |

---

## Shell-completion

Ships completion scripts for bash/zsh/fish:

```bash
myapp completion bash > /etc/bash_completion.d/myapp
myapp completion zsh  > /usr/local/share/zsh/site-functions/_myapp
myapp completion fish > ~/.config/fish/completions/myapp.fish
```
