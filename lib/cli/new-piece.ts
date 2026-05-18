import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { nextPieceId } from "../pieces/id";

interface Args {
  client?: string;
  pillar?: string;
  channel?: string;
  date?: string;
  type?: string;
}

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

export async function cliEntry(argv: string[]): Promise<void> {
  const args = parse(argv);
  if (!args.client || !args.pillar || !args.channel) {
    process.stderr.write(
      "usage: marketing-engine new-piece --client <slug> --pillar <id> --channel <id> [--date YYYY-MM-DD] [--type reel|carousel|...]\n",
    );
    process.exit(1);
  }
  const date = args.date ? new Date(args.date) : new Date();
  const id = nextPieceId(date);
  const dateStr = date.toISOString().slice(0, 10);
  const piecesDir = resolve(process.cwd(), "pieces");
  if (!existsSync(piecesDir)) mkdirSync(piecesDir, { recursive: true });
  const dest = resolve(piecesDir, `${id}.md`);
  const content = `---
id: ${id}
client: ${args.client}
date: ${dateStr}
status: draft
type: ${args.type ?? "reel"}
pillar: ${args.pillar}
platforms: ["${args.channel}"]
provider_override:
  llm_text: null
  image: null
  video: null
locale: en
---

# Brief

(describe the piece in one paragraph)

# Hook

(first three seconds)

# Script

(full body)
`;
  writeFileSync(dest, content, "utf8");
  process.stdout.write(`created ${dest}\n`);
  void dirname;
  void readFileSync;
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
