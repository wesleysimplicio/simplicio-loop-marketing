import { platform } from "node:os";
import {
  installCron,
  installLaunchd,
  showCronPlan,
  showLaunchdPlan,
  statusCron,
  uninstallCron,
} from "../schedule/cron";

export async function cliEntry(argv: string[]): Promise<void> {
  const sub = argv[0];
  const yes = argv.includes("--yes");
  const root = process.cwd();
  if (sub === "install") {
    if (!yes) {
      process.stdout.write("Plan (use --yes to actually install):\n\n");
      if (platform() === "darwin") {
        const p = showLaunchdPlan(root);
        process.stdout.write(`Would write:\n  ${p.generatePlistPath}\n  ${p.promotePlistPath}\n`);
      } else {
        process.stdout.write(showCronPlan(root));
      }
      return;
    }
    const r = platform() === "darwin" ? installLaunchd(root) : installCron(root);
    process.stdout.write(`${r.message}\n`);
    return;
  }
  if (sub === "uninstall") {
    const r = uninstallCron();
    process.stdout.write(`${r.message}\n`);
    return;
  }
  if (sub === "status") {
    process.stdout.write(`${statusCron()}\n`);
    return;
  }
  process.stderr.write("usage: marketing-engine schedule install|uninstall|status [--yes]\n");
  process.exit(1);
}

if (
  import.meta.url ===
  `file://${process.argv[1]?.replace(/\\/g, "/")}`.replace(/^file:\/\/\/\//, "file:///")
) {
  cliEntry(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`schedule failed: ${String(err)}\n`);
    process.exit(1);
  });
}
