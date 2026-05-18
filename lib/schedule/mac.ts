import { execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

interface LaunchdEntries {
  generateHour: number;
  promoteHour: number;
}

function defaultEntries(): LaunchdEntries {
  return { generateHour: 22, promoteHour: 9 };
}

function launchAgentsDir(): string {
  return process.env.MARKETING_ENGINE_SCHEDULE_LAUNCH_AGENTS_DIR
    ?? join(homedir(), "Library", "LaunchAgents");
}

function launchctlLogPath(): string | undefined {
  return process.env.MARKETING_ENGINE_SCHEDULE_LAUNCHCTL_LOG;
}

function launchctlUid(): string {
  return process.env.MARKETING_ENGINE_SCHEDULE_UID ?? String(process.getuid?.() ?? 0);
}

function plist(label: string, cmdRoot: string, hour: number, subcommand: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>WorkingDirectory</key>
  <string>${cmdRoot}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>npx</string>
    <string>marketing-engine</string>
    <string>${subcommand}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${hour}</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${cmdRoot}/.marketing-engine/data/${subcommand}.log</string>
  <key>StandardErrorPath</key>
  <string>${cmdRoot}/.marketing-engine/data/${subcommand}.log</string>
</dict>
</plist>
`;
}

function runLaunchctl(action: string, plistPath: string): void {
  const logPath = launchctlLogPath();
  if (logPath) {
    if (!existsSync(dirname(logPath))) {
      mkdirSync(dirname(logPath), { recursive: true });
    }
    appendFileSync(logPath, `${action} gui/${launchctlUid()} ${plistPath}\n`, "utf8");
    return;
  }

  execSync(`launchctl ${action} gui/${launchctlUid()} "${plistPath}"`);
}

export function showLaunchdPlan(cmdRoot: string): {
  generatePlistPath: string;
  promotePlistPath: string;
  generatePlist: string;
  promotePlist: string;
} {
  const entries = defaultEntries();
  const agentsDir = launchAgentsDir();
  return {
    generatePlistPath: join(agentsDir, "com.marketing-engine.generate.plist"),
    promotePlistPath: join(agentsDir, "com.marketing-engine.promote.plist"),
    generatePlist: plist("com.marketing-engine.generate", cmdRoot, entries.generateHour, "generate"),
    promotePlist: plist("com.marketing-engine.promote", cmdRoot, entries.promoteHour, "promote"),
  };
}

export function installLaunchd(cmdRoot: string): { added: boolean; message: string } {
  const plan = showLaunchdPlan(cmdRoot);
  if (existsSync(plan.generatePlistPath) || existsSync(plan.promotePlistPath)) {
    return { added: false, message: "launchd plists already installed." };
  }

  for (const [path, body] of [
    [plan.generatePlistPath, plan.generatePlist] as const,
    [plan.promotePlistPath, plan.promotePlist] as const,
  ]) {
    if (!existsSync(dirname(path))) {
      mkdirSync(dirname(path), { recursive: true });
    }
    writeFileSync(path, body, "utf8");
    runLaunchctl("bootstrap", path);
  }

  return { added: true, message: "launchd plists installed." };
}

export function uninstallLaunchd(): { removed: boolean; message: string } {
  const plan = showLaunchdPlan(process.cwd());
  const paths = [plan.generatePlistPath, plan.promotePlistPath];
  const existing = paths.filter((path) => existsSync(path));

  if (existing.length === 0) {
    return { removed: false, message: "no marketing-engine launchd plists found." };
  }

  for (const path of existing) {
    try {
      runLaunchctl("bootout", path);
    } catch {
      // Best effort if the job is not currently loaded.
    }
    unlinkSync(path);
  }

  return { removed: true, message: "launchd plists removed." };
}

export function statusLaunchd(): string {
  const plan = showLaunchdPlan(process.cwd());
  const installed = [
    [plan.generatePlistPath, "generate"] as const,
    [plan.promotePlistPath, "promote"] as const,
  ].filter(([path]) => existsSync(path));

  if (installed.length === 0) {
    return "launchd plists: NOT installed";
  }

  const lines = ["launchd plists: installed"];
  for (const [path, name] of installed) {
    lines.push(`${name}: ${path}`);
    lines.push(readFileSync(path, "utf8").trim());
  }
  return lines.join("\n");
}
