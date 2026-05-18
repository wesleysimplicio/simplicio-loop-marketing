import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

export interface ProviderDescriptor {
  name: string;
  version?: string;
}

export interface ManifestPayload {
  piece_id: string;
  client: string;
  date: string;
  providers: {
    llm?: string | ProviderDescriptor;
    image?: string | ProviderDescriptor;
    video?: string | ProviderDescriptor;
  };
  prompts: {
    script?: string;
    caption?: string;
    image?: string;
    video?: string;
  };
  seeds?: {
    image?: number;
    video?: number;
  };
  cost_estimate_usd: number;
  tokens_in?: number;
  tokens_out?: number;
  compliance_report_path: string;
  qa_report_path?: string;
  outputs?: string[];
  fallback_used?: boolean;
}

export interface ManifestDocument extends Omit<ManifestPayload, "providers"> {
  generated_at: string;
  providers: {
    llm?: ProviderDescriptor;
    image?: ProviderDescriptor;
    video?: ProviderDescriptor;
  };
}

function normalizeProvider(
  provider?: string | ProviderDescriptor,
): ProviderDescriptor | undefined {
  if (!provider) {
    return undefined;
  }

  if (typeof provider === "string") {
    return { name: provider };
  }

  return provider;
}

function manifestPath(target: string): string {
  return target.endsWith(".json") ? target : join(target, "manifest.json");
}

function normalizeStoredPath(path?: string): string | undefined {
  return path ? path.replace(/\\/g, "/") : undefined;
}

export function writeManifest(
  target: string,
  payload: ManifestPayload,
): ManifestDocument {
  const path = manifestPath(target);
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const document: ManifestDocument = {
    generated_at: new Date().toISOString(),
    piece_id: payload.piece_id,
    client: payload.client,
    date: payload.date,
    providers: {
      llm: normalizeProvider(payload.providers.llm),
      image: normalizeProvider(payload.providers.image),
      video: normalizeProvider(payload.providers.video),
    },
    prompts: payload.prompts,
    seeds: payload.seeds,
    cost_estimate_usd: payload.cost_estimate_usd,
    tokens_in: payload.tokens_in ?? 0,
    tokens_out: payload.tokens_out ?? 0,
    compliance_report_path: normalizeStoredPath(payload.compliance_report_path) ?? "",
    qa_report_path: normalizeStoredPath(payload.qa_report_path),
    outputs: (payload.outputs ?? []).map((output) => normalize(output)),
    fallback_used: payload.fallback_used ?? false,
  };

  writeFileSync(path, JSON.stringify(document, null, 2));
  return document;
}
