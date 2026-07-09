/**
 * registry.ts — loads the versioned artifact schemas shipped under
 * contracts/marketing-artifacts/v1/schemas/ into a registry keyed by the
 * artifact's self-describing `schema` id (the `$id` of each schema file).
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SubsetSchema } from "./validate";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const CONTRACTS_DIR = join(
  PACKAGE_ROOT,
  "contracts",
  "marketing-artifacts",
  "v1",
);

export function schemasDir(): string {
  return join(CONTRACTS_DIR, "schemas");
}

export function fixturesDir(): string {
  return join(CONTRACTS_DIR, "fixtures");
}

let cache: Record<string, SubsetSchema> | null = null;

/** Load all schemas, keyed by their `$id`. Cached per process. */
export function loadSchemaRegistry(): Record<string, SubsetSchema> {
  if (cache) return cache;
  const registry: Record<string, SubsetSchema> = {};
  for (const name of readdirSync(schemasDir())) {
    if (!name.endsWith(".schema.json")) continue;
    const schema = JSON.parse(
      readFileSync(join(schemasDir(), name), "utf8"),
    ) as SubsetSchema;
    if (typeof schema.$id === "string") {
      registry[schema.$id] = schema;
    }
  }
  cache = registry;
  return registry;
}
