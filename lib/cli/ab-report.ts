import { buildReport } from "../observability/ab-report";

export async function cliEntry(argv: string[]): Promise<void> {
  let format: "markdown" | "json" = "markdown";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--format") {
      const v = argv[++i];
      if (v === "json" || v === "markdown") format = v;
    }
  }
  const rows = buildReport(process.cwd());
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
    return;
  }
  process.stdout.write("| Task | Provider | N | Save rate | Watch (s) | Cost | $/save |\n");
  process.stdout.write("|---|---|---|---|---|---|---|\n");
  for (const r of rows) {
    process.stdout.write(
      `| ${r.task} | ${r.provider}${r.low_sample ? " *low-sample*" : ""} | ${r.n} | ${(r.mean_save_rate * 100).toFixed(2)}% | ${r.mean_watch_time_s.toFixed(1)} | $${r.mean_cost_usd.toFixed(4)} | $${r.cost_per_save.toFixed(4)} |\n`,
    );
  }
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`ab-report failed: ${String(err)}\n`);
    process.exit(1);
  });
}
