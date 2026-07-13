import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { buildDoctorReport } from "../cli/doctor";
import { appendRunLog } from "../data/runs";
import { emitEvent } from "../observability/events";
export interface WatcherConfig { maxCyclesPerDay?: number; idleDelayMs?: number; activeDelayMs?: number; blockedDelayMs?: number; noProgressThreshold?: number; backoffFactor?: number; watcherCommand?: string; }
export interface WatcherAdapters {
  doctor?: (root: string) => unknown | Promise<unknown>; checkAnchor?: (root: string) => boolean | Promise<boolean>;
  harvestMetrics?: (root: string) => string[] | Promise<string[]>; ingestEvents?: (root: string) => string[] | Promise<string[]>; inspectDuePieces?: (root: string) => string[] | Promise<string[]>;
  decide?: (input: { metrics: string[]; events: string[]; due: string[] }) => string[] | Promise<string[]>;
  act?: (actions: string[], root: string) => { progress?: boolean; actions?: string[] } | Promise<{ progress?: boolean; actions?: string[] }>;
  scheduleNext?: (delayMs: number, root: string) => void | Promise<void>;
}
export interface WatcherCycleResult { cycle_id: string; status: "completed" | "blocked" | "capped"; actions: string[]; next_delay_ms?: number; next_run_at?: string; scheduled: boolean; schedule_kind?: "adapter" | "manifest"; reason?: string; }
interface WatcherState { date: string; cycles: number; no_progress: number; blocked_streak: number; last_cycle_id?: string; status: string; last_next_run_at?: string; last_schedule_kind?: "adapter" | "manifest"; }
const defaults: Required<WatcherConfig> = { maxCyclesPerDay: 96, idleDelayMs: 900000, activeDelayMs: 60000, blockedDelayMs: 1800000, noProgressThreshold: 3, backoffFactor: 2, watcherCommand: "node bin/marketing-engine.mjs watcher" };
const statePath = (root: string) => resolve(root, "data", "watcher-state.json");
const nextWakePath = (root: string) => resolve(root, "data", "watcher-next.json");
const today = () => new Date().toISOString().slice(0, 10);
function loadState(root: string): WatcherState { try { const s = JSON.parse(readFileSync(statePath(root), "utf8")) as Partial<WatcherState>; return s.date === today() ? { date: today(), cycles: s.cycles ?? 0, no_progress: s.no_progress ?? 0, blocked_streak: s.blocked_streak ?? 0, last_cycle_id: s.last_cycle_id, status: s.status ?? "idle", last_next_run_at: s.last_next_run_at, last_schedule_kind: s.last_schedule_kind } : { date: today(), cycles: 0, no_progress: 0, blocked_streak: 0, status: "idle" }; } catch { return { date: today(), cycles: 0, no_progress: 0, blocked_streak: 0, status: "idle" }; } }
function saveState(root: string, s: WatcherState) { const p = statePath(root); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(s, null, 2) + "\n", "utf8"); }
function healthy(report: any) { return report?.savings?.chain_ok !== false && report?.operator?.action_gate_selftest !== "fail"; }
function nextDelay(baseDelayMs: number, streak: number, config: Required<WatcherConfig>): number { const exponent = streak >= config.noProgressThreshold ? streak - config.noProgressThreshold + 1 : 0; return Math.round(baseDelayMs * config.backoffFactor ** exponent); }
async function scheduleWake(root: string, cycleId: string, delayMs: number, reason: string, config: Required<WatcherConfig>, adapters: WatcherAdapters): Promise<{ scheduled: boolean; schedule_kind: "adapter" | "manifest"; next_run_at: string }> {
  const next_run_at = new Date(Date.now() + delayMs).toISOString();
  if (adapters.scheduleNext) {
    await adapters.scheduleNext(delayMs, root);
    return { scheduled: true, schedule_kind: "adapter", next_run_at };
  }
  const path = nextWakePath(root);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ schema: "marketing-watcher-next/v1", cycle_id: cycleId, reason, delay_ms: delayMs, next_run_at, command: config.watcherCommand, host_scheduler_hint: "Run the command at or after next_run_at, or install a recurring scheduler via `marketing-engine schedule install` and let it invoke watcher manually." }, null, 2) + "\n", "utf8");
  return { scheduled: true, schedule_kind: "manifest", next_run_at };
}
export async function runWatcherCycle(root: string, input: WatcherConfig = {}, adapters: WatcherAdapters = {}): Promise<WatcherCycleResult> {
  const config = { ...defaults, ...input }, state = loadState(root), cycle_id = `watcher-${randomUUID()}`;
  if (state.cycles >= config.maxCyclesPerDay) { state.status = "capped"; saveState(root, state); return { cycle_id, status: "capped", actions: [], scheduled: false, reason: "max-cycles-per-day" }; }
  const report = await (adapters.doctor?.(root) ?? buildDoctorReport(root));
  if (!healthy(report) || (adapters.checkAnchor && !(await adapters.checkAnchor(root)))) { state.cycles++; state.no_progress += 1; state.blocked_streak += 1; state.status = "blocked"; state.last_cycle_id = cycle_id; const next_delay_ms = nextDelay(config.blockedDelayMs, state.blocked_streak, config); const scheduled = await scheduleWake(root, cycle_id, next_delay_ms, "preflight-or-anchor", config, adapters); state.last_next_run_at = scheduled.next_run_at; state.last_schedule_kind = scheduled.schedule_kind; saveState(root, state); appendRunLog({ cycle_id, actions: [], piece_id: "", providers_used: [], cost_estimate_usd: 0, tokens_estimate: 0, status: "blocked", notes: "watcher preflight or anchor failed" }, root); emitEvent(root, { kind: "watcher_cycle", phase: "watcher", verdict: "blocked", data: { cycle_id, next_run_at: scheduled.next_run_at } }); return { cycle_id, status: "blocked", actions: [], next_delay_ms, next_run_at: scheduled.next_run_at, scheduled: scheduled.scheduled, schedule_kind: scheduled.schedule_kind, reason: "preflight-or-anchor" }; }
  const metrics = await (adapters.harvestMetrics?.(root) ?? []), events = await (adapters.ingestEvents?.(root) ?? []), due = await (adapters.inspectDuePieces?.(root) ?? []);
  const decided = await (adapters.decide?.({ metrics, events, due }) ?? [...due]); const acted = adapters.act ? await adapters.act(decided, root) : { progress: decided.length > 0, actions: [] }; const actions = [...decided, ...(acted.actions ?? [])];
  const progress = acted.progress ?? actions.length > 0; state.cycles++; state.no_progress = progress ? 0 : state.no_progress + 1; state.blocked_streak = 0; state.status = "completed"; state.last_cycle_id = cycle_id;
  appendRunLog({ cycle_id, actions, piece_id: "", providers_used: [], cost_estimate_usd: 0, tokens_estimate: 0, status: "completed", notes: `metrics=${metrics.length} events=${events.length} due=${due.length}` }, root); emitEvent(root, { kind: "watcher_cycle", phase: "watcher", verdict: "completed", data: { cycle_id, actions: actions.length, progress } });
  const active = due.length > 0 || actions.length > 0, next_delay_ms = nextDelay(active ? config.activeDelayMs : config.idleDelayMs, state.no_progress, config); const scheduled = await scheduleWake(root, cycle_id, next_delay_ms, active ? "active-cycle" : "idle-cycle", config, adapters); state.last_next_run_at = scheduled.next_run_at; state.last_schedule_kind = scheduled.schedule_kind; saveState(root, state);
  return { cycle_id, status: "completed", actions, next_delay_ms, next_run_at: scheduled.next_run_at, scheduled: scheduled.scheduled, schedule_kind: scheduled.schedule_kind };
}
