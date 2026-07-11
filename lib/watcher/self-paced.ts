import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { buildDoctorReport } from "../cli/doctor";
import { appendRunLog } from "../data/runs";
import { emitEvent } from "../observability/events";
export interface WatcherConfig { maxCyclesPerDay?: number; idleDelayMs?: number; activeDelayMs?: number; noProgressThreshold?: number; backoffFactor?: number; }
export interface WatcherAdapters {
  doctor?: (root: string) => unknown | Promise<unknown>; checkAnchor?: (root: string) => boolean | Promise<boolean>;
  harvestMetrics?: (root: string) => string[] | Promise<string[]>; ingestEvents?: (root: string) => string[] | Promise<string[]>; inspectDuePieces?: (root: string) => string[] | Promise<string[]>;
  decide?: (input: { metrics: string[]; events: string[]; due: string[] }) => string[] | Promise<string[]>;
  act?: (actions: string[], root: string) => { progress?: boolean; actions?: string[] } | Promise<{ progress?: boolean; actions?: string[] }>;
  scheduleNext?: (delayMs: number, root: string) => void | Promise<void>;
}
export interface WatcherCycleResult { cycle_id: string; status: "completed" | "blocked" | "capped"; actions: string[]; next_delay_ms?: number; scheduled: boolean; reason?: string; }
interface WatcherState { date: string; cycles: number; no_progress: number; last_cycle_id?: string; status: string; }
const defaults: Required<WatcherConfig> = { maxCyclesPerDay: 96, idleDelayMs: 900000, activeDelayMs: 60000, noProgressThreshold: 3, backoffFactor: 2 };
const statePath = (root: string) => resolve(root, "data", "watcher-state.json");
const today = () => new Date().toISOString().slice(0, 10);
function loadState(root: string): WatcherState { try { const s = JSON.parse(readFileSync(statePath(root), "utf8")) as WatcherState; return s.date === today() ? s : { date: today(), cycles: 0, no_progress: 0, status: "idle" }; } catch { return { date: today(), cycles: 0, no_progress: 0, status: "idle" }; } }
function saveState(root: string, s: WatcherState) { const p = statePath(root); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(s, null, 2) + "\n", "utf8"); }
function healthy(report: any) { return report?.savings?.chain_ok !== false && report?.operator?.action_gate_selftest !== "fail"; }
export async function runWatcherCycle(root: string, input: WatcherConfig = {}, adapters: WatcherAdapters = {}): Promise<WatcherCycleResult> {
  const config = { ...defaults, ...input }, state = loadState(root), cycle_id = `watcher-${randomUUID()}`;
  if (state.cycles >= config.maxCyclesPerDay) { state.status = "capped"; saveState(root, state); return { cycle_id, status: "capped", actions: [], scheduled: false, reason: "max-cycles-per-day" }; }
  const report = await (adapters.doctor?.(root) ?? buildDoctorReport(root));
  if (!healthy(report) || (adapters.checkAnchor && !(await adapters.checkAnchor(root)))) { state.cycles++; state.status = "blocked"; state.last_cycle_id = cycle_id; saveState(root, state); appendRunLog({ cycle_id, actions: [], piece_id: "", providers_used: [], cost_estimate_usd: 0, tokens_estimate: 0, status: "blocked", notes: "watcher preflight or anchor failed" }, root); emitEvent(root, { kind: "watcher_cycle", phase: "watcher", verdict: "blocked", data: { cycle_id } }); return { cycle_id, status: "blocked", actions: [], scheduled: false, reason: "preflight-or-anchor" }; }
  const metrics = await (adapters.harvestMetrics?.(root) ?? []), events = await (adapters.ingestEvents?.(root) ?? []), due = await (adapters.inspectDuePieces?.(root) ?? []);
  const decided = await (adapters.decide?.({ metrics, events, due }) ?? [...due]); const acted = adapters.act ? await adapters.act(decided, root) : { progress: decided.length > 0, actions: [] }; const actions = [...decided, ...(acted.actions ?? [])];
  const progress = acted.progress ?? actions.length > 0; state.cycles++; state.no_progress = progress ? 0 : state.no_progress + 1; state.status = "completed"; state.last_cycle_id = cycle_id; saveState(root, state);
  appendRunLog({ cycle_id, actions, piece_id: "", providers_used: [], cost_estimate_usd: 0, tokens_estimate: 0, status: "completed", notes: `metrics=${metrics.length} events=${events.length} due=${due.length}` }, root); emitEvent(root, { kind: "watcher_cycle", phase: "watcher", verdict: "completed", data: { cycle_id, actions: actions.length, progress } });
  const active = due.length > 0 || actions.length > 0, exponent = state.no_progress >= config.noProgressThreshold ? state.no_progress - config.noProgressThreshold + 1 : 0, next_delay_ms = (active ? config.activeDelayMs : config.idleDelayMs) * config.backoffFactor ** exponent; let scheduled = false; if (adapters.scheduleNext) { await adapters.scheduleNext(next_delay_ms, root); scheduled = true; }
  return { cycle_id, status: "completed", actions, next_delay_ms, scheduled };
}
