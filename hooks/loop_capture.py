#!/usr/bin/env python3
"""simplicio-loop — capture hook (Cursor `afterAgentResponse`).

Runs after every agent turn. Detects an evidence-backed completion-promise and
raises the `done` flag for the stop hook to act on. Detection and termination are
split on purpose (the ralph-loop two-hook pattern): this script NEVER stops the
loop, it only raises the flag. Fire-and-forget, always exit 0.

On Claude Code (which has no separate post-response hook) this script is unused —
`loop_stop.py` folds capture in by reading the transcript. Harmless if wired anyway.
"""
import json
import os
import re
import sys

LOOP_DIR = os.path.join(".orchestrator", "loop")
SCRATCHPAD = os.path.join(LOOP_DIR, "scratchpad.md")
DONE_FLAG = os.path.join(LOOP_DIR, "done")
LAST_RESP = os.path.join(LOOP_DIR, "last_response.txt")
ANCHOR = os.path.join(LOOP_DIR, "anchor.json")

PROMISE_RE = re.compile(r"<promise>\s*(.*?)\s*</promise>", re.IGNORECASE | re.DOTALL)
EVIDENCE_RE = re.compile(
    r"(https?://\S+/pull/\d+)|(\b(pass|passed|passing|green|ok)\b)|([\w./-]+:\d+)|([✓✅])",
    re.IGNORECASE,
)


def anchor_pending():
    """Unverified acceptance-criteria ids from the task anchor, or [] (fail-open).

    Mirror of loop_stop.anchor_pending: the done flag is raised only when every anchored AC is
    `done`. Reads the anchor JSON directly (no dependency on scripts/, which the lean plugin omits);
    a missing/unreadable/empty anchor returns [] so it never blocks completion.
    """
    try:
        with open(ANCHOR, encoding="utf-8") as f:
            data = json.load(f)
        return [c.get("id") for c in (data.get("criteria") or [])
                if isinstance(c, dict) and c.get("status") != "done"]
    except Exception:
        return []


def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
        resp = data.get("text", "") or ""
        if not resp:
            sys.exit(0)
        # Stash the response so a unified stop hook can read it cross-runtime.
        try:
            os.makedirs(LOOP_DIR, exist_ok=True)
            with open(LAST_RESP, "w", encoding="utf-8") as f:
                f.write(resp)
        except OSError:
            pass
        if not os.path.exists(SCRATCHPAD):
            sys.exit(0)
        with open(SCRATCHPAD, encoding="utf-8") as f:
            content = f.read()
        m_prom = re.search(r"^completion_promise:\s*(.*)$", content, re.M)
        if not m_prom:
            sys.exit(0)
        promise = m_prom.group(1).strip().strip('"')
        if promise in ("", "null"):
            sys.exit(0)
        evidence_required = "evidence_required: false" not in content.lower()
        m = PROMISE_RE.search(resp)
        if m and m.group(1).strip() == promise:
            # Evidence-gated AND anchor-gated: raise `done` only with in-turn evidence and no
            # acceptance criterion still open in the task anchor (mechanical anti-drift).
            if ((not evidence_required) or EVIDENCE_RE.search(resp)) and not anchor_pending():
                try:
                    open(DONE_FLAG, "w").close()  # raise the flag; stop hook acts
                except OSError:
                    pass
    except Exception:
        pass
    sys.exit(0)


if __name__ == "__main__":
    main()
