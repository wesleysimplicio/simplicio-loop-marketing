import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface LearningEntry {
  date: string;
  piece_id: string;
  channel?: string;
  reason: string;
}

export function appendLearning(entry: LearningEntry): Promise<void>;
export function appendLearning(root: string, entry: LearningEntry): Promise<void>;
export async function appendLearning(
  rootOrEntry: string | LearningEntry,
  maybeEntry?: LearningEntry,
): Promise<void> {
  const root = typeof rootOrEntry === "string" ? rootOrEntry : process.cwd();
  const entry = typeof rootOrEntry === "string" ? maybeEntry : rootOrEntry;
  if (!entry) {
    throw new Error("appendLearning requires an entry payload");
  }
  const learningsPath = resolve(root, "data", "learnings.md");
  await mkdir(dirname(learningsPath), { recursive: true });
  await appendFile(
    learningsPath,
    `- ${entry.date} | ${entry.piece_id} | ${entry.channel ?? "unknown"} | did not perform: ${entry.reason}\n`,
    "utf8",
  );
}
