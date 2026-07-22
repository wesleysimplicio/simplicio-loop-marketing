import { resolve } from "node:path";
import { appendHbp, readHbp } from "../formats/binary";

export interface RunEntryInput {
  piece_id?: string;
  cycle_id?: string;
  actions?: string[];
  tokens_estimate?: number;
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
  return resolve(root, "data", "runs.hbp");
}

export function appendRunLog(
  entry: RunEntryInput,
  root = process.cwd(),
): RunRow {
  const row: RunRow = {
    timestamp: new Date().toISOString(),
    piece_id: entry.piece_id ?? "",
    cycle_id: entry.cycle_id,
    actions: entry.actions,
    tokens_estimate: entry.tokens_estimate,
    client: entry.client,
    providers_used: entry.providers_used,
    cost_estimate_usd: entry.cost_estimate_usd,
    status: entry.status,
    notes: entry.notes,
  };

  appendHbp(runsLogPath(root), row);
  return row;
}

export function readRuns(path: string): RunRow[] {
  return readHbp<RunRow>(path);
}
