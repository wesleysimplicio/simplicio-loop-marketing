import type { GenerationResult, VideoTask } from "./types";

export interface VideoGenerateOptions {
  task: VideoTask;
  aspect: string;
  duration_s: number;
}

export interface VideoProvider {
  name: string;
  generate(brief: string, opts: VideoGenerateOptions): Promise<GenerationResult<string>>;
}

abstract class BaseVideoProvider implements VideoProvider {
  abstract readonly name: string;

  async generate(
    brief: string,
    opts: VideoGenerateOptions,
  ): Promise<GenerationResult<string>> {
    void brief;
    const ts = Date.now();
    const output = `outputs/mock-${this.name}-${ts}.mp4`;
    return {
      ok: true,
      provider: this.name,
      task: opts.task,
      output,
      tokens: 0,
      cost_usd: 0.05 * opts.duration_s,
      latency_ms: 5000,
    };
  }
}

export class HiggsfieldVideoProvider extends BaseVideoProvider {
  readonly name = "higgsfield";
}

export class TopviewVideoProvider extends BaseVideoProvider {
  readonly name = "topview";
}

export class WavespeedVideoProvider extends BaseVideoProvider {
  readonly name = "wavespeed";
}

const VIDEO_REGISTRY: Record<string, () => VideoProvider> = {
  higgsfield: () => new HiggsfieldVideoProvider(),
  topview: () => new TopviewVideoProvider(),
  wavespeed: () => new WavespeedVideoProvider(),
};

const VIDEO_TASK_DEFAULTS: Record<VideoTask, string> = {
  "cinematic-reel": "higgsfield",
  "motion-control": "higgsfield",
  "ugc-product": "topview",
  "product-demo": "topview",
  "talking-head": "topview",
  "batch-hooks": "wavespeed",
};

export interface VideoFactoryOptions {
  override?: string;
}

export function getVideoProvider(
  task: VideoTask,
  opts?: VideoFactoryOptions,
): VideoProvider {
  const override = opts?.override;
  const candidate = override ?? VIDEO_TASK_DEFAULTS[task] ?? "higgsfield";
  const factory = VIDEO_REGISTRY[candidate] ?? VIDEO_REGISTRY["higgsfield"];
  if (!factory) {
    return new HiggsfieldVideoProvider();
  }
  return factory();
}
