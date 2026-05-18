import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface UsageRow {
  timestamp?: string;
  task?: string;
  provider?: string;
  tokens?: number;
  cost_usd?: number;
  ok?: boolean;
  fallback_used?: boolean;
  attempt?: number;
}

function engineRoot(): string {
  const root = process.env.MARKETING_ENGINE_HOST_ROOT ?? process.cwd();
  return resolve(root, ".marketing-engine");
}

export async function cliEntry(argv: string[]): Promise<void> {
  let tail = 20;
  let filterTask: string | undefined;
  let filterProvider: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tail") tail = Number(argv[++i]);
    else if (argv[i] === "--task") filterTask = argv[++i];
    else if (argv[i] === "--provider") filterProvider = argv[++i];
  }
  if (!Number.isInteger(tail) || tail <= 0) {
    process.stderr.write("usage: --tail must be a positive integer\n");
    process.exit(1);
  }
  const root = engineRoot();
  const dataDir = resolve(root, "data");
  if (!existsSync(root) || !existsSync(dataDir)) {
    process.stderr.write(
      `infra: expected .marketing-engine workspace at ${root}. Run \`marketing-engine init\` first.\n`,
    );
    process.exit(2);
  }
  const path = resolve(dataDir, "llm-usage.jsonl");
  if (!existsSync(path)) {
    process.stdout.write(`no log file at ${path}\n`);
    return;
  }
  const text = readFileSync(path, "utf8");
  const rows: UsageRow[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as UsageRow);
    } catch {}
  }
  const filtered = rows.filter((r) => {
    if (filterTask && r.task !== filterTask) return false;
    if (filterProvider && r.provider !== filterProvider) return false;
    return true;
  });
  const slice = filtered.slice(-tail);
  for (const r of slice) {
    const okFlag = r.ok === false ? "FAIL" : "ok  ";
    const fb = r.fallback_used ? "→fb" : "   ";
    process.stdout.write(
      `${r.timestamp} ${okFlag} ${fb} ${(r.task ?? "?").padEnd(14)} ${(r.provider ?? "?").padEnd(12)} tokens=${r.tokens ?? 0} cost=$${(r.cost_usd ?? 0).toFixed(5)}\n`,
    );
  }
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`logs failed: ${String(err)}\n`);
    process.exit(1);
  });
}
