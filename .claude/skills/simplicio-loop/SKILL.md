---
name: simplicio-loop
description: "Unified public entrypoint for Simplicio's body-of-work orchestration: core + loop in one command. Use when the user types /simplicio-loop, says \"ralph loop\", \"keep iterating until done\", \"finish all open issues\", or asks to drain a queue of work autonomously. Runtime-agnostic: binds a real stop-hook where the host supports hooks (Claude, Cursor); otherwise self-paces via the host scheduler. The older /simplicio-tasks surface is a legacy alias; never escape the loop with a false promise."
---

# /simplicio-loop — unified core + loop

A self-referential iteration primitive: the SAME goal is fed back after every turn, so
the agent sees its own prior edits and converges. It exits ONLY when a **typed
completion-promise** is genuinely true, or a hard `max_iterations` cap fires. This skill is now
the unified public surface for Simplicio's autonomous work orchestration: queue intake,
evidence-gated execution, and the hardened Ralph loop live behind the single command
`/simplicio-loop`. The older `simplicio-tasks` surface remains only as a compatibility alias.

Credit: the technique is Ralph Wiggum / cursor `ralph-loop`. We keep its best parts —
single human-readable state file, exact-match promise sentinel, two-hook split — and add
the simplicio safety spine (evidence-gated promise, max-iteration cap, cross-platform hook).

For queue/body-of-work runs, pair this file with the shared deep references under
`../simplicio-tasks/references/` for extension points, orchestration, token economy, delivery,
and safety details.

## Normative contract (non-negotiable)

These invariants are MUST-level. Any runtime that loads this skill (Hermes, Claude, Cursor, or a
bare LLM) follows them mechanically — no paraphrase, no drift:

1. **Evidence-gated exit.** The loop MUST NOT terminate without concrete evidence, produced in the
   SAME turn, that the goal is met. No in-turn evidence → no exit.
2. **Exact promise.** Completion is gated by the EXACT sentinel `<promise>EXACT TEXT</promise>`
   equal to `completion_promise` verbatim. A paraphrase or a fuzzy "I'm done" never counts.
3. **Deterministic continuation.** If the promise is not satisfied, the next iteration MUST re-feed
   the current goal + state unchanged — a mechanical re-feed, never a manual "shall I continue?".
4. **Bounded by construction.** `max_iterations` MUST be set before iteration 1 unless the run is
   deliberately self-paced by a durable scheduler — the loop is NEVER accidentally unbounded — and
   the cap is checked BEFORE every continuation.
5. **Single source of truth.** All loop state lives in the one scratchpad below; the sibling
   `.orchestrator/loop/done` flag is touched ONLY when the promise is verified.
6. **Fallback obeys the same contract.** When the host has no hooks, the self-paced scheduler mode
   is first-class and MUST honor invariants 1–5 identically.

The rest of this file is the mechanism that enforces this contract.

## When to use

- "/simplicio-loop finish all the open issues", "clear the CI queue", "drain the Jira board".
- "run a ralph loop on X", "iterate until the tests pass", "keep going until done".
- As the unified public entrypoint for unattended queue-drain or converge-until-done runs.
- NOT for a one-shot edit — use the host's normal flow.

## Bound operators (REQUIRED): survey + operate

This loop does NOT survey the repo with the LLM, and it does NOT hand-edit files with the LLM.
Two installed CLIs are the operators; the model only DECIDES, the operators DO. Both ship as
hard dependencies of the `simplicio-loop` package (`pip install simplicio-loop` pulls them).
Full mechanics (two-tier survey, evidence gate, context-pack, structured queries, docs-drift
gates, the operator dispatch table): **`references/bound-operators.md`**.

| Operator | CLI (binary) | Binds | Role in the loop |
|---|---|---|---|
| **simplicio-mapper** | `simplicio-mapper` | `orient` / `recall` | **Survey** — maps the repo(s) into `.simplicio/*.json` (project-map, precedent-index, symbol-index, call-graph, docs). This survey, not an ad-hoc LLM read, is what feeds the goal each turn. |
| **simplicio-dev-cli** | `simplicio-dev-cli` | `execute` / `deterministic_edit` / `validate` / `diagnostics` | **Operate** — applies a DECIDED change through its 6-layer contract (mapper context → precedent → prompt → diff → test → verify, ≤3 retries). The CLI edits and verifies; the AI does not hand-write the diff. |

**Preflight (MANDATORY, BLOCKING).** Before iteration 1, auto-update both operators to their
latest release, then confirm both are on PATH:
```bash
python3 -m pip install -qU simplicio-mapper simplicio-cli 2>/dev/null \
  || python3 -m pip install -qU --user --break-system-packages simplicio-mapper simplicio-cli 2>/dev/null || true
simplicio-mapper --version   # survey operator (now latest)
simplicio-dev-cli --help     # action operator (pkg simplicio-cli; exposes `simplicio-dev-cli`)
```
Best-effort and offline-safe — a network/pip failure leaves the working version in place. The
action binary is `simplicio-dev-cli` (from `pip install simplicio-cli`) — NOT the bare `simplicio`
(that's the separate `simplicio-runtime`). If either operator is missing, do NOT fall back to LLM
survey/editing — STOP and emit `simplicio-loop: BLOCKED — missing operator <name>; run: pip
install simplicio-loop`.

**Survey step (each loop start).** `simplicio-mapper scan . --json` (instant macro skeleton +
background deep index) → gate with `inspect . --json` (artifacts exist on disk) → feed the goal
from `handoff . --for-llm toon` (a pre-compressed context-pack: files/symbols/deps/`pack_hash`,
substitutes for re-reading the tree). For triage questions the map alone doesn't answer,
`simplicio-mapper ask . <impact|tests-for|callers|...> <arg> --json`. Verify-side docs gates:
`sync . --check --json` / `drift . --check --json` (BLOCK only when the AC itself is docs).

**Operate step (every turn that mutates code).** Delegate the DECIDED, AC-scoped change to the
operator — never hand-edit inside the loop:
```bash
simplicio-dev-cli task "<the decided, AC-scoped change>" --target <file> [--json]
```
The operator applies the diff, runs the tests, and self-corrects up to 3× — its passing
verification IS the in-turn evidence the promise gate needs (below).

One turn: `preflight → survey (mapper) → triage (re-read survey) → DECIDE (AI) → operate
(simplicio-dev-cli task: apply+test+retry ≤3×) → watcher-gate (independent re-execution) → <promise> only if all gates passed`.

## Video evidence producer (hyperframes) — demo videos as proof

The loop can be asked to **create a demonstration video** of a screen/feature — e.g.
`/simplicio-loop make a demo video of the login screen` — and it uses that video as
in-turn evidence that the change works. The producer is **hyperframes**
(<https://github.com/heygen-com/hyperframes>): it renders HTML/CSS/media compositions to a
**deterministic MP4** ("same input, same frames, same output"), so the video is a CI-reproducible
artifact, not a one-off recording. No API keys; local render via headless Chrome + FFmpeg.

This is NOT a bound operator (it never BLOCKS the loop): it fires only when a turn's goal is a
video request, or when a UI change wants a moving proof. The runnable worker is
`scripts/video_evidence.py`; the full contract is `references/video-evidence.md`. One turn:

```bash
# 1. is this turn a video request?  (terminal intent gate, not the LLM)
python3 scripts/video_evidence.py detect --goal "<the re-fed goal body>"
# 2. capture the real screen (reuse web_verify — drives the UI, writes per-step PNGs)
python3 scripts/web_verify.py run --url <URL> --expect "<text>" --issue <N>
# 3. assemble those PNGs into a deterministic MP4 and attach it to the PR
python3 scripts/video_evidence.py verify --name <slug> --frames .orchestrator/tee/web \
    --title "<screen>" --issue <N> [--upload --pr <N>]
```

The MP4 path + the `video_evidence: PASS …` ledger row is the in-turn evidence the promise gate
needs; a missing toolchain (Node 22+, FFmpeg, hyperframes) yields **BLOCKED**, never a fake pass —
so a video that never rendered can never satisfy the promise.

## State file (single source of truth)

`.orchestrator/loop/scratchpad.md` — human-readable, trivially editable/cancellable:

```markdown
---
iteration: 1
max_iterations: <N or 0>          # 0 = scheduler-controlled; prefer a finite cap for manual runs
completion_promise: "<EXACT TEXT>" | null
evidence_required: true           # promise is rejected unless backed by a passing gate
mode: converge | drain            # which termination logic applies (see Two loop modes)
started_at: "<ISO-8601>"
---

<the task goal, verbatim — this body is re-fed every turn>
```

A sibling flag file `.orchestrator/loop/done` is `touch`ed only when the promise is verified.

Alongside it, `.orchestrator/loop/journal.jsonl` is the loop's **durable attempt memory** (one
append-only record per turn: `iteration`, `action`, `hypothesis`, `gate`, failure `fingerprint`).
The scratchpad holds the GOAL; the journal holds WHAT WAS TRIED — see § Run-journal + stall
detector below. It is the difference between a loop that converges and one that oscillates.

## The loop contract

1. **Write the scratchpad** with the goal, the cap, and the promise text. Always recommend a
   `max_iterations` safety net for manual runs; use `0` only when a durable scheduler and STOP
   signal own cancellation.
2. **Triage the live state FIRST (mandatory).** Before any action each turn, re-read the ground
   truth — the **`simplicio-mapper` survey**, `git status`/`git diff`, the scratchpad, AND the
   source of record (issues/PRs, branches, `.orchestrator/loop/done`). **Read the attempt memory
   FIRST**: `python3 scripts/loop_journal.py resume` (dead-ends to AVOID; `since` for incremental
   triage). **Re-read the task anchor**: `python3 scripts/task_anchor.py check --goal "<goal>"
   --exit-code` (a `DRIFT` verdict, exit 11, means STOP and re-anchor with `--force`, never wander).
   Before deciding the change, refresh the impact map (`python3 scripts/impact_audit.py audit <root>
   --file <seed> --cover <known-file> --json`, `--fail-on medium` for shared/public contracts) and,
   for cross-surface flows, the flow map (`python3 scripts/flow_audit.py audit <root> --fail-on
   high --json`). When a Phase 0 decomposition exists, also re-read the backlog (`python3
   scripts/task_backlog.py status`). Journal = memory for ATTEMPTS; anchor = SCOPE; backlog =
   THE DECOMPOSITION; impact audit = BLAST RADIUS; flow audit = INTEGRATION. Act only on what's
   still genuinely open (idempotency). Full rationale + extra flags:
   **`references/triage-verify-detail.md`**.
3. **Work the goal** each turn against that triaged state. The model DECIDES the AC-scoped change;
   the **`simplicio-dev-cli` operator APPLIES and verifies it** — never hand-edit inside the loop.
   End EVERY iteration with a concrete verification. **After the operator passes, run the watcher
   producer**: `python3 scripts/watcher_verify.py verify` — independently recomputes the frozen
   anchor's done/pending state from disk and writes `.orchestrator/loop/watcher_state.json` with
   `{"match": true, "status": "MEASURED"}` only when it agrees AND echoes the current challenge.
   **Never hand-write `watcher_state.json`** — a missing/unchallenged/mismatched state is
   `UNVERIFIED` and gates the promise. Re-run `impact_audit.py`/`flow_audit.py` if the edit surface
   expands. **Then RECORD the attempt**: `loop_journal.py record --iteration N --action "<change>"
   --hypothesis "<why>" --gate pass|fail --gate-output <test.log>` (failure output is fingerprinted
   so the same failure is recognised next turn). A turn that only edits without verifying is
   incomplete. Full detail: **`references/triage-verify-detail.md`**.
4. **Re-feed** happens at turn end via the stop-hook (below). Each re-fed turn is prefixed
   `[simplicio-loop iteration N. To finish: output <promise>TEXT</promise> ONLY when genuinely true.]`.
   Before re-feeding, the stop-hook (or the self-paced tick) runs the **stall check**
   (`loop_journal.py stall`): if the loop is STALLED, it does NOT blindly re-feed the same goal —
   it switches strategy or escalates (§ Run-journal + stall detector).
5. **Exit** by emitting the sentinel `<promise>EXACT TEXT</promise>` — and ONLY when every
   acceptance criterion is met AND a real gate passed **in the SAME turn** (`evidence_required`)
   AND the **watcher-gate** confirms the result (`watcher_state.json` with `match: true` /
   `status: MEASURED`). The watcher re-executes the work independently before the promise is
   honored — corrective gate per Asolaria N-Nest pattern.

## Two loop modes (different jobs, different termination)

A loop drains a queue and a loop converges a hard task — opposite dynamics, so the scratchpad
`mode` selects which termination logic the driver uses. Pick it when arming; default `converge`
for a single goal, `drain` for a work-queue.

| | `converge` (single hard task) | `drain` (a queue of items) |
|---|---|---|
| Wants | depth — keep changing strategy until ONE thing passes | breadth — clear many independent items, idempotently |
| Each turn | triage `since` last turn (incremental) → one AC-scoped change → verify → watcher-gate → journal | claim next open item → implement → deliver → re-query source (the local Phase 0 backlog is a first-class source: re-query = `task_backlog.py next`; an `empty` print counts as a dry round, `dry≥2` unchanged) |
| **Termination** | the evidence-gated `<promise>` fires, OR the **stall detector** says STALLED and escalates (below) | the source re-query returns empty for **K consecutive rounds** (`dry≥2`) AND the working set is idle |
| Anti-pattern it avoids | oscillation (retrying the same dead-end) | missing late-arriving work (stops too early) |

Both still obey the universal exits (promise+evidence, `max_iterations`, STOP). The split
only changes WHEN "naturally done" is declared: `converge` is done when the one task is proven or
genuinely stuck; `drain` is done when the queue stays empty across rounds. Don't apply `drain`'s
"empty K times → done" to a single task (it would quit the moment a turn makes no visible change),
and don't apply `converge`'s stall-escalation to a queue (a stuck item should be quarantined, not
halt the whole drain). `simplicio-tasks` Step 3 routes fast-path/heavy-path on top of this.

## Phase 0 — intake & decomposition (no source / vague goal / genesis)

When the goal is vague and no external source (board/issues) supplies items, the LLM brainstorms
the decomposition — subtasks with ≥1 acceptance criterion each, `depends_on`, risks — and MUST
freeze it BEFORE any edit: `python3 scripts/task_backlog.py init --goal "<goal verbatim>"
--items-file plan.json` (the worker refuses an empty plan, a zero-AC item, or an unknown/cyclic
dependency — the AI decides, the worker freezes, orders and gates). State:
`.orchestrator/backlog/backlog.jsonl`.

**Genesis.** First run `python3 scripts/task_backlog.py genesis --exit-code` — exit 10 means a
repo with NO code yet. There `init` demands `--genesis` plus exactly one item tagged `scaffold`
(structure + toolchain + one minimal green test as its ACs); the worker reorders it to T1 and
makes every other item depend on it. After the scaffold item's gate passes, re-run
`simplicio-mapper scan . --json` before claiming the next item — the survey only feeds the goal
once there is something to map.

**Per-item cycle**: `python3 scripts/task_backlog.py next` claims one item (re-prints the one in
flight) and prints the ready `task_anchor.py set` arming command → work it under the normal
converge contract → `python3 scripts/task_backlog.py done --id T1` (exit 12 unless the ARMED
anchor is this item with every AC verified) → `next` again; exactly `empty` = drained.

## HRM-style hierarchical planner (two-level reasoning loop)

Inspired by the **Hierarchical Reasoning Model** (arXiv:2506.21734, JesseBrown1980/HRM), the loop
runs a slow **high-level planner** (`scripts/hierarchical_planner.py plan`, called by
`loop_stop.py` before each re-feed) that MAY write a new **phase**
(`.orchestrator/loop/phase.json`: `explore → debug → harden → refactor → implement → escalate`)
on top of the fast **low-level executor** (the normal per-turn re-feed, which executes one
AC-scoped change within the current phase and never changes it itself). Deterministic and
model-free; the loop runs flat if the planner script is missing. `hierarchical_planner.py status`
reads the current phase before deciding the next action; `plan` forces a replan; `clear` resets to
flat mode. Full phase table + usage: **`references/hierarchical-planner.md`**.

## Cross-agent persistent wiki (`.orchestrator/wiki/`)

Every turn's key decisions, findings, and dead-ends are captured into a persistent markdown wiki
at `.orchestrator/wiki/` (`scripts/cross_agent_wiki.py capture|summary|handoff|status`) — a
per-project, cross-agent, zero-friction knowledge base that survives across agent vendors (Hermes
→ Claude Code → Codex): a fresh agent reads it and sees "where we left off" with no transcript.
Plain markdown, no vector DB. Full structure + per-turn mechanics:
**`references/cross-agent-wiki.md`**.

## Run-journal + stall detector (the loop's working memory)

A re-feed loop with no memory of its own attempts **re-derives the same triage every turn** and
**oscillates** (tries X, fails, tries X again until the cap burns). `scripts/loop_journal.py`
closes both, deterministically: the **run-journal** (`.orchestrator/loop/journal.jsonl`,
append-only, one record per turn with a normalized failure **fingerprint**) is the loop's memory
of WHAT WAS TRIED; the **stall detector** (`loop_journal.py stall`) returns `PROGRESS | STALLED` —
STALLED means the last **K** (default 3) attempts share the same fingerprint, and names the
dead-end actions to avoid. Full mechanics: **`references/run-journal-stall-detector.md`**.

```bash
python3 scripts/loop_journal.py resume            # triage: distinct actions tried + AVOID list
python3 scripts/loop_journal.py record --iteration N --action "<change>" \
    --hypothesis "<why>" --gate pass|fail --gate-output <test.log>
python3 scripts/loop_journal.py stall --k 3 --exit-code   # before re-feeding: PROGRESS or STALLED
```

STALLED means do NOT re-feed the same goal into the same failure — switch strategy, escalate to
the human_gate with the fingerprint + dead-ends, or (headless) stop blocked. This upgrades
invariant 3 (Deterministic continuation): the next iteration re-feeds the goal **and** the attempt
memory.

## The promise is evidence-gated (the simplicio hardening) + watcher-gate (pre-promise)

The classic Ralph loop trusts the model to be honest. We do not. A `<promise>` is accepted
only if, in the SAME turn, there is concrete evidence the work is truly done, AND the
**watcher-gate** has independently verified the result:

- the **watcher-gate** — `python3 scripts/watcher_verify.py verify` independently recomputes the
  anchor's done/pending state and writes `.orchestrator/loop/watcher_state.json` with `{"match":
  true, "status": "MEASURED"}` only when it agrees AND echoes the current per-iteration challenge
  (`watcher_challenge.json`) — never hand-write this file, or
- the run-verification gate passed ("works, not just compiles") — the `simplicio-dev-cli`
  operator's passing test+verify satisfies this, or
- the flow coverage gate passed for a mixed front/back/service change —
  `python3 scripts/flow_audit.py audit <root> --fail-on high` found no unhandled UI/API/service
  gaps (mechanically required by the stop-hook whenever the diff touches web-surface files), or
- the scope/impact gate passed for changed shared files — `impact_audit.py audit <root> --file
  <seed> ...` found no uncovered reverse dependents, or
- each named acceptance criterion has a `file:line`/command-output receipt — mechanically
  enforced by `python3 scripts/task_anchor.py gate --exit-code` (must return READY; exit 12 =
  still pending, a contract violation exactly like missing evidence), or
- for a queue, the source re-query confirms the items are actually closed/merged, or
- a **demo video** — a deterministic MP4 via the `video_evidence` producer (above) whose ledger
  row + MP4 path prove the feature works end-to-end; REQUIRED when the goal itself was "make a
  demo video of screen X".

A `<promise>` with no evidence in-turn — OR with a failing watcher-gate — is a **contract
violation**: the capture hook ignores it (does not raise `done`) and the loop continues.
**Never output a false promise to escape the loop.** This wires the loop directly into the
repo's hard rule: *never close work without a merged PR or concrete evidence.*

**Closing is evidence-gated too (no false positives).** Declaring an item done — or closing an
issue — requires BOTH a live source re-query (the item is actually still open right now) AND
concrete evidence in the code or a linked/merged PR. A self-reported "done" with no live state
and no artifact is a false positive and is rejected, exactly like a bare promise.

## Claims-gate discipline — MEASURED/UNVERIFIED tagging

Every claim the loop makes — in the journal, in triage, in the exit promise, or in any turn
output — MUST be tagged `MEASURED\|` (backed by in-turn, concrete, non-model evidence: a passing
gate, a `file:line` receipt, a test log) or `UNVERIFIED\|` (an inference, hypothesis, or
best-effort summary with no mechanical proof this turn). This is the Asolaria claims-gate
discipline (eight enforcement rules — ground-impact-first, no bare tuples, mirrors≠authority,
etc.), so no output escapes without a truth-class label. `loop_journal.py record`/`resume`/
`status`/`stall` all auto-tag their output; `loop_journal.py claims-gate --check` audits any blob
for untagged claims. Full eight-rule table + worked examples: **`references/claims-gate.md`**.

## Binding the hook (deterministic, near-zero token)

Where the host runtime supports lifecycle hooks, bind the two cross-platform hooks shipped in
`hooks/` (Python, so they run identically on Windows/macOS/Linux — see `hooks/hooks.json`):

| Hook | Fires | Job |
|---|---|---|
| `afterAgentResponse` → `loop_capture.py` | after every turn | extract `<promise>…</promise>`; if it exactly equals `completion_promise` AND in-turn evidence exists → `touch .orchestrator/loop/done`. Fire-and-forget, `exit 0`. Never stops the loop itself. |
| `stop` → `loop_stop.py` | when the turn ends | guard clauses that each end the loop cleanly: no/corrupt scratchpad → stop; bound operator missing → write `HANDOFF.md`, stop (never silently hand-survey/hand-edit); `done` flag present → stop; `iteration >= max_iterations` → `HANDOFF.md` + stop (cap); spindle handoff latched → `HANDOFF.md` + stop. Before the promise check it runs the **watcher-gate** (rejects on `match: false`/stale challenge) and the **flow-audit gate** (rejects a web-touching diff with no fresh green `flow-audit.json`); a fallback journal record fires if the turn forgot one. Else increments `iteration` and re-feeds `{"followup_message": "<header>\n\n<goal body>"}`. |

Detection (`capture`) and termination (`stop`) are split on purpose — neither parses the
other's inline state. Iteration carries forward through git history + the working tree, not
context stuffing, so token cost per cycle stays flat.

## Self-paced drive (no hooks — a first-class path)

Hooks are an optimization, not a requirement: the self-paced drive is a primary way to run this
loop, equal in standing to the hook-bound one. When the host has no hook layer — or hook delivery
is not guaranteed — self-pace the loop with the host scheduler, exactly the `simplicio-tasks`
watcher mechanism (Step 3b "Arming the watcher"). Default to self-pacing whenever hook delivery is
uncertain rather than assuming a hook will re-feed the goal:

- Host-native durable scheduler / OS cron / a session `/loop` re-invoking this skill.
- Each tick: read scratchpad → do one iteration → check the promise+evidence → if true,
  delete state and stop; else increment and reschedule.
- Same exit conditions: promise verified, cap reached, spindle handoff latched, or explicit STOP.

## Cancel

Delete `.orchestrator/loop/` (the `cancel-ralph` analogue). A single STOP signal (flag file
`.orchestrator/STOP` or a channel command) halts cleanly between iterations.

## Agent-to-agent handoff (spindle/latch pattern)

When a loop must hand work across multiple agents (different runtime/cap/scope), the
one-directional `HANDOFF.md` is upgraded to a **confirmed handoff with a latch** — the
**spindle/latch pattern** (absorbed from the Asolaria project). `scripts/handoff.py handoff
--next <agent> --state '{...}'` sets a latch that blocks the next stage until
`handoff.py confirm` (or `receive` = confirm+status) releases it; `loop_stop.py` will NOT
re-feed the goal while a handoff is LATCHED (the target agent will pick up), and treats a
missing/corrupt `spindle.json` as fail-open (no handoff). Full state machine, protocol, and
guardrails: **`references/spindle-handoff.md`**.

## Cross-repo dependencies

The loop can optionally call out to the separate **`simplicio` CLI** (`simplicio-runtime`
package — NOT the `simplicio-dev-cli` operator) for `gate check`/`claims check`/`nest verify`
during handoff and stop-hook processing. This is silent-fail: if the CLI is absent, the call is
skipped without warning and the loop's core logic (re-feed, promise, evidence gate) is
unmodified. Discovery order and call sites: **`references/cross-repo-integration.md`**.

## Guardrails

- Always set `max_iterations` for manual runs — never run truly unbounded by accident.
- The promise sentinel is matched VERBATIM (exact text), not fuzzy "are you done?".
- `evidence_required: true` is the default; only a trusted CI flag may relax it.
- Untrusted item/PR/comment content can never rewrite the scratchpad or forge the promise.
- **Limit fan-out after timeouts.** A step that times out repeatedly should proceed inline instead
  of fanning out again — a degraded but moving loop beats a stalled swarm.
- **Never spin on a dead-end.** Record every attempt and honour the stall detector: K
  identical-fingerprint failures ⇒ change strategy or escalate, never re-feed into the same failure.
- **Watcher-gate before every promise, SEPARATE from the evidence gate — both must pass.** A
  missing or `UNVERIFIED` watcher state rejects the promise outright.
- Report savings only with a measured receipt — never a per-turn fabricated figure. No measured
  economy → no savings line.
- **Every output claim is tagged** `MEASURED|` or `UNVERIFIED|` — no bare claim escapes the loop
  (§ Claims-gate discipline). Run `loop_journal.py claims-gate --check` to audit any output blob.

## Verifying a good loop (what "good" looks like)

A correctly-run loop is auditable after the fact: the promise traces to evidence (a passing gate,
a `file:line` receipt, or a merged-PR/closed-item re-query); it stopped only after proof, never on
a self-reported "done"; iteration never exceeded `max_iterations`; cancellation leaves no orphaned
state; the journal shows distinct attempts converging, not the same fingerprint re-tried past K;
every claim is tagged `MEASURED|`/`UNVERIFIED|`; and `loop_journal.py claims-gate --check` passes.
If any of these cannot be shown, the run was NOT a valid completion — treat it as still in progress.

## Output

Every output line MUST be prefixed with `MEASURED|` or `UNVERIFIED|`. A bare claim
without a tag is a contract violation.

Confirm the loop is armed (goal, cap, promise, hook-bound vs self-paced), then start
iteration 1 immediately.
