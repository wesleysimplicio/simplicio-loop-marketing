import type { GenerationResult, ImageTask } from "./types";

export interface ImageGenerateOptions {
  task: ImageTask;
  aspect: string;
  n?: number;
}

export interface ImageProvider {
  name: string;
  generate(brief: string, opts: ImageGenerateOptions): Promise<GenerationResult<string[]>>;
}

abstract class BaseImageProvider implements ImageProvider {
  abstract readonly name: string;

  async generate(
    brief: string,
    opts: ImageGenerateOptions,
  ): Promise<GenerationResult<string[]>> {
    const count = opts.n ?? 1;
    const ts = Date.now();
    const output: string[] = [];
    for (let i = 1; i <= count; i++) {
      output.push(`outputs/mock-${this.name}-${ts}-${i}.png`);
    }
    void brief;
    return {
      ok: true,
      provider: this.name,
      task: opts.task,
      output,
      tokens: 0,
      cost_usd: 0.01 * count,
      latency_ms: 1200,
    };
  }
}

export class GptImageProvider extends BaseImageProvider {
  readonly name = "gpt-image";
}

export class HiggsfieldProvider extends BaseImageProvider {
  readonly name = "higgsfield";
}

export class TopviewProvider extends BaseImageProvider {
  readonly name = "topview";
}

export class WavespeedProvider extends BaseImageProvider {
  readonly name = "wavespeed";
}

const IMAGE_REGISTRY: Record<string, () => ImageProvider> = {
  "gpt-image": () => new GptImageProvider(),
  higgsfield: () => new HiggsfieldProvider(),
  topview: () => new TopviewProvider(),
  wavespeed: () => new WavespeedProvider(),
};

const IMAGE_TASK_DEFAULTS: Record<ImageTask, string> = {
  "quote-card": "gpt-image",
  "ugc-ad": "topview",
  cinematic: "higgsfield",
  carousel: "gpt-image",
  "batch-ab": "wavespeed",
  inpaint: "gpt-image",
  "face-swap": "topview",
  "before-after": "gpt-image",
};

export interface ImageFactoryOptions {
  override?: string;
}

export function getImageProvider(
  task: ImageTask,
  opts?: ImageFactoryOptions,
): ImageProvider {
  const override = opts?.override;
  const candidate = override ?? IMAGE_TASK_DEFAULTS[task] ?? "gpt-image";
  const factory = IMAGE_REGISTRY[candidate] ?? IMAGE_REGISTRY["gpt-image"];
  if (!factory) {
    return new GptImageProvider();
  }
  return factory();
}
