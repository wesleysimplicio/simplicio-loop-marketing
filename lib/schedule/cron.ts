import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

const MARKER_BEGIN = "# >>> marketing-engine begin >>>";
const MARKER_END = "# <<< marketing-engine end <<<";

interface ScheduleEntries {
  generateHour: number;
  promoteHour: number;
}

function defaultEntries(): ScheduleEntries {
  return { generateHour: 22, promoteHour: 9 };
}

function cronBlock(cmdRoot: string, entries: ScheduleEntries): string {
  return `${MARKER_BEGIN}
${entries.generateHour} 0 * * * cd "${cmdRoot}" && npx marketing-engine generate >> .marketing-engine/data/cron.log 2>&1
${entries.promoteHour} 0 * * * cd "${cmdRoot}" && npx marketing-engine promote >> .marketing-engine/data/cron.log 2>&1
${MARKER_END}
`;
}

export function showCronPlan(cmdRoot: string): string {
  return cronBlock(cmdRoot, defaultEntries());
}

export function installCron(cmdRoot: string): { added: boolean; message: string } {
  if (platform() === "win32") {
    return { added: false, message: "Windows not supported; use Task Scheduler manually." };
  }
  let current = "";
  try {
    current = execSync("crontab -l", { encoding: "utf8" });
  } catch {
    current = "";
  }
  if (current.includes(MARKER_BEGIN)) {
    return { added: false, message: "marketing-engine block already installed in crontab." };
  }
  const block = cronBlock(cmdRoot, defaultEntries());
  const next = `${current}${current && !current.endsWith("\n") ? "\n" : ""}${block}`;
  const tmpPath = join(homedir(), ".marketing-engine-cron.tmp");
  writeFileSync(tmpPath, next, "utf8");
  execSync(`crontab "${tmpPath}"`);
  return { added: true, message: "crontab updated." };
}

export function uninstallCron(): { removed: boolean; message: string } {
  if (platform() === "win32") {
    return { removed: false, message: "Windows not supported." };
  }
  let current = "";
  try {
    current = execSync("crontab -l", { encoding: "utf8" });
  } catch {
    return { removed: false, message: "no crontab to modify." };
  }
  const re = new RegExp(
    `${MARKER_BEGIN}[\\s\\S]*?${MARKER_END}\\n?`,
    "g",
  );
  if (!re.test(current)) {
    return { removed: false, message: "no marketing-engine block found." };
  }
  const next = current.replace(re, "");
  const tmpPath = join(homedir(), ".marketing-engine-cron.tmp");
  writeFileSync(tmpPath, next, "utf8");
  execSync(`crontab "${tmpPath}"`);
  return { removed: true, message: "crontab cleaned." };
}

export function statusCron(): string {
  if (platform() === "win32") return "Windows: not supported.";
  let current = "";
  try {
    current = execSync("crontab -l", { encoding: "utf8" });
  } catch {
    return "no crontab installed";
  }
  if (!current.includes(MARKER_BEGIN)) return "marketing-engine block: NOT installed";
  const match = new RegExp(
    `${MARKER_BEGIN}([\\s\\S]*?)${MARKER_END}`,
  ).exec(current);
  return `marketing-engine block: installed\n${match?.[1]?.trim() ?? ""}`;
}

export interface LaunchdPlanResult {
  generatePlistPath: string;
  promotePlistPath: string;
  generatePlist: string;
  promotePlist: string;
}

export function showLaunchdPlan(cmdRoot: string): LaunchdPlanResult {
  const e = defaultEntries();
  const dir = join(homedir(), "Library", "LaunchAgents");
  function plist(label: string, hour: number, sub: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${label}</string>
  <key>WorkingDirectory</key><string>${cmdRoot}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>npx</string>
    <string>marketing-engine</string>
    <string>${sub}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>${hour}</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>${cmdRoot}/.marketing-engine/data/${sub}.log</string>
  <key>StandardErrorPath</key><string>${cmdRoot}/.marketing-engine/data/${sub}.log</string>
</dict></plist>
`;
  }
  return {
    generatePlistPath: join(dir, "com.marketing-engine.generate.plist"),
    promotePlistPath: join(dir, "com.marketing-engine.promote.plist"),
    generatePlist: plist("com.marketing-engine.generate", e.generateHour, "generate"),
    promotePlist: plist("com.marketing-engine.promote", e.promoteHour, "promote"),
  };
}

export function installLaunchd(cmdRoot: string): { added: boolean; message: string } {
  if (platform() !== "darwin") {
    return { added: false, message: "launchd only supported on macOS." };
  }
  const plan = showLaunchdPlan(cmdRoot);
  for (const [path, body] of [
    [plan.generatePlistPath, plan.generatePlist] as const,
    [plan.promotePlistPath, plan.promotePlist] as const,
  ]) {
    if (existsSync(path)) {
      return { added: false, message: `${path} already exists; bail.` };
    }
    if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, "utf8");
    try {
      execSync(`launchctl bootstrap gui/$(id -u) "${path}"`);
    } catch {
      // bootstrap may fail if already loaded — best effort.
    }
  }
  return { added: true, message: "launchd plists installed." };
}

void readFileSync;
