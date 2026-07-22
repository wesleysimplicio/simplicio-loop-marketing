import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const COMPONENT_RELEASE_SCHEMA = "simplicio.component-release/v1";
export const CORE_LOCK_SCHEMA = "loop.marketing-core-lock/v1";

export interface CoreLock {
  schema: typeof CORE_LOCK_SCHEMA; channel: "canary" | "stable";
  core: { version: string; commit: string; tag: string; artifact_digest: string };
  protocols: Record<string, string>; previous: CoreLock["core"] | null;
}
export interface ComponentRelease {
  schema: typeof COMPONENT_RELEASE_SCHEMA; component: string; repository: string;
  version: string; commit: string; tag: string; digest: string; breaking_change: boolean;
  protocols: Record<string, string>; capabilities: string[]; published_at: string;
  revoked?: boolean; conformance?: { modes: string[]; passed: boolean };
}
export interface CompatibilityResult {
  compatible: boolean; reason_code: string | null; reasons: string[];
  schema_diff: string[]; capability_diff: string[]; graph_hash: string;
}

const semver = (value: string): [number, number, number] | null => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
};
const compare = (a: [number,number,number], b: [number,number,number]) =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
export const stableHash = (value: unknown): string => createHash("sha256").update(JSON.stringify(value, (_k, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b]) => a.localeCompare(b))) : v)).digest("hex");

export function evaluateRelease(release: ComponentRelease, lock: CoreLock, manifest: Record<string, any>): CompatibilityResult {
  const reasons: string[] = [];
  if (release.schema !== COMPONENT_RELEASE_SCHEMA) reasons.push("unknown-component-release-schema");
  if (release.component !== "simplicio-loop") reasons.push("wrong-component");
  if (!/^sha256:[a-f0-9]{64}$/.test(release.digest)) reasons.push("unverified-artifact-digest");
  if (!/^[a-f0-9]{40}$/.test(release.commit)) reasons.push("invalid-commit-pin");
  if (release.revoked) reasons.push("release-revoked");
  if (release.breaking_change) reasons.push("breaking-change");
  const candidate = semver(release.version), min = semver(manifest.requires_core?.min_version), max = semver(manifest.requires_core?.max_version);
  if (!candidate || !min || !max) reasons.push("invalid-semver");
  else if (compare(candidate,min) < 0 || compare(candidate,max) > 0) reasons.push("core-version-out-of-range");
  const required: string[] = manifest.capabilities?.requires ?? [];
  const capabilityDiff = required.filter((x) => !release.capabilities.includes(x)).sort();
  if (capabilityDiff.length) reasons.push("missing-required-capability");
  const schemaDiff = Object.keys(lock.protocols).filter((key) => release.protocols[key] !== lock.protocols[key]).sort();
  if (schemaDiff.length) reasons.push("protocol-drift");
  const modes = new Set(release.conformance?.modes ?? []);
  if (!release.conformance?.passed || !["embedded","daemon","remote"].every((x) => modes.has(x))) reasons.push("conformance-evidence-missing");
  const forbidden = ["coordinator", "scheduler", "queue", "completion_engine"];
  if ((manifest.capabilities?.provides ?? []).some((x: string) => forbidden.includes(x))) reasons.push("forbidden-architecture-capability");
  return { compatible: reasons.length === 0, reason_code: reasons[0] ?? null, reasons, schema_diff: schemaDiff, capability_diff: capabilityDiff, graph_hash: stableHash({ core: release.commit, extension: manifest, protocols: release.protocols }) };
}

export function promoteLock(lock: CoreLock, release: ComponentRelease, channel: CoreLock["channel"]): CoreLock {
  return { schema: CORE_LOCK_SCHEMA, channel, core: { version: release.version, commit: release.commit, tag: release.tag, artifact_digest: release.digest }, protocols: { ...release.protocols }, previous: { ...lock.core } };
}
export const readCoreLock = (path: string): CoreLock => JSON.parse(readFileSync(path,"utf8")) as CoreLock;
