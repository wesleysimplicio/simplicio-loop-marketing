import type { GenerationResult } from "../types";
import type { ImageGenerateOptions, ImageProvider } from "../image";

abstract class BaseMockImage implements ImageProvider {
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

export class MockGptImageProvider extends BaseMockImage {
  readonly name = "gpt-image";
}
export class MockHiggsfieldImageProvider extends BaseMockImage {
  readonly name = "higgsfield";
}
export class MockTopviewImageProvider extends BaseMockImage {
  readonly name = "topview";
}
export class MockWavespeedImageProvider extends BaseMockImage {
  readonly name = "wavespeed";
}

export const MOCK_IMAGE_REGISTRY: Record<string, () => ImageProvider> = {
  "gpt-image": () => new MockGptImageProvider(),
  higgsfield: () => new MockHiggsfieldImageProvider(),
  topview: () => new MockTopviewImageProvider(),
  wavespeed: () => new MockWavespeedImageProvider(),
};
