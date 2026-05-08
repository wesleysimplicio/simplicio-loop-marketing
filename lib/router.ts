import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ImageTask, LLMTask, VideoTask } from "./providers/types";

const LLM_ROUTING: Record<LLMTask, string> = {
  orchestration: "claude",
  code: "claude",
  caption: "deepseek",
  script: "claude",
  compliance: "claude",
  translation: "deepseek",
  humanization: "claude",
};

const IMAGE_ROUTING: Record<ImageTask, string> = {
  "quote-card": "gpt-image",
  "ugc-ad": "topview",
  cinematic: "higgsfield",
  carousel: "gpt-image",
  "batch-ab": "wavespeed",
  inpaint: "gpt-image",
  "face-swap": "topview",
  "before-after": "gpt-image",
};

const VIDEO_ROUTING: Record<VideoTask, string> = {
  "cinematic-reel": "higgsfield",
  "motion-control": "higgsfield",
  "ugc-product": "topview",
  "product-demo": "topview",
  "talking-head": "topview",
  "batch-hooks": "wavespeed",
};

export function routeLLM(task: LLMTask, override?: string): string {
  if (override) {
    return override;
  }
  if (task === "orchestration") {
    const env_default = process.env.LLM_DEFAULT;
    if (env_default && env_default.length > 0) {
      return env_default;
    }
  }
  return LLM_ROUTING[task] ?? "claude";
}

export function routeImage(task: ImageTask, override?: string): string {
  if (override) {
    return override;
  }
  return IMAGE_ROUTING[task] ?? "gpt-image";
}

export function routeVideo(task: VideoTask, override?: string): string {
  if (override) {
    return override;
  }
  return VIDEO_ROUTING[task] ?? "higgsfield";
}

export interface UsageEntry {
  task: string;
  provider: string;
  tokens?: number;
  cost_usd?: number;
}

interface UsageLogLine extends UsageEntry {
  timestamp: string;
}

export function logUsage(entry: UsageEntry): void {
  const log_path = resolve(process.cwd(), "data", "llm-usage.jsonl");
  const dir = dirname(log_path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const line: UsageLogLine = {
    timestamp: new Date().toISOString(),
    task: entry.task,
    provider: entry.provider,
    tokens: entry.tokens,
    cost_usd: entry.cost_usd,
  };
  appendFileSync(log_path, `${JSON.stringify(line)}\n`, { encoding: "utf8" });
}
