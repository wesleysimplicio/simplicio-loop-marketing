import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { GenerationResult } from "../types";
import type { VideoGenerateOptions, VideoProvider } from "../video";

function aspectToDims(aspect: string): { width: number; height: number } {
  switch (aspect) {
    case "16:9":
      return { width: 1920, height: 1080 };
    case "1:1":
      return { width: 1080, height: 1080 };
    default:
      return { width: 1080, height: 1920 };
  }
}

abstract class BaseMockVideo implements VideoProvider {
  abstract readonly name: string;

  async generate(
    brief: string,
    opts: VideoGenerateOptions,
  ): Promise<GenerationResult<string | string[]>> {
    const ts = Date.now();
    const outputDir = opts.output_dir ?? resolve(process.cwd(), "outputs");
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    const { width, height } = aspectToDims(opts.aspect);
    const output = resolve(outputDir, `mock-${this.name}-${width}x${height}-${ts}.mp4`);
    writeFileSync(output, `mock video ${brief}`);
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

export class MockHiggsfieldVideoProvider extends BaseMockVideo {
  readonly name = "higgsfield";
}
export class MockTopviewVideoProvider extends BaseMockVideo {
  readonly name = "topview";
}
export class MockWavespeedVideoProvider extends BaseMockVideo {
  readonly name = "wavespeed";
}
export class MockHyperframesVideoProvider extends BaseMockVideo {
  readonly name = "hyperframes";
}

export const MOCK_VIDEO_REGISTRY: Record<string, () => VideoProvider> = {
  higgsfield: () => new MockHiggsfieldVideoProvider(),
  topview: () => new MockTopviewVideoProvider(),
  wavespeed: () => new MockWavespeedVideoProvider(),
  hyperframes: () => new MockHyperframesVideoProvider(),
};
