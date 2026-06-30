# Goal Result

## Summary

Absorbed Asolaria N-Nest gate + claims-gate into the marketing loop. The generate loop now runs an independent watcher verification pass on every output before allowing draft→scheduled transition. Every piece receives a `claims_tag` (`MEASURED` | `CANON` | `UNVERIFIED`). The promote loop checks the claims gate and blocks UNVERIFIED pieces from ad creation.

## Changed Files

- `lib/gate/watcher-gate.ts` — new: N-Nest style watcher gate with 5 check channels (pillar hashtag, topic coverage, caption length, placeholders, overpromise language)
- `lib/gate/claims-gate.ts` — new: claims discipline rules, classification logic, gate enforcement at promote time
- `.skills/watcher-gate/SKILL.md` — new: skill manifest documenting gate rules, integration points, and DoD
- `lib/cli/generate.ts` — modified: watcher gate runs after compliance passes; piece routes to review on gate failure; manifest includes `watcher_report_path`
- `lib/cli/promote.ts` — modified: claims gate blocks UNVERIFIED winners; `maybeMarkMeasured` sets `claims_tag: MEASURED`
- `lib/pieces/frontmatter.ts` — modified: added `ClaimsTag` type, `claims_tag` and `watcher_report_path` fields
- `lib/data/manifest.ts` — modified: added `watcher_report_path` to `ManifestPayload` and `ManifestDocument`
- `.specs/pieces/piece-template.md` — modified: added `claims_tag: UNVERIFIED` frontmatter default and gate DoD checklist item
- `CHANGELOG.md` — modified: documented unreleased changes

## Validation Commands

```bash
npm run typecheck
```

## Validation Results

- typecheck: pass

## Commit Message

```
feat(marketing): absorb Asolaria gate + claims discipline
```
