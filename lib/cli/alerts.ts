import { collectFailures, detectAlerts, postWebhook } from "../observability/failures";

export async function cliEntry(argv: string[]): Promise<void> {
  let windowHours = 24;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--window" && argv[i + 1]) {
      const v = argv[++i];
      if (v.endsWith("h")) windowHours = Number(v.replace(/h$/, ""));
      else if (v.endsWith("d")) windowHours = Number(v.replace(/d$/, "")) * 24;
      else windowHours = Number(v);
    }
  }
  const summary = collectFailures(process.cwd(), windowHours);
  const alerts = detectAlerts(summary, []);
  process.stdout.write(`alerts: window=${windowHours}h failures=${summary.total}\n`);
  for (const [p, n] of Object.entries(summary.by_provider)) {
    process.stdout.write(`  provider ${p}: ${n} failures\n`);
  }
  for (const [t, n] of Object.entries(summary.by_task)) {
    process.stdout.write(`  task ${t}: ${n} failures\n`);
  }
  for (const a of alerts) {
    process.stdout.write(`ALERT [${a.event_type}] ${a.summary}\n`);
  }
  const url = process.env.ALERT_WEBHOOK_URL;
  if (url && alerts.length > 0) {
    const ok = await postWebhook(url, { alerts, summary });
    process.stdout.write(`webhook: ${ok ? "delivered" : "failed"}\n`);
  }
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`alerts failed: ${String(err)}\n`);
    process.exit(1);
  });
}
