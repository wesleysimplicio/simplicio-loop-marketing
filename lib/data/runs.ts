import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface RunEntryInput {
  piece_id: string;
  client?: string;
  providers_used: string[];
  cost_estimate_usd: number;
  status: string;
  notes?: string;
}

export interface RunRow extends RunEntryInput {
  timestamp: string;
}

export function runsLogPath(root = process.cwd()): string {
  return resolve(root, "data", "runs.jsonl");
}

export function appendRunLog(
  entry: RunEntryInput,
  root = process.cwd(),
): RunRow {
  const path = runsLogPath(root);
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const row: RunRow = {
    timestamp: new Date().toISOString(),
    piece_id: entry.piece_id,
    client: entry.client,
    providers_used: entry.providers_used,
    cost_estimate_usd: entry.cost_estimate_usd,
    status: entry.status,
    notes: entry.notes,
  };

  appendFileSync(path, `${JSON.stringify(row)}\n`, "utf8");
  return row;
}

export function readRuns(path: string): RunRow[] {
  if (!existsSync(path)) {
    return [];
  }

  const rows: RunRow[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) {
      continue;
    }

    try {
      rows.push(JSON.parse(line) as RunRow);
    } catch {
      continue;
    }
  }

  return rows;
}
