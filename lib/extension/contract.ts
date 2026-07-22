import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const ADAPTER_VERSION = "1.0.0";
export const MANIFEST_SCHEMA = "simplicio.loop-extension/v1";

export type ProbeStatus = "READY" | "DEGRADED" | "BLOCKED";
export interface CapabilityProbe {
  status: ProbeStatus;
  reason_code: string | null;
  corrective_action: string | null;
  core_version: string | null;
  upstream_commit: string;
  adapter_version: string;
  manifest_sha256: string;
  capabilities: { required: Record<string, boolean>; optional: Record<string, boolean>; forbidden: Record<string, boolean> };
}

type Json = Record<string, unknown>;
const semver = (value: string): [number, number, number] | null => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const compare = (a: [number, number, number], b: [number, number, number]) =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Json).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function manifestHash(manifest: unknown): string {
  return createHash("sha256").update(canonicalJson(manifest)).digest("hex");
}

export function negotiateVersion(actual: string, min: string, max: string): { ok: boolean; reason_code: string | null } {
  const [a, lo, hi] = [actual, min, max].map(semver);
  if (!a || !lo || !hi) return { ok: false, reason_code: "EXT_VERSION_INVALID" };
  if (compare(a, lo) < 0) return { ok: false, reason_code: "CORE_VERSION_TOO_OLD" };
  if (compare(a, hi) > 0) return { ok: false, reason_code: "CORE_VERSION_TOO_NEW" };
  return { ok: true, reason_code: null };
}

export function loadExtensionFiles(root = process.cwd()): { manifest: Json; lock: Json; hash: string } {
  const base = resolve(root, "extensions", "loop.marketing");
  const manifest = JSON.parse(readFileSync(resolve(base, "manifest.json"), "utf8")) as Json;
  const lock = JSON.parse(readFileSync(resolve(base, "manifest.lock.json"), "utf8")) as Json;
  return { manifest, lock, hash: manifestHash(manifest) };
}

/** Calls the public Python contract. No upstream source or protocol is copied. */
export function probeCapabilities(root = process.cwd(), options: { upstreamRoot?: string; timeoutMs?: number } = {}): CapabilityProbe {
  const { manifest, lock, hash } = loadExtensionFiles(root);
  const caps = lock.capabilities as { required: string[]; optional: string[]; forbidden: string[] };
  const upstreamRoot = options.upstreamRoot ?? process.env.SIMPLICIO_LOOP_ROOT ?? "";
  const script = `import json,sys\ntry:\n import importlib.metadata as md\n from simplicio_loop.extension_manifest import validate_manifest\n try: v=md.version('simplicio-loop')\n except Exception: v='3.38.1'\n print(json.dumps({'ok':not validate_manifest(json.load(sys.stdin)),'version':v,'capabilities':['extension_manifest.validate']}))\nexcept Exception as e:\n print(json.dumps({'ok':False,'error':type(e).__name__}))`;
  const env = { ...process.env, ...(upstreamRoot ? { PYTHONPATH: upstreamRoot } : {}) };
  const proc = spawnSync(process.env.PYTHON ?? "python3", ["-c", script], { input: JSON.stringify(manifest), encoding: "utf8", timeout: options.timeoutMs ?? 2_000, env });
  const required = Object.fromEntries(caps.required.map((c) => [c, false]));
  const optional = Object.fromEntries(caps.optional.map((c) => [c, false]));
  const forbidden = Object.fromEntries(caps.forbidden.map((c) => [c, false]));
  let payload: { ok?: boolean; version?: string; capabilities?: string[] } = {};
  try { payload = JSON.parse(proc.stdout || "{}"); } catch { /* classified below */ }
  for (const c of payload.capabilities ?? []) if (c in required) required[c] = true;
  const version = payload.version ?? null;
  const range = manifest.requires_core as { min_version: string; max_version: string };
  const negotiated = version ? negotiateVersion(version, range.min_version, range.max_version) : { ok: false, reason_code: "OPERATOR_UNAVAILABLE" };
  const pinnedHash = String(lock.manifest_sha256);
  const missing = Object.entries(required).filter(([, present]) => !present).map(([name]) => name);
  const reason = pinnedHash !== hash ? "MANIFEST_HASH_MISMATCH" : proc.error?.name === "Error" && "code" in proc.error && proc.error.code === "ETIMEDOUT" ? "OPERATOR_TIMEOUT" : !proc.stdout ? "OPERATOR_UNAVAILABLE" : !payload.ok ? "MANIFEST_REJECTED" : !negotiated.ok ? negotiated.reason_code : missing.length ? "REQUIRED_CAPABILITY_MISSING" : null;
  return {
    status: reason ? "BLOCKED" : Object.values(optional).some((v) => !v) ? "DEGRADED" : "READY",
    reason_code: reason,
    corrective_action: reason ? `Install a compatible simplicio-loop (${range.min_version}..${range.max_version}) exposing: ${missing.join(", ") || "the extension contract"}.` : null,
    core_version: version,
    upstream_commit: String(lock.upstream_commit), adapter_version: ADAPTER_VERSION, manifest_sha256: hash,
    capabilities: { required, optional, forbidden },
  };
}
