import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const MARKER_BEGIN = "# >>> marketing-engine begin >>>";
const MARKER_END = "# <<< marketing-engine end <<<";

interface CronEntries {
  generateHour: number;
  promoteHour: number;
}

function defaultEntries(): CronEntries {
  return { generateHour: 22, promoteHour: 9 };
}

function configuredCrontabFile(): string | undefined {
  return process.env.MARKETING_ENGINE_SCHEDULE_CRONTAB_FILE;
}

function cronBlock(cmdRoot: string, entries: CronEntries = defaultEntries()): string {
  return `${MARKER_BEGIN}
0 ${entries.generateHour} * * * cd "${cmdRoot}" && npx marketing-engine generate >> .marketing-engine/data/cron.log 2>&1
0 ${entries.promoteHour} * * * cd "${cmdRoot}" && npx marketing-engine promote >> .marketing-engine/data/cron.log 2>&1
${MARKER_END}
`;
}

function readCurrentCrontab(): string {
  const crontabFile = configuredCrontabFile();
  if (crontabFile) {
    return existsSync(crontabFile) ? readFileSync(crontabFile, "utf8") : "";
  }

  try {
    return execSync("crontab -l", { encoding: "utf8" });
  } catch {
    return "";
  }
}

function writeCurrentCrontab(next: string): void {
  const crontabFile = configuredCrontabFile();
  if (crontabFile) {
    if (!existsSync(dirname(crontabFile))) {
      mkdirSync(dirname(crontabFile), { recursive: true });
    }
    writeFileSync(crontabFile, next, "utf8");
    return;
  }

  const tmpPath = join(homedir(), ".marketing-engine-cron.tmp");
  writeFileSync(tmpPath, next, "utf8");
  execSync(`crontab "${tmpPath}"`);
}

export function showCronPlan(cmdRoot: string): string {
  return cronBlock(cmdRoot);
}

export function installCron(cmdRoot: string): { added: boolean; message: string } {
  const current = readCurrentCrontab();
  if (current.includes(MARKER_BEGIN)) {
    return { added: false, message: "marketing-engine block already installed in crontab." };
  }

  const block = cronBlock(cmdRoot);
  const next = `${current}${current && !current.endsWith("\n") ? "\n" : ""}${block}`;
  writeCurrentCrontab(next);
  return { added: true, message: "crontab updated." };
}

export function uninstallCron(): { removed: boolean; message: string } {
  const current = readCurrentCrontab();
  if (!current) {
    return { removed: false, message: "no crontab to modify." };
  }

  const re = new RegExp(`${MARKER_BEGIN}[\\s\\S]*?${MARKER_END}\\n?`, "g");
  if (!re.test(current)) {
    return { removed: false, message: "no marketing-engine block found." };
  }

  const next = current.replace(re, "");
  writeCurrentCrontab(next);
  return { removed: true, message: "crontab cleaned." };
}

export function statusCron(): string {
  const current = readCurrentCrontab();
  if (!current) {
    return "no crontab installed";
  }
  if (!current.includes(MARKER_BEGIN)) {
    return "marketing-engine block: NOT installed";
  }

  const match = new RegExp(`${MARKER_BEGIN}([\\s\\S]*?)${MARKER_END}`).exec(current);
  return `marketing-engine block: installed\n${match?.[1]?.trim() ?? ""}`;
}
