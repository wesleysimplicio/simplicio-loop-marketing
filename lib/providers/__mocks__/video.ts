import type { GenerationResult } from "../types";
import type { VideoGenerateOptions, VideoProvider } from "../video";

abstract class BaseMockVideo implements VideoProvider {
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

export class MockHiggsfieldVideoProvider extends BaseMockVideo {
  readonly name = "higgsfield";
}
export class MockTopviewVideoProvider extends BaseMockVideo {
  readonly name = "topview";
}
export class MockWavespeedVideoProvider extends BaseMockVideo {
  readonly name = "wavespeed";
}

export const MOCK_VIDEO_REGISTRY: Record<string, () => VideoProvider> = {
  higgsfield: () => new MockHiggsfieldVideoProvider(),
  topview: () => new MockTopviewVideoProvider(),
  wavespeed: () => new MockWavespeedVideoProvider(),
};
