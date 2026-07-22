import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stableHash, type CoreLock } from "./core";

export interface ReleaseIdentity { ecosystem_release_id: string | null; core_version: string; core_commit: string; extension_version: string; composed_graph_hash: string }
export function releaseIdentity(root = process.cwd()): ReleaseIdentity {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const sourceRoot = existsSync(resolve(root,"extension/core.lock.json")) ? root : packageRoot;
  const lock = JSON.parse(readFileSync(resolve(sourceRoot,"extension/core.lock.json"),"utf8")) as CoreLock;
  const manifest = JSON.parse(readFileSync(resolve(sourceRoot,"extension/loop.marketing.json"),"utf8")) as Record<string, unknown>;
  return { ecosystem_release_id: process.env.SIMPLICIO_ECOSYSTEM_RELEASE_ID ?? null, core_version: lock.core.version, core_commit: lock.core.commit, extension_version: String(manifest.version), composed_graph_hash: stableHash({ core: lock.core.commit, extension: manifest }) };
}
