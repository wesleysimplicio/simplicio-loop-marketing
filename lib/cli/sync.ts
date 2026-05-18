import { syncToLocal } from "../calendar/notion";

export async function cliEntry(_argv: string[]): Promise<void> {
  process.env.DRY_RUN = process.env.DRY_RUN ?? "true";
  const dry = process.env.DRY_RUN === "true";
  if (dry) {
    process.stdout.write(
      "sync: DRY_RUN=true; would call Notion but skipped network IO. Set DRY_RUN=false to actually sync.\n",
    );
    return;
  }
  const r = await syncToLocal(process.cwd());
  process.stdout.write(`sync: created=${r.created} skipped=${r.skipped}\n`);
  void _argv;
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`sync failed: ${String(err)}\n`);
    process.exit(1);
  });
}
