import { copyFileSync, existsSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { appendHbp, readHbp, readHbi, writeHbiAtomic } from "./binary";

export const LEGACY_MAX_BYTES = 64 * 1024 * 1024;
export type MigrationTarget = "HBP" | "HBI";
export interface MigrationResult { status: "migrated" | "already_migrated" | "dry_run"; source: string; target: string; backup: string | null; records: number; }

function parseLegacy(path: string, target: MigrationTarget): unknown[] {
  const size = statSync(path).size;
  if (size > LEGACY_MAX_BYTES) throw new Error(`legacy input exceeds ${LEGACY_MAX_BYTES} bytes`);
  const text = readFileSync(path, "utf8");
  if (target === "HBI") return [JSON.parse(text) as unknown];
  const rows: unknown[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line) as unknown); }
    catch { throw new Error(`invalid legacy record at line ${index + 1}`); }
  }
  return rows;
}

/** One-shot compatibility boundary. Production readers never fall back to JSON. */
export function migrateLegacy(source: string, target: string, format: MigrationTarget, dryRun = false): MigrationResult {
  if (existsSync(target)) {
    const records = format === "HBP" ? readHbp(target).length : (readHbi(target), 1);
    return { status: "already_migrated", source, target, backup: existsSync(`${source}.bak`) ? `${source}.bak` : null, records };
  }
  if (!existsSync(source)) throw new Error(`legacy source not found: ${source}`);
  const rows = parseLegacy(source, format);
  if (dryRun) return { status: "dry_run", source, target, backup: null, records: rows.length };
  mkdirSync(dirname(target), { recursive: true });
  const staging = `${target}.migrating-${process.pid}`;
  try {
    if (format === "HBP") for (const row of rows) appendHbp(staging, row);
    else writeHbiAtomic(staging, rows[0]);
    const verified = format === "HBP" ? readHbp(staging) : [readHbi(staging)];
    if (verified.length !== rows.length) throw new Error("migration verification count mismatch");
    const backup = `${source}.bak`;
    if (!existsSync(backup)) copyFileSync(source, backup);
    renameSync(staging, target);
    return { status: "migrated", source, target, backup, records: rows.length };
  } catch (error) {
    rmSync(staging, { force: true });
    throw error;
  }
}
