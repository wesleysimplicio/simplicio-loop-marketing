# Yool tuple-space board

Implements issue #59: the agent/tuple model for autonomous marketing work
without spawning duplicated real processes. Spec:
https://github.com/wesleysimplicio/yool-tuple-hamt (v0.2).

## Why a tuple-space

A single campaign can fan out into hundreds of pieces across dozens of
channels. Modeling every unit of work as an OS process or long-lived agent
does not scale and is impossible to govern. Instead, every unit of work is
a **tuple** written to an append-only log
(`data/yool/tuples.jsonl`, `lib/yool/board.ts`). A small, quota-governed
pool of workers drains the board by lane. Scale is represented logically
(more tuples), not physically (more processes).

## Tuple classes

| Class | Meaning |
|---|---|
| `campaign.root` | Root tuple for a campaign; owns the piece queue |
| `piece.plan` | A piece has been queued and assigned pillar/channel |
| `piece.copy` | Copy generation in progress/done for a piece |
| `piece.creative` | Creative asset generation in progress/done |
| `piece.compliance` | Compliance/community gate result attached |
| `publish.dry_run` | Publish simulated via broker, no live call |
| `publish.ready_for_review` | Awaiting human approval before live publish |
| `metrics.snapshot` | An analytics poll was captured (see `lib/analytics/score.ts`) |
| `winner.promote` | Piece classified as a winner, ads-draft created |
| `loser.learning` | Piece classified as a loser, learning recorded |
| `reply.required` | A community comment needs a drafted reply |
| `budget.guardrail` | A budget guardrail check ran (pass/violation) |
| `human.approval_required` | Any tuple blocked on a human decision |

## Worker lanes

`discovery`, `strategy`, `copy`, `creative`, `compliance`, `publish`,
`analytics`, `paid-growth`, `community-replies`, `evidence`,
`budget-guardian`.

Each lane has a concurrency limit enforced by `WorkerGovernor` in
`lib/yool/board.ts` (defaults to 1-2 concurrent workers per lane). This is
the "runtime governor controls active workers" requirement — the board can
hold thousands of pending tuples while only a handful of real workers are
ever active at once.

## Agent manifest (mandatory guardrails)

Every agent registered against this board declares:

```yaml
yool_id: agent.dev.copy
authority: dev        # dev | ops | review | audit
lane: copy             # one of the worker lanes above
agent_terms:
  cpu_quota_pct: 60    # MANDATORY (spec §11.1)
  disk_quota_mb: 100   # MANDATORY (spec §11.2)
  timeout_s: 300
```

`validateAgentManifest()` rejects any manifest missing `agent_terms` or
with a zero/negative `cpu_quota_pct` / `disk_quota_mb` / `timeout_s`. This
mirrors Victor Genaro's review note captured in `CLAUDE.md`: an agent
without a guardrail can "fritar o processador" or fill the disk — every
registered agent must declare its ceiling up front.

## Tuple shape

Every tuple has: `id`, `class`, `status` (`pending | in_progress | blocked
| done`), `owner` (worker id), `lane`, `evidence_path`, `next_action`, and
`updated_at`.

## Concurrency model

- **Writes are serialized**: `writeTuple()` only ever appends one JSON line
  to the log; the log is the single source of truth and is never rewritten
  in place.
- **Reads/checks/evidence run in parallel**: `readBoard()`,
  `tuplesByLane()`, and `tuplesByStatus()` are pure folds over the
  append-only log and have no side effects, so any number of callers
  (including read-only evidence/audit tooling) can call them concurrently.
