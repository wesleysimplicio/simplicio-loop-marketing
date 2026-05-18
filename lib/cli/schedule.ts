import { platform } from "node:os";
import {
  installCron,
  showCronPlan,
  statusCron,
  uninstallCron,
} from "../schedule/linux";
import {
  installLaunchd,
  showLaunchdPlan,
  statusLaunchd,
  uninstallLaunchd,
} from "../schedule/mac";

function runtimePlatform() {
  return process.env.MARKETING_ENGINE_SCHEDULE_PLATFORM ?? platform();
}

export async function cliEntry(argv: string[]): Promise<void> {
  const sub = argv[0];
  const yes = argv.includes("--yes");
  const root = process.cwd();
  const currentPlatform = runtimePlatform();

  if (sub === "install") {
    if (currentPlatform === "win32") {
      process.stdout.write("Windows not supported; use Task Scheduler manually.\n");
      return;
    }
    if (!yes) {
      process.stdout.write("Plan (use --yes to actually install):\n\n");
      if (currentPlatform === "darwin") {
        const p = showLaunchdPlan(root);
        process.stdout.write(
          [
            `Would write: ${p.generatePlistPath}`,
            p.generatePlist.trim(),
            "",
            `Would write: ${p.promotePlistPath}`,
            p.promotePlist.trim(),
            "",
          ].join("\n"),
        );
      } else {
        process.stdout.write(showCronPlan(root));
      }
      return;
    }
    const r = currentPlatform === "darwin" ? installLaunchd(root) : installCron(root);
    process.stdout.write(`${r.message}\n`);
    return;
  }
  if (sub === "uninstall") {
    if (currentPlatform === "win32") {
      process.stdout.write("Windows not supported; use Task Scheduler manually.\n");
      return;
    }
    const r = currentPlatform === "darwin" ? uninstallLaunchd() : uninstallCron();
    process.stdout.write(`${r.message}\n`);
    return;
  }
  if (sub === "status") {
    if (currentPlatform === "win32") {
      process.stdout.write("Windows not supported; use Task Scheduler manually.\n");
      return;
    }
    process.stdout.write(`${currentPlatform === "darwin" ? statusLaunchd() : statusCron()}\n`);
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
