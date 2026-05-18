import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface LearningEntry {
  date: string;
  piece_id: string;
  channel: string;
  reason: string;
}

export async function appendLearning(entry: LearningEntry): Promise<void> {
  const dataDir = join(process.cwd(), "data");
  const learningsPath = join(dataDir, "learnings.md");

  await mkdir(dataDir, { recursive: true });
  await appendFile(
    learningsPath,
    `- ${entry.date} | ${entry.piece_id} | ${entry.channel} | did not perform: ${entry.reason}\n`,
    "utf8",
  );
}
