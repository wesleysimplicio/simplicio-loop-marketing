import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isoWeek, nextPieceId } from "../pieces/id";

interface Args {
  client?: string;
  pillar?: string;
  channel?: string;
  date?: string;
  type?: string;
}

const __filename = fileURLToPath(import.meta.url);
const PACKAGE_ROOT = resolve(dirname(__filename), "..", "..");

function parse(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--client") args.client = argv[++i];
    else if (a === "--pillar") args.pillar = argv[++i];
    else if (a === "--channel") args.channel = argv[++i];
    else if (a === "--date") args.date = argv[++i];
    else if (a === "--type") args.type = argv[++i];
  }
  return args;
}

function engineRoot(): string {
  const root = process.env.MARKETING_ENGINE_HOST_ROOT ?? process.cwd();
  return resolve(root, ".marketing-engine");
}

function templatePath(): string {
  return resolve(PACKAGE_ROOT, ".specs", "pieces", "piece-template.md");
}

function ensureWorkspaceDir(path: string, label: string): void {
  if (!existsSync(path)) {
    process.stderr.write(
      `infra: ${label} not found at ${path}. Run \`marketing-engine init\` first.\n`,
    );
    process.exit(2);
  }
}

function nextSequenceForWeek(piecesDir: string, date: Date): number {
  const { year, week } = isoWeek(date);
  const prefix = `PIECE-${year}W${String(week).padStart(2, "0")}-`;
  let maxSeq = 0;

  for (const file of readdirSync(piecesDir)) {
    if (!file.startsWith(prefix) || !file.endsWith(".md")) {
      continue;
    }

    const seq = Number(file.slice(prefix.length, prefix.length + 3));
    if (Number.isFinite(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return maxSeq + 1;
}

function renderTemplate(args: Args, id: string, dateStr: string): string {
  const template = readFileSync(templatePath(), "utf8");
  return template
    .replace("id: PIECE-XXX", `id: ${id}`)
    .replace("client: <client-id>", `client: ${args.client}`)
    .replace("campaign: <campaign-id>", "campaign: null")
    .replace("date: YYYY-MM-DD", `date: ${dateStr}`)
    .replace("type: reel", `type: ${args.type ?? "reel"}`)
    .replace("pillar: <pillar-id from PILLARS>", `pillar: ${args.pillar}`)
    .replace(
      "platforms: [instagram, tiktok, youtube-shorts, facebook]",
      `platforms: ["${args.channel}"]`,
    );
}

export async function cliEntry(argv: string[]): Promise<void> {
  const args = parse(argv);
  if (!args.client || !args.pillar || !args.channel) {
    process.stderr.write(
      "usage: marketing-engine new-piece --client <slug> --pillar <id> --channel <id> [--date YYYY-MM-DD] [--type reel|carousel|...]\n",
    );
    process.exit(1);
  }
  const date = args.date ? new Date(args.date) : new Date();
  if (Number.isNaN(date.getTime())) {
    process.stderr.write("usage: --date must be a valid YYYY-MM-DD value\n");
    process.exit(1);
  }
  const root = engineRoot();
  const piecesDir = resolve(root, "pieces");
  ensureWorkspaceDir(root, ".marketing-engine workspace");
  ensureWorkspaceDir(piecesDir, "pieces directory");
  const id = nextPieceId(date, nextSequenceForWeek(piecesDir, date));
  const dateStr = date.toISOString().slice(0, 10);
  const dest = resolve(piecesDir, `${id}.md`);
  const content = renderTemplate(args, id, dateStr);
  writeFileSync(dest, content, "utf8");
  process.stdout.write(`${dest}\n`);
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`new-piece failed: ${String(err)}\n`);
    process.exit(1);
  });
}
