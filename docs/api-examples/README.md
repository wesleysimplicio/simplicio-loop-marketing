# API Examples

Sanitized request/response examples for every public endpoint, organized so an agent or a new dev can answer "how do I call this?" without spelunking the codebase.

## Layout

```text
docs/api-examples/
  rest.md            # REST endpoints walkthrough
  graphql.md         # GraphQL queries / mutations / subscriptions
  webhook.md         # Incoming webhook payloads + signature verification
  cli.md             # Command-line entry points (stdin/stdout/exit codes)
  <feature>/         # Optional per-feature folder for richer examples
    request.json
    response.json
    error-response.json
```

## When to use which file

| Format | Use it for |
|---|---|
| `rest.md` | HTTP/JSON endpoints exposed to clients (UI, mobile, partners). |
| `graphql.md` | A GraphQL schema with operations expected from the client. |
| `webhook.md` | Endpoints that *receive* events from third parties. |
| `cli.md` | Command-line entry points that other automations call. |

Drop additional formats (gRPC, SOAP, SSE) into their own files following the same pattern.

## Filling rules

1. Always paste **real** request/response payloads, with secrets and PII redacted (`<REDACTED>`, `***`).
2. List every error response a caller is expected to handle — agents need this to write retries/fallbacks.
3. Pin the example to a starter version (e.g. `as of v0.2.0`) so the doc can be invalidated when the contract breaks.
4. Link from `docs/features/<feature>.md` to the matching example file so feature docs and API docs stay coupled.
