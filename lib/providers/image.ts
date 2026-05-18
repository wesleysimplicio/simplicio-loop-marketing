import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { GenerationResult, ImageTask } from "./types";
import { imageRow, loadProviderMatrix } from "./matrix";
import { MOCK_IMAGE_REGISTRY } from "./__mocks__/image";
import { withRetry } from "./policy";

export interface ImageGenerateOptions {
  task: ImageTask;
  aspect: string;
  n?: number;
  output_dir?: string;
  transparent?: boolean;
  seed?: number;
}

export interface ImageProvider {
  name: string;
  generate(
    brief: string,
    opts: ImageGenerateOptions,
  ): Promise<GenerationResult<string[]>>;
}

function isDryRun(): boolean {
  const v = process.env.DRY_RUN;
  return v === undefined || v === "" || v === "true";
}

function aspectToSize(aspect: string): string {
  switch (aspect) {
    case "1:1":
      return "1024x1024";
    case "9:16":
      return "1024x1536";
    case "16:9":
      return "1536x1024";
    case "4:5":
      return "1024x1280";
    default:
      return "1024x1024";
  }
}

abstract class RealImageBase implements ImageProvider {
  abstract readonly name: string;
  abstract realGenerate(
    brief: string,
    opts: ImageGenerateOptions,
  ): Promise<GenerationResult<string[]>>;

  async generate(
    brief: string,
    opts: ImageGenerateOptions,
  ): Promise<GenerationResult<string[]>> {
    return withRetry(() => this.realGenerate(brief, opts), {
      retries: 1,
      backoffMs: 2000,
      timeoutMs: 120_000,
    });
  }
}

export class GptImageProvider extends RealImageBase {
  readonly name = "gpt-image";
  async realGenerate(
    brief: string,
    opts: ImageGenerateOptions,
  ): Promise<GenerationResult<string[]>> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("gpt-image: OPENAI_API_KEY missing");
    const t0 = Date.now();
    const count = opts.n ?? 1;
    const size = aspectToSize(opts.aspect);
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: brief,
        size,
        n: count,
        background: opts.transparent ? "transparent" : "opaque",
        response_format: "b64_json",
      }),
    });
    if (!res.ok) {
      throw new Error(`gpt-image: HTTP ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const outputDir = opts.output_dir ?? resolve(process.cwd(), "outputs");
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const ts = Date.now();
    const paths: string[] = [];
    for (let i = 0; i < (data.data?.length ?? 0); i++) {
      const item = data.data?.[i];
      if (!item) continue;
      const dest = resolve(outputDir, `gpt-image-${ts}-${i + 1}.png`);
      if (item.b64_json) {
        writeFileSync(dest, Buffer.from(item.b64_json, "base64"));
      } else if (item.url) {
        const imgRes = await fetch(item.url);
        writeFileSync(dest, Buffer.from(await imgRes.arrayBuffer()));
      }
      paths.push(dest);
    }
    return {
      ok: true,
      provider: this.name,
      task: opts.task,
      output: paths,
      tokens: 0,
      cost_usd: 0.04 * count,
      latency_ms: Date.now() - t0,
    };
  }
}

export class HiggsfieldProvider extends RealImageBase {
  readonly name = "higgsfield";
  async realGenerate(
    _brief: string,
    _opts: ImageGenerateOptions,
  ): Promise<GenerationResult<string[]>> {
    if (process.env.HIGGSFIELD_MCP_ACTIVE !== "true") {
      throw new Error("higgsfield: HIGGSFIELD_MCP_ACTIVE not true; MCP unavailable");
    }
    throw new Error(
      "higgsfield: image generation requires MCP transport in caller context; " +
        "this adapter is a stub. Use DRY_RUN=true for tests.",
    );
  }
}

export class TopviewProvider extends RealImageBase {
  readonly name = "topview";
  async realGenerate(
    _brief: string,
    _opts: ImageGenerateOptions,
  ): Promise<GenerationResult<string[]>> {
    const apiKey = process.env.TOPVIEW_API_KEY;
    if (!apiKey) throw new Error("topview: TOPVIEW_API_KEY missing");
    throw new Error(
      "topview: image generation requires MCP transport; this adapter is a stub. " +
        "Use DRY_RUN=true for tests.",
    );
  }
}

export class WavespeedProvider extends RealImageBase {
  readonly name = "wavespeed";
  async realGenerate(
    brief: string,
    opts: ImageGenerateOptions,
  ): Promise<GenerationResult<string[]>> {
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) throw new Error("wavespeed: WAVESPEED_API_KEY missing");
    const t0 = Date.now();
    const count = opts.n ?? 1;
    const res = await fetch("https://api.wavespeed.ai/api/v3/predictions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "flux-schnell",
        input: { prompt: brief, num_outputs: count, aspect_ratio: opts.aspect },
      }),
    });
    if (!res.ok) {
      throw new Error(`wavespeed: HTTP ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { output?: string[] };
    const urls = data.output ?? [];
    const outputDir = opts.output_dir ?? resolve(process.cwd(), "outputs");
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    const ts = Date.now();
    const paths: string[] = [];
    for (let i = 0; i < urls.length; i++) {
      const dest = resolve(outputDir, `wavespeed-${ts}-${i + 1}.png`);
      const imgRes = await fetch(urls[i]);
      writeFileSync(dest, Buffer.from(await imgRes.arrayBuffer()));
      paths.push(dest);
    }
    return {
      ok: true,
      provider: this.name,
      task: opts.task,
      output: paths,
      tokens: 0,
      cost_usd: 0.003 * count,
      latency_ms: Date.now() - t0,
    };
  }
}

void dirname;

const REAL_IMAGE_REGISTRY: Record<string, () => ImageProvider> = {
  "gpt-image": () => new GptImageProvider(),
  higgsfield: () => new HiggsfieldProvider(),
  topview: () => new TopviewProvider(),
  wavespeed: () => new WavespeedProvider(),
};

export interface ImageFactoryOptions {
  override?: string;
}

export function getImageProvider(
  task: ImageTask,
  opts?: ImageFactoryOptions,
): ImageProvider {
  const override = opts?.override;
  const fromMatrix = imageRow(task, loadProviderMatrix()).default;
  const candidate = override ?? fromMatrix ?? "gpt-image";
  const registry = isDryRun() ? MOCK_IMAGE_REGISTRY : REAL_IMAGE_REGISTRY;
  const factory = registry[candidate] ?? registry["gpt-image"];
  if (!factory) {
    return (isDryRun() ? MOCK_IMAGE_REGISTRY : REAL_IMAGE_REGISTRY)["gpt-image"]();
  }
  return factory();
}

export function getImageProviderByName(name: string): ImageProvider {
  const registry = isDryRun() ? MOCK_IMAGE_REGISTRY : REAL_IMAGE_REGISTRY;
  const factory = registry[name] ?? registry["gpt-image"];
  return factory();
}
