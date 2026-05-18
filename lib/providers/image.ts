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
  model?: "flux-schnell" | "sdxl-turbo";
  count_per_variant?: number;
  cost_cap_usd?: number;
  variant_axis?: {
    field: string;
    values: string[];
  };
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

function sanitizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "variant";
}

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`asset download failed: HTTP ${res.status}`);
  }
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

interface VariantPrompt {
  prompt: string;
  label: string;
  seed?: number;
}

function expandVariantPrompts(
  brief: string,
  opts: Pick<ImageGenerateOptions, "variant_axis" | "seed">,
): VariantPrompt[] {
  const axis = opts.variant_axis;
  if (!axis || axis.values.length === 0) {
    return [{ prompt: brief, label: "base", seed: opts.seed }];
  }
  const placeholder = new RegExp(`\\{\\s*${axis.field}\\s*\\}`, "g");
  if (!placeholder.test(brief)) {
    throw new Error(
      `wavespeed batch: missing placeholder { ${axis.field} } in prompt`,
    );
  }
  placeholder.lastIndex = 0;
  return axis.values.map((value, index) => ({
    prompt: brief.replace(placeholder, value),
    label: sanitizeLabel(value),
    seed: opts.seed === undefined ? undefined : opts.seed + index,
  }));
}

async function runLimited<T, U>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<U>,
): Promise<U[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 5);
  const results: U[] = new Array(items.length);
  let next = 0;
  async function loop(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(safeLimit, items.length) }, () => loop()),
  );
  return results;
}

const WAVESPEED_IMAGE_PRICING: Record<string, number> = {
  "flux-schnell": 0.003,
  "sdxl-turbo": 0.004,
};

function resolveWavespeedImageModel(
  opts: Pick<ImageGenerateOptions, "task" | "model">,
): "flux-schnell" | "sdxl-turbo" {
  if (opts.model === "sdxl-turbo") return "sdxl-turbo";
  return "flux-schnell";
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
    const model = resolveWavespeedImageModel(opts);
    const outputDir = opts.output_dir ?? resolve(process.cwd(), "outputs");
    ensureDir(outputDir);
    const variants = expandVariantPrompts(brief, opts);
    const count = opts.task === "batch-ab"
      ? opts.count_per_variant ?? opts.n ?? 1
      : opts.n ?? 1;
    const pricePerOutput = WAVESPEED_IMAGE_PRICING[model] ?? 0;
    const runnable: VariantPrompt[] = [];
    let estimatedCost = 0;
    for (const variant of variants) {
      const nextCost = pricePerOutput * count;
      if (
        opts.cost_cap_usd !== undefined &&
        runnable.length > 0 &&
        estimatedCost + nextCost > opts.cost_cap_usd
      ) {
        break;
      }
      estimatedCost += nextCost;
      runnable.push(variant);
    }
    const batches = await runLimited(runnable, 5, async (variant, index) => {
      const res = await fetch("https://api.wavespeed.ai/api/v3/predictions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: {
            prompt: variant.prompt,
            num_outputs: count,
            aspect_ratio: opts.aspect,
            seed: variant.seed,
          },
        }),
      });
      if (!res.ok) {
        throw new Error(`wavespeed: HTTP ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as { output?: string[] };
      const urls = data.output ?? [];
      const ts = Date.now();
      const paths: string[] = [];
      for (let i = 0; i < urls.length; i++) {
        const dest = resolve(
          outputDir,
          `wavespeed-${model}-${variant.label}-${index + 1}-${ts}-${i + 1}.png`,
        );
        await downloadToFile(urls[i], dest);
        paths.push(dest);
      }
      return paths;
    });
    const paths = batches.flat();
    return {
      ok: true,
      provider: this.name,
      task: opts.task,
      output: paths,
      tokens: 0,
      cost_usd: estimatedCost,
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
