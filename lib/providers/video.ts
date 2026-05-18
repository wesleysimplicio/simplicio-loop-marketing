import type { GenerationResult, VideoTask } from "./types";
import { loadProviderMatrix, videoRow } from "./matrix";
import { MOCK_VIDEO_REGISTRY } from "./__mocks__/video";
import { withRetry } from "./policy";

export interface VideoGenerateOptions {
  task: VideoTask;
  aspect: string;
  duration_s: number;
  output_dir?: string;
  seed?: number;
}

export interface VideoProvider {
  name: string;
  generate(
    brief: string,
    opts: VideoGenerateOptions,
  ): Promise<GenerationResult<string>>;
}

function isDryRun(): boolean {
  const v = process.env.DRY_RUN;
  return v === undefined || v === "" || v === "true";
}

abstract class RealVideoBase implements VideoProvider {
  abstract readonly name: string;
  abstract realGenerate(
    brief: string,
    opts: VideoGenerateOptions,
  ): Promise<GenerationResult<string>>;

  async generate(
    brief: string,
    opts: VideoGenerateOptions,
  ): Promise<GenerationResult<string>> {
    return withRetry(() => this.realGenerate(brief, opts), {
      retries: 1,
      backoffMs: 4000,
      timeoutMs: 5 * 60_000,
    });
  }
}

export class HiggsfieldVideoProvider extends RealVideoBase {
  readonly name = "higgsfield";
  async realGenerate(
    _brief: string,
    _opts: VideoGenerateOptions,
  ): Promise<GenerationResult<string>> {
    if (process.env.HIGGSFIELD_MCP_ACTIVE !== "true") {
      throw new Error("higgsfield: HIGGSFIELD_MCP_ACTIVE not true");
    }
    throw new Error(
      "higgsfield video: MCP transport required in caller context; stub. " +
        "Use DRY_RUN=true for tests.",
    );
  }
}

export class TopviewVideoProvider extends RealVideoBase {
  readonly name = "topview";
  async realGenerate(
    _brief: string,
    _opts: VideoGenerateOptions,
  ): Promise<GenerationResult<string>> {
    const apiKey = process.env.TOPVIEW_API_KEY;
    if (!apiKey) throw new Error("topview: TOPVIEW_API_KEY missing");
    throw new Error(
      "topview video: MCP transport required in caller context; stub. " +
        "Use DRY_RUN=true for tests.",
    );
  }
}

export class WavespeedVideoProvider extends RealVideoBase {
  readonly name = "wavespeed";
  async realGenerate(
    _brief: string,
    _opts: VideoGenerateOptions,
  ): Promise<GenerationResult<string>> {
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) throw new Error("wavespeed: WAVESPEED_API_KEY missing");
    throw new Error(
      "wavespeed video: real adapter requires WAN job polling; stub. " +
        "Use DRY_RUN=true for tests.",
    );
  }
}

const REAL_VIDEO_REGISTRY: Record<string, () => VideoProvider> = {
  higgsfield: () => new HiggsfieldVideoProvider(),
  topview: () => new TopviewVideoProvider(),
  wavespeed: () => new WavespeedVideoProvider(),
};

export interface VideoFactoryOptions {
  override?: string;
}

export function getVideoProvider(
  task: VideoTask,
  opts?: VideoFactoryOptions,
): VideoProvider {
  const override = opts?.override;
  const fromMatrix = videoRow(task, loadProviderMatrix()).default;
  const candidate = override ?? fromMatrix ?? "higgsfield";
  const registry = isDryRun() ? MOCK_VIDEO_REGISTRY : REAL_VIDEO_REGISTRY;
  const factory = registry[candidate] ?? registry["higgsfield"];
  if (!factory) {
    return (isDryRun() ? MOCK_VIDEO_REGISTRY : REAL_VIDEO_REGISTRY)["higgsfield"]();
  }
  return factory();
}

export function getVideoProviderByName(name: string): VideoProvider {
  const registry = isDryRun() ? MOCK_VIDEO_REGISTRY : REAL_VIDEO_REGISTRY;
  const factory = registry[name] ?? registry["higgsfield"];
  return factory();
}
