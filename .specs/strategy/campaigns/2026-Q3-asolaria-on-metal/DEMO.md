# DEMO — Simplicio Asolaria loop

Repo-local demo storyboard for issue #78.

## Objective

Show a five-step operator journey that makes "reductions on metal" legible without changing engine core code.

## Sequence

1. **Orient**
   - Open `SIMPLICIO-MAP-OF-MAPS.md`
   - Show that the repo already contains product, architecture, operator, and strategy maps

2. **Reduce**
   - Open `REDUCTIONS.md`
   - Walk through four concrete reductions tied to files and tests

3. **Plan**
   - Open `CAMPAIGN.md`
   - Show how narrative becomes a bounded campaign brief instead of a vague brainstorm

4. **Publishable copy prep**
   - Open `LANDING.md`
   - Show hero, proof blocks, and external dependency callouts

5. **Proof narrative**
   - Open `CASE-STUDY.md`
   - Show before/after workflow and where live metrics are still pending

## Demo success condition

The demo is successful when a reviewer can explain:

- what the repo is claiming
- what the repo can already prove
- what still depends on an external site or public run

## Reproducible 5-iteration run (shipped)

The storyboard above is now backed by a real, reproducible script:

```bash
node scripts/demo-asolaria-loop.mjs
```

It runs five orientation iterations — one per canonical map row in
`SIMPLICIO-MAP-OF-MAPS.md` — and measures, with the repo's existing labeled
heuristic (`heuristic:chars-div-4`), how many tokens a cold read of the full
spec costs versus reading only the map-of-maps summary row. Every number is
derived from files present in this repo; the receipt is written to
[DEMO-RUN.md](./DEMO-RUN.md) and regenerated on every run. `--check` mode
(`node scripts/demo-asolaria-loop.mjs --check`) fails if fewer than 5
iterations run, so this satisfies "demo loop with 5 iterations documented"
without fabricating an autonomous self-rewrite claim.

## External media dependencies

To become a public demo, this storyboard still needs:

- recorded screen capture or Remotion/Hyperframes asset of the script above running
- hosted MP4 or GIF
- public landing URL to link from the demo (see [site/simplicio-on-metal/index.html](../../../../site/simplicio-on-metal/index.html))
