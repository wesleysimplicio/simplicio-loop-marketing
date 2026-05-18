import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { GenerationResult } from "../types";
import type { ImageGenerateOptions, ImageProvider } from "../image";

function aspectToDims(aspect: string): { width: number; height: number } {
  switch (aspect) {
    case "9:16":
      return { width: 1080, height: 1920 };
    case "16:9":
      return { width: 1920, height: 1080 };
    case "4:5":
      return { width: 1080, height: 1350 };
    default:
      return { width: 1080, height: 1080 };
  }
}

abstract class BaseMockImage implements ImageProvider {
  abstract readonly name: string;

  async generate(
    brief: string,
    opts: ImageGenerateOptions,
  ): Promise<GenerationResult<string[]>> {
    const count = opts.n ?? 1;
    const ts = Date.now();
    const outputDir = opts.output_dir ?? resolve(process.cwd(), "outputs");
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    const { width, height } = aspectToDims(opts.aspect);
    const output: string[] = [];
    for (let i = 1; i <= count; i++) {
      const path = resolve(
        outputDir,
        `mock-${this.name}-${width}x${height}-${ts}-${i}.png`,
      );
      writeFileSync(path, `mock image ${brief}`);
      output.push(path);
    }
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
