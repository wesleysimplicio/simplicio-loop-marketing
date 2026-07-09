/**
 * doctor.ts — self-diagnostic for the marketing engine (dev-cli pattern).
 *
 * Two-track output: human summary on stderr, machine JSON
 * (`marketing-doctor-report/v1`) on stdout. Checks are read-only and
 * fail-open — the doctor reports, it never mutates.
 */

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { eventsSummary, eventsPath, emitEvent } from "../observability/events";
import { savingsSummary } from "../observability/savings";
import { readJournal, itemVerdict, journalPath } from "../loop/journal";
import { listPieces } from "../pieces/store";

export const DOCTOR_SCHEMA = "marketing-doctor-report/v1";

interface DoctorReport {
  schema: typeof DOCTOR_SCHEMA;
  ts: string;
  root: string;
  dry_run: boolean;
  env: {
    providers_with_keys: string[];
    kill_switch_run_log: boolean;
  };
  pieces: Record<string, number>;
  events: {
    path: string;
    present: boolean;
    count: number;
    gate_fail_rate: number;
    stalls: number;
    last_ts?: string;
  };
  savings: {
    count: number;
    saved_total: number;
    chain_ok: boolean;
  };
  loop: {
    journal_present: boolean;
    items: number;
    stalled_items: string[];
  };
  operator: {
    hooks_present: boolean;
    action_gate_selftest: "pass" | "fail" | "not_run";
    python_workers: "resolved" | "absent";
  };
}

const KEY_VARS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "DEEPSEEK_API_KEY",
  "HIGGSFIELD_MCP_ACTIVE",
  "TOPVIEW_API_KEY",
  "WAVESPEED_API_KEY",
  "ADAPTLYPOST_API_KEY",
  "META_ADS_MCP_ACTIVE",
  "NOTION_TOKEN",
];

function engineRoot(root: string): string {
  const nested = resolve(root, ".marketing-engine");
  return existsSync(nested) ? nested : root;
}

export function buildDoctorReport(root: string): DoctorReport {
  const eRoot = engineRoot(root);
  const piecesDir = resolve(eRoot, "pieces");

  const pieceCounts: Record<string, number> = {};
  for (const p of listPieces({ piecesDir })) {
    pieceCounts[p.frontmatter.status] = (pieceCounts[p.frontmatter.status] ?? 0) + 1;
  }

  const ev = eventsSummary(root, 1);
  const gateFails = ev.by_kind["gate_fail"] ?? 0;
  const gatePasses = ev.by_kind["gate_pass"] ?? 0;
  const gateTotal = gateFails + gatePasses;

  const journal = readJournal(root);
  const items = new Set(journal.map((r) => r.item_id));
  const stalledItems = [...items].filter(
    (id) => itemVerdict(root, id).verdict === "STALLED",
  );

  const hooksDir = resolve(root, "hooks");
  const actionGate = resolve(hooksDir, "action_gate.py");
  let actionGateSelftest: DoctorReport["operator"]["action_gate_selftest"] = "not_run";
  if (existsSync(actionGate)) {
    try {
      const r = spawnSync("python3", [actionGate, "selftest"], {
        timeout: 20_000,
        stdio: "ignore",
      });
      actionGateSelftest = r.status === 0 ? "pass" : "fail";
    } catch {
      actionGateSelftest = "fail";
    }
  }

  const workerCandidates = [
    process.env.SIMPLICIO_LOOP_ROOT
      ? resolve(process.env.SIMPLICIO_LOOP_ROOT, "scripts", "loop_journal.py")
      : null,
    resolve(root, "..", "simplicio-loop", "scripts", "loop_journal.py"),
  ].filter((p): p is string => Boolean(p));

  return {
    schema: DOCTOR_SCHEMA,
    ts: new Date().toISOString(),
    root,
    dry_run: process.env.DRY_RUN === undefined || process.env.DRY_RUN === "true" || process.env.DRY_RUN === "",
    env: {
      providers_with_keys: KEY_VARS.filter((k) => Boolean(process.env[k])),
      kill_switch_run_log: process.env.SIMPLICIO_DISABLE_RUN_LOG === "1",
    },
    pieces: pieceCounts,
    events: {
      path: eventsPath(root),
      present: existsSync(eventsPath(root)),
      count: ev.count,
      gate_fail_rate: gateTotal > 0 ? Math.round((gateFails / gateTotal) * 1000) / 10 : 0,
      stalls: ev.by_kind["stall_detected"] ?? 0,
      ...(ev.last[0]?.ts !== undefined && { last_ts: ev.last[0].ts }),
    },
    savings: {
      count: savingsSummary(root).count,
      saved_total: savingsSummary(root).saved_total,
      chain_ok: savingsSummary(root).chain.ok,
    },
    loop: {
      journal_present: existsSync(journalPath(root)),
      items: items.size,
      stalled_items: stalledItems,
    },
    operator: {
      hooks_present: existsSync(hooksDir) && existsSync(actionGate),
      action_gate_selftest: actionGateSelftest,
      python_workers: workerCandidates.some((p) => existsSync(p)) ? "resolved" : "absent",
    },
  };
}

function humanLines(r: DoctorReport): string[] {
  const lines = [
    `doctor: root=${r.root} dry_run=${r.dry_run}`,
    `env: ${r.env.providers_with_keys.length} provider key(s) set${r.env.kill_switch_run_log ? " · run-log KILL-SWITCHED" : ""}`,
    `pieces: ${Object.entries(r.pieces).map(([k, v]) => `${k}=${v}`).join(" ") || "none"}`,
    `events: ${r.events.present ? `${r.events.count} recorded · gate fail rate ${r.events.gate_fail_rate}% · ${r.events.stalls} stall(s)` : "no stream yet"}`,
    `savings: ${r.savings.count} receipt(s) · ${r.savings.saved_total} tokens saved (estimated) · chain ${r.savings.chain_ok ? "intact" : "BROKEN"}`,
    `loop: ${r.loop.journal_present ? `${r.loop.items} item(s) journaled` : "no journal yet"}${r.loop.stalled_items.length ? ` · STALLED: ${r.loop.stalled_items.join(", ")}` : ""}`,
    `operator: hooks ${r.operator.hooks_present ? "present" : "absent"} · action-gate selftest ${r.operator.action_gate_selftest} · python workers ${r.operator.python_workers}`,
  ];
  return lines;
}

export async function cliEntry(_argv: string[]): Promise<void> {
  const root = process.cwd();
  const report = buildDoctorReport(root);
  for (const line of humanLines(report)) {
    process.stderr.write(`${line}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  emitEvent(root, {
    kind: "doctor_run",
    phase: "doctor",
    verdict: report.savings.chain_ok && report.operator.action_gate_selftest !== "fail" ? "healthy" : "attention",
  });
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`doctor failed: ${String(err)}\n`);
    process.exit(1);
  });
}
