#!/usr/bin/env python3
"""simplicio-loop — action_gate: a FAIL-CLOSED safety gate run BEFORE a mutation, not as prose.

The skills DESCRIBE a safety contract (secret-scan every diff, human-gate irreversible ops). This
ENFORCES it mechanically, so an autonomous agent that commits/pushes/merges on its own cannot skip
it. It is the executable form of `simplicio-tasks` Step 5 + the `action_gate`/`security` extension
points.

Fail-closed where it counts: a matched irreversible op, or a secret found in the diff about to be
committed/pushed, is **BLOCKED** — and if a push/commit's diff cannot be scanned, that push is
blocked too (a security check that can't run is not a pass). Benign commands pass untouched, so the
gate never bricks normal work; only the dangerous/unverifiable paths are denied.

Runs three ways:
  • Claude PreToolUse (Bash matcher) — reads `{tool_name, tool_input:{command}}` on stdin; a block
    exits 2 (Claude blocks the tool call and feeds `reason` back to the model).
  • git pre-push / pre-commit hook — `action_gate.py check --staged` secret-scans the staged diff.
  • CLI / tests — `check --command "<cmd>"`, `scan-diff --diff FILE`, `selftest`.

Exit codes: 0 = allow · 2 = BLOCK (deny). Never exits 0 on a detected secret or irreversible op.

Usage:
    action_gate.py check --command "git push --force origin main"     # -> block (exit 2)
    action_gate.py check --staged                                     # secret-scan staged diff
    action_gate.py scan-diff --diff changes.patch
    action_gate.py selftest
    echo '{"tool_input":{"command":"git push -f"}}' | action_gate.py    # PreToolUse mode
"""
import json
import os
import re
import shutil
import subprocess
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)


def _project_relevant():
    """Project-relevance gate for the PreToolUse path ONLY.

    The plugin's Bash gate must not impose itself on every repo on the machine — it acts
    only inside an active simplicio-loop project. Relevant when the opt-in env var
    SIMPLICIO_LOOP (or SIMPLICIO_ORCHESTRATOR) is set, or when a `.orchestrator/` marker
    dir (the orchestrator's state dir, created when the loop runs) exists in the current
    working directory or an ancestor. Outside such a project the PreToolUse hook no-ops.
    The explicit CLI / git-hook entry points (check / scan-diff / selftest) are NOT gated —
    they are invoked deliberately and always run.
    """
    if os.environ.get("SIMPLICIO_LOOP") or os.environ.get("SIMPLICIO_ORCHESTRATOR"):
        return True
    home = os.path.realpath(os.path.expanduser("~"))
    d = os.path.realpath(os.getcwd())
    for _ in range(40):  # depth backstop so an off-home tree can't climb forever
        parent = os.path.dirname(d)
        # Never treat the home dir or a drive/filesystem root as a project marker location:
        # a stray ~/.orchestrator, or a marker at a drive root, must not widen the scope.
        if d == home or parent == d:
            return False
        if os.path.isdir(os.path.join(d, ".orchestrator")):
            return True
        d = parent
    return False


# Irreversible / history-rewriting / destructive ops → BLOCK and route to a human (Step 5).
# High-precision patterns: each is genuinely hard to undo; benign commands never match.
IRREVERSIBLE = [
    (re.compile(r"\bgit\s+push\b.*(--force\b|--force-with-lease\b|(?<!-)\B-f\b)"),
     "force-push (history overwrite) — route to a human; prefer an additive rebase"),
    (re.compile(r"\bgit\s+push\b.*(--mirror|--delete\b|\s:\S)"),
     "remote branch/ref deletion or mirror-push — irreversible on the remote"),
    (re.compile(r"\bgit\s+(filter-branch|filter-repo)\b"),
     "history rewrite across the repo — irreversible for everyone"),
    (re.compile(r"\brm\s+-rf?\s+(/|~|\.|\*|\$HOME)(\s|$)"),
     "recursive delete of a root/home/cwd/glob — mass-file deletion"),
    (re.compile(r"\b(DROP\s+(DATABASE|TABLE|SCHEMA)|TRUNCATE\s+TABLE)\b", re.I),
     "destructive schema/data DDL"),
    (re.compile(r"\bterraform\s+destroy\b|\bkubectl\s+delete\s+(namespace|ns|pv|deployment)\b", re.I),
     "infrastructure teardown / prod resource deletion"),
    (re.compile(r":\(\)\s*\{\s*:\|:&\s*\};:"),
     "fork bomb"),
]

# Secret signatures (high-precision; the generic key/secret rule needs a long value to fire).
SECRETS = [
    (re.compile(r"-----BEGIN\s+(RSA|EC|OPENSSH|DSA|PGP)?\s*PRIVATE KEY-----"), "private key"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AWS access key id"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"), "GitHub token"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"), "Slack token"),
    (re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"), "OpenAI-style secret key"),
    (re.compile(r"(?i)\b(api[_-]?key|secret|password|passwd|token)\b\s*[:=]\s*"
                r"['\"][A-Za-z0-9/+_\-]{16,}['\"]"), "hardcoded credential"),
]
# Lines that are obviously placeholders / examples are not secrets.
PLACEHOLDER = re.compile(r"(?i)(your[_-]?|example|placeholder|xxxx|<.*>|changeme|dummy|fake|redacted|\.\.\.)")
# An explicit, auditable allowlist marker for known-fake fixtures (the detect-secrets convention):
# a line carrying it is exempt. Grep-able, so an exemption is always visible in review.
ALLOWLIST = re.compile(r"(?i)(pragma:\s*allowlist secret|allowlist[- ]secret|noqa:\s*secret)")


def _run(argv, **kw):
    try:
        return subprocess.run(argv, capture_output=True, text=True, encoding="utf-8",
                              errors="replace", cwd=kw.pop("cwd", REPO), **kw)
    except FileNotFoundError:
        return None


def classify_command(cmd):
    """Return (None) if benign, or (reason) if it's an irreversible op to BLOCK."""
    if not cmd:
        return None
    for rx, reason in IRREVERSIBLE:
        if rx.search(cmd):
            return reason
    return None


def scan_secret_text(text):
    """Return a list of (label, lineno) secret hits in a diff/patch/text. Placeholder-aware."""
    hits = []
    for n, line in enumerate(text.splitlines(), 1):
        # only scan added lines in a diff (start with '+'), or all lines in raw text
        probe = line[1:] if line[:1] == "+" else (line if not line.startswith(("-", "@@", "diff ")) else None)
        if probe is None:
            continue
        if ALLOWLIST.search(probe):
            continue  # explicitly allowlisted fixture — exempt (auditable, grep-able)
        for rx, label in SECRETS:
            if rx.search(probe) and not PLACEHOLDER.search(probe):
                hits.append((label, n))
                break
    return hits


def _staged_diff():
    # Scan the CURRENT working repo (where the command runs), NOT where this script lives —
    # installed as a hook in another project, the user's repo is the cwd.
    r = _run(["git", "diff", "--cached", "--unified=0"], cwd=os.getcwd())
    return (r.stdout if r and r.returncode == 0 else None)


def _is_commit_or_push(cmd):
    return bool(re.search(r"\bgit\s+(commit|push)\b", cmd or ""))


def _verdict(allow, reason=""):
    return {"action": "allow" if allow else "block", "reason": reason}


def _runtime_gate_escalation(cmd):
    """Best-effort consult of the `simplicio` runtime's own risk classifier for an
    ADDITIONAL block signal — never a replacement for the checks above.

    Purely additive: this can only turn an otherwise-allowed command into a block, never
    the reverse. The hardcoded IRREVERSIBLE/secret checks remain the fail-closed floor
    regardless of this function's outcome. Any failure — binary absent, timeout,
    non-JSON output, unexpected shape — returns None (no additional signal), so a broken
    or missing runtime NEVER weakens or breaks the existing gate.

    Only escalates on `decision == "block"` (the runtime's hardline/denylist floor —
    catastrophic ops like pipe-to-shell or mkfs that this file's own IRREVERSIBLE list
    doesn't cover). A "confirm" decision is deliberately NOT treated as a block signal:
    under `--gate ask`/`auto` the runtime returns "confirm" for essentially every ordinary
    mutation (a plain `git push`, `rm -f`, `npm install`, ...) — a PreToolUse hook has no
    way to actually pause for human confirmation (only allow/block), so escalating on
    "confirm" would silently turn this into "block nearly all real work", not a genuine
    extra safety signal. Verified against the live binary before shipping this — see
    tests/test_action_gate.py for the exact commands checked.
    """
    if not cmd:
        return None
    binary = shutil.which("simplicio")
    if not binary:
        return None
    try:
        # cwd=os.getcwd(), not REPO: the gate must classify against the project the
        # command is about to run in (same reasoning as _staged_diff() above).
        result = _run(
            [binary, "gate", "classify", "--action", cmd, "--gate", "ask", "--json"],
            cwd=os.getcwd(),
            timeout=5,
        )
    except Exception:
        return None
    if result is None:
        return None
    try:
        payload = json.loads(result.stdout)
    except (ValueError, TypeError):
        return None
    if not isinstance(payload, dict):
        return None
    if payload.get("decision") == "block":
        reason = payload.get("reason") or "simplicio runtime gate classified this as %s risk" % (
            payload.get("risk_class") or "elevated"
        )
        return reason
    return None


def gate_command(cmd, staged=False):
    """The core decision. Returns a verdict dict; BLOCK is fail-closed."""
    # 1) irreversible op → block
    reason = classify_command(cmd)
    if reason:
        return _verdict(False, "irreversible op: " + reason)
    # 2) a commit/push → secret-scan the staged diff (fail-closed if it can't be read)
    if staged or _is_commit_or_push(cmd):
        diff = _staged_diff()
        if diff is None:
            # security check could not run on a push/commit → do not pass it
            if _is_commit_or_push(cmd) or staged:
                return _verdict(False, "cannot read staged diff to secret-scan — blocking the "
                                       "commit/push (fail-closed). Stage changes or run in a git repo.")
            return _verdict(True)
        hits = scan_secret_text(diff)
        if hits:
            labels = ", ".join(sorted({h[0] for h in hits}))
            return _verdict(False, "secret in staged diff (%s) — remove it before commit/push" % labels)
    # 3) additional signal from the simplicio runtime's own risk classifier, when installed
    #    (best-effort, additive-only — see _runtime_gate_escalation).
    runtime_reason = _runtime_gate_escalation(cmd)
    if runtime_reason:
        return _verdict(False, "simplicio runtime gate: " + runtime_reason)
    return _verdict(True)


# ---------------------------------------------------------------------------------------------
def _hbp_append_gate_blocked(reason, cmd=""):
    """Record a gate BLOCK into the runtime's HBP tamper-evident hash chain (#128) — fail-open,
    `simplicio`-only, mirrors `hooks/loop_stop.py`'s `_call_simplicio_hbp_append*` family. A
    blocked mutation is exactly the kind of decision that should be provable later (a later
    `simplicio hbp verify` can show this exact command/reason was recorded in order), not just
    printed to stderr and forgotten. Absent binary or any failure: silent no-op, never blocks
    the gate's own allow/block decision (that decision already happened before this is called).
    """
    binary = shutil.which("simplicio")
    if not binary:
        return
    try:
        import hashlib
        # minimal payload contract shared by the #128 topics: fingerprint + attempt id.
        fp = hashlib.sha1((reason or "").encode("utf-8", "replace")).hexdigest()[:12]
        attempt = None
        try:  # attempt id = live loop iteration from the scratchpad frontmatter, when armed
            with open(os.path.join(".orchestrator", "loop", "scratchpad.md"),
                      encoding="utf-8") as f:
                m = re.search(r"^iteration:\s*(\d+)", f.read(), re.M)
            attempt = int(m.group(1)) if m else None
        except Exception:
            attempt = None
        payload = json.dumps({"fingerprint": fp, "attempt": attempt,
                              "reason": (reason or "")[:200], "command": (cmd or "")[:200]})
        subprocess.run(
            [binary, "hbp", "append",
             "--topic", "loop-gate-blocked",
             "--payload", payload,
             "--provenance", "simplicio-loop",
             "--json"],
            capture_output=True, timeout=15,
        )
    except Exception:
        pass


def _emit_and_exit(verdict, pretooluse=False, cmd=""):
    if verdict["action"] == "block":
        _hbp_append_gate_blocked(verdict.get("reason", ""), cmd)
        if pretooluse:
            # Claude PreToolUse: exit 2 blocks the call; reason on stderr is fed back to the model.
            sys.stderr.write("action_gate BLOCK — " + verdict["reason"] + "\n")
            sys.exit(2)
        print("block")
        print("  " + verdict["reason"])
        sys.exit(2)
    if not pretooluse:
        print("allow")
    sys.exit(0)


def cmd_check(opts):
    cmd = opts.get("command", "")
    _emit_and_exit(gate_command(cmd, staged=bool(opts.get("staged"))), cmd=cmd)


def cmd_scan_diff(opts):
    src = opts.get("diff")
    text = ""
    if src and src != "-":
        try:
            with open(src, encoding="utf-8", errors="replace") as f:
                text = f.read()
        except OSError:
            print("block\n  cannot read diff file (fail-closed)")
            sys.exit(2)
    else:
        text = sys.stdin.read()
    hits = scan_secret_text(text)
    if hits:
        for label, n in hits:
            print("  secret: %s (line %d)" % (label, n))
        print("block")
        _hbp_append_gate_blocked("secret in diff (%s)" % ", ".join(sorted({h[0] for h in hits})),
                                  "scan-diff %s" % (src or "-"))
        sys.exit(2)
    print("allow")
    sys.exit(0)


def from_pretooluse():
    """Claude PreToolUse mode: read tool call JSON on stdin, gate the Bash command."""
    try:
        relevant = _project_relevant()
    except Exception:
        relevant = True  # safety gate: can't prove irrelevant → still run the gate (fail-closed)
    if not relevant:
        sys.exit(0)  # outside a simplicio-loop project → no-op (project-relevance gate)
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
    except Exception:
        sys.exit(0)  # not our JSON → don't interfere with non-Bash tools
    cmd = (data.get("tool_input", {}) or {}).get("command", "")
    if not cmd:
        sys.exit(0)
    _emit_and_exit(gate_command(cmd), pretooluse=True, cmd=cmd)


def cmd_selftest(_opts):
    # Deterministic + hermetic: exercise the PURE functions only (classify_command /
    # scan_secret_text). The git-dependent path (staged-diff scan, fail-closed) is covered
    # hermetically in tests/test_action_gate.py with temp repos.
    checks = []

    def chk(name, got, want):
        ok = got == want
        checks.append(ok)
        print("  [%s] %-34s got=%s want=%s" % ("ok" if ok else "XX", name, got, want))

    def act(cmd):  # block if classified irreversible, else allow
        return "block" if classify_command(cmd) else "allow"

    # irreversible-op classification
    chk("force-push.block", act("git push --force origin main"), "block")
    chk("force-lease.block", act("git push --force-with-lease"), "block")
    chk("filter-branch.block", act("git filter-branch --tree-filter x HEAD"), "block")
    chk("rmrf-root.block", act("rm -rf /"), "block")
    chk("drop-db.block", act("psql -c 'DROP DATABASE prod'"), "block")
    chk("tf-destroy.block", act("terraform destroy -auto-approve"), "block")
    # benign commands are NOT classified as irreversible
    chk("status.allow", act("git status"), "allow")
    chk("normal-push.allow", act("git push -u origin feature"), "allow")
    chk("rm-file.allow", act("rm -f build/tmp.o"), "allow")
    chk("ls.allow", act("ls -la && grep -rn foo src/"), "allow")
    # secret-scan (text mode, placeholder-aware). Fixtures built so this source file stays clean.
    fake_aws = "AKIA" + "QRSTUVWX01234567"          # matches AKIA[0-9A-Z]{16}, no placeholder word
    chk("secret.detected", len(scan_secret_text('+k = "%s"' % fake_aws)) >= 1, True)
    chk("placeholder.ignored", scan_secret_text('+api_key = "your-api-key-here"'), [])
    chk("ghp.detected", len(scan_secret_text("+token=ghp_" + "z" * 36)) >= 1, True)
    chk("removed-line.ignored", scan_secret_text('-secret = "%s"' % fake_aws), [])
    # the allowlist pragma exempts an otherwise-matching line (auditable fixture exemption)
    chk("allowlist.exempts", scan_secret_text('+k = "%s"  # noqa: secret' % fake_aws), [])

    ok = all(checks)
    print("selftest: %s (%d/%d)" % ("PASS" if ok else "FAIL", sum(checks), len(checks)))
    sys.exit(0 if ok else 1)


def _parse(args):
    opts, i = {}, 0
    while i < len(args):
        a = args[i]
        if a.startswith("--"):
            k = a[2:]
            if i + 1 < len(args) and not args[i + 1].startswith("--"):
                opts[k] = args[i + 1]; i += 2
            else:
                opts[k] = True; i += 1
        else:
            i += 1
    return opts


def main():
    argv = sys.argv[1:]
    # No subcommand + piped JSON → Claude PreToolUse mode.
    if not argv or (argv and argv[0] not in ("check", "scan-diff", "selftest") and not sys.stdin.isatty()):
        from_pretooluse()
        return
    sub, opts = argv[0], _parse(argv[1:])
    {"check": cmd_check, "scan-diff": cmd_scan_diff, "selftest": cmd_selftest}.get(
        sub, lambda _o: (print("unknown command '%s'. choices: check scan-diff selftest" % sub),
                         sys.exit(2)))(opts)


if __name__ == "__main__":
    main()
