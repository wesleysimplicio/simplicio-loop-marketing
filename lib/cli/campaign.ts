import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadCampaignBrief,
  planPieceQueue,
  organicPhaseActive,
  reviewCampaign,
} from "../campaigns/campaign";

export async function cliEntry(argv: string[]): Promise<void> {
  const root = process.cwd();
  const sub = argv[0];

  if (sub === "review") {
    const campaignId = argv[1];
    if (!campaignId) {
      process.stderr.write("campaign review: missing <campaign-id>\n");
      process.exit(1);
    }
    const summary = reviewCampaign(root, campaignId);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  // default: create/plan from a brief file
  let briefPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--brief" && argv[i + 1]) briefPath = argv[++i];
  }
  if (!briefPath) {
    process.stderr.write(
      "campaign: usage: marketing-engine campaign --brief <path/to/CAMPAIGN.md>\n" +
        "       or: marketing-engine campaign review <campaign-id>\n",
    );
    process.exit(1);
  }
  const resolved = resolve(root, briefPath);
  if (!existsSync(resolved)) {
    process.stderr.write(`campaign: brief not found at ${resolved}\n`);
    process.exit(1);
  }
  const brief = loadCampaignBrief(resolved);
  const queue = planPieceQueue(brief);
  const organic = organicPhaseActive(brief);
  process.stdout.write(
    `campaign: id=${brief.id} pieces_queued=${queue.length} organic_phase_active=${organic}\n`,
  );
  process.stdout.write(`${JSON.stringify(queue, null, 2)}\n`);
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`campaign failed: ${String(err)}\n`);
    process.exit(1);
  });
}
