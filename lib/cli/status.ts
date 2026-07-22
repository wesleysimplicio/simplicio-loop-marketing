import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { listPieces } from "../pieces/store";

interface RunRow {
  timestamp: string;
  piece_id: string;
  providers_used: string[];
  cost_estimate_usd: number;
  status: string;
}

function readRuns(path: string): RunRow[] {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  const rows: RunRow[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as RunRow);
    } catch {}
  }
  return rows;
}

function engineRoot(): string {
  const root = process.env.MARKETING_ENGINE_HOST_ROOT ?? process.cwd();
  return resolve(root, ".marketing-engine");
}

export async function cliEntry(_argv: string[]): Promise<void> {
  const root = engineRoot();
  const piecesDir = resolve(root, "pieces");
  const dataDir = resolve(root, "data");
  if (!existsSync(root) || !existsSync(piecesDir) || !existsSync(dataDir)) {
    process.stderr.write(
      `infra: expected .marketing-engine workspace at ${root}. Run \`marketing-engine init\` first.\n`,
    );
    process.exit(2);
  }
  const pieces = listPieces({ piecesDir });
  const counts: Record<string, number> = {};
  for (const p of pieces) {
    counts[p.frontmatter.status] = (counts[p.frontmatter.status] ?? 0) + 1;
  }
  process.stdout.write("== Pieces ==\n");
  for (const k of ["draft", "scheduled", "published", "measured", "review"]) {
    process.stdout.write(`  ${k.padEnd(10)} ${counts[k] ?? 0}\n`);
  }
  const runs = readRuns(resolve(dataDir, "runs.hbp"));
  const last24h = Date.now() - 24 * 3600 * 1000;
  const recentRuns = runs.filter((r) => Date.parse(r.timestamp) > last24h);
  const cost = recentRuns.reduce((acc, r) => acc + (r.cost_estimate_usd ?? 0), 0);
  process.stdout.write("\n== Last 24h ==\n");
  process.stdout.write(`  runs        ${recentRuns.length}\n`);
  process.stdout.write(`  cost USD    ${cost.toFixed(4)}\n`);
  process.stdout.write("\n== Last 5 runs ==\n");
  for (const r of runs.slice(-5)) {
    process.stdout.write(
      `  ${r.timestamp} ${r.piece_id} ${r.status} ${r.providers_used.join("+")} $${(r.cost_estimate_usd ?? 0).toFixed(4)}\n`,
    );
  }
  void _argv;
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`status failed: ${String(err)}\n`);
    process.exit(1);
  });
}
