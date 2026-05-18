import { readUsage, filterWindow, summarize, writeReport, usageLogPath } from "../observability/cost";

export async function cliEntry(argv: string[]): Promise<void> {
  let windowDays = 7;
  let since: string | undefined;
  let reportPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--window" && argv[i + 1]) {
      windowDays = Number(argv[++i].replace(/d$/, ""));
    } else if (argv[i] === "--since" && argv[i + 1]) {
      since = argv[++i];
    } else if (argv[i] === "--report" && argv[i + 1]) {
      reportPath = argv[++i];
    }
  }
  const rows = readUsage(usageLogPath());
  const filtered = filterWindow(rows, windowDays, since);
  const summary = summarize(filtered);
  process.stdout.write(`window: ${since ? `since ${since}` : `${windowDays}d`}\n`);
  process.stdout.write(
    `total: $${summary.total_cost_usd.toFixed(4)} across ${summary.total_calls} calls\n\n`,
  );
  process.stdout.write("Provider                Calls       Cost\n");
  for (const [p, v] of Object.entries(summary.by_provider).sort(
    (a, b) => b[1].cost - a[1].cost,
  )) {
    process.stdout.write(
      `  ${p.padEnd(22)} ${String(v.calls).padStart(5)}  $${v.cost.toFixed(4)}\n`,
    );
  }
  process.stdout.write("\nTask                    Calls       Cost\n");
  for (const [t, v] of Object.entries(summary.by_task).sort(
    (a, b) => b[1].cost - a[1].cost,
  )) {
    process.stdout.write(
      `  ${t.padEnd(22)} ${String(v.calls).padStart(5)}  $${v.cost.toFixed(4)}\n`,
    );
  }
  if (reportPath) {
    writeReport(reportPath, summary);
    process.stdout.write(`\nreport written to ${reportPath}\n`);
  }
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`cost failed: ${String(err)}\n`);
    process.exit(1);
  });
}
