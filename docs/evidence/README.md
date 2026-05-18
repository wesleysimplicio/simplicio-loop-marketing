# Evidence

Evidence proves that a change works in the running application, not only in code.

## Default output

```text
.runtime-logs/evidence/
  <feature>-<scenario>-<timestamp>.png
  <feature>-<scenario>-<timestamp>.webm
  <feature>-<scenario>-<timestamp>-trace.zip
```

## Default command

```bash
npm run test:e2e
```

## Checklist

- [ ] Evidence matches the requested scenario.
- [ ] Sensitive inputs are not visible.
- [ ] The expected result is visible or asserted.
- [ ] The evidence path is referenced in the final response or PR.
