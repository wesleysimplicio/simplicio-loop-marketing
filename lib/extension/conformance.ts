import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, normalize, relative, resolve } from "node:path";

export const MANIFEST_SCHEMA = "simplicio.loop-extension/v1";

export interface Manifest { schema: string; extension_id: string; version: string; requires_core: string; modes: string[]; stage_overlays: unknown[]; role_bindings: unknown[]; gates: Array<{ fail_closed?: boolean }>; effect_handlers: Array<{ id: string; requires: string[]; requery?: boolean }>; defaults: { dry_run: boolean }; forbidden_authorities: string[]; [key: string]: unknown }
export interface Check { id: string; pass: boolean; detail: string }

export function stableHash(value: unknown): string {
  const sort = (v: unknown): unknown => Array.isArray(v) ? v.map(sort) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sort(x)])) : v;
  return createHash("sha256").update(JSON.stringify(sort(value))).digest("hex");
}

export function supportsCore(range: string, version: string): boolean {
  const major = Number(version.split(".")[0]);
  const min = /(?:>=)(\d+)/.exec(range)?.[1];
  const max = /(?:<)(\d+)/.exec(range)?.[1];
  return Number.isInteger(major) && (!min || major >= Number(min)) && (!max || major < Number(max));
}

export function validateManifest(m: Manifest, coreVersion = "1.0.0"): Check[] {
  const requiredEffects = ["authorization", "idempotency_key", "fence_token", "receipt"];
  return [
    { id: "schema", pass: m.schema === MANIFEST_SCHEMA, detail: m.schema },
    { id: "identity", pass: m.extension_id === "loop.marketing", detail: m.extension_id },
    { id: "core-version", pass: supportsCore(m.requires_core, coreVersion), detail: `${coreVersion} in ${m.requires_core}` },
    { id: "modes", pass: ["embedded", "daemon", "remote"].every(x => m.modes?.includes(x)), detail: (m.modes ?? []).join(",") },
    { id: "dry-run", pass: m.defaults?.dry_run === true, detail: `default=${m.defaults?.dry_run}` },
    { id: "gates", pass: m.gates?.length > 0 && m.gates.every(x => x.fail_closed), detail: `${m.gates?.length ?? 0} fail-closed gates` },
    { id: "effects", pass: m.effect_handlers?.length > 0 && m.effect_handlers.every(x => requiredEffects.every(r => x.requires.includes(r)) && x.requery), detail: `${m.effect_handlers?.length ?? 0} governed effects` },
    { id: "authority", pass: ["coordinator", "scheduler", "queue", "ledger", "completion-engine"].every(x => m.forbidden_authorities?.includes(x)), detail: "core authority preserved" },
    { id: "roles", pass: new Set(m.role_bindings?.map((x: any) => x.role)).size === m.role_bindings?.length && m.role_bindings?.length >= 8, detail: `${m.role_bindings?.length ?? 0} independent bindings` },
  ];
}

export function safeArtifactPath(root: string, candidate: string): string {
  if (isAbsolute(candidate)) throw new Error("PATH_TRAVERSAL:absolute");
  const full = resolve(root, normalize(candidate));
  if (relative(resolve(root), full).startsWith("..")) throw new Error("PATH_TRAVERSAL:outside-root");
  return full;
}

export function redact(value: unknown): unknown {
  const secret = /^(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|authorization|email|phone)$/i;
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, secret.test(k) ? "[REDACTED]" : redact(v)]));
  return value;
}

export class FakeEffectServer {
  private receipts = new Map<string, { id: string; fence: number }>();
  request(input: { key: string; fence: number; authorized: boolean }): { id: string; fence: number } {
    if (!input.authorized) throw new Error("FORGED_APPROVAL");
    const prior = this.receipts.get(input.key);
    if (prior) { if (input.fence < prior.fence) throw new Error("STALE_FENCE"); return prior; }
    const receipt = { id: `fake-${stableHash(input.key).slice(0, 12)}`, fence: input.fence };
    this.receipts.set(input.key, receipt); return receipt;
  }
  requery(key: string) { return this.receipts.get(key) ?? null; }
  get effectCount() { return this.receipts.size; }
}

export function loadManifest(path: string): Manifest { return JSON.parse(readFileSync(path, "utf8")) as Manifest; }
