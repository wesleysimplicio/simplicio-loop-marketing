import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface RenderPieceTemplateOptions {
  id: string;
  client: string;
  date: string;
  status?: string;
  type: string;
  pillar: string;
  platforms: string[];
  campaign?: string | null;
  locale?: string;
  brief?: string;
  extraFrontmatter?: Record<string, string | string[] | null | undefined>;
}

const __filename = fileURLToPath(import.meta.url);
const PACKAGE_ROOT = resolve(dirname(__filename), "..", "..");
const BRIEF_PLACEHOLDER =
  "One paragraph. What is this piece, who is the audience, what is the single behavior we want from them, and how does it ladder up to the campaign goal. Reference the pillar and any prior piece this responds to.";
const SAFE_FRONTMATTER_KEY_RE = /^[A-Za-z0-9_]+$/;
const SAFE_BARE_STRING_RE = /^[A-Za-z0-9._:/-]+$/;

function serializeFrontmatterValue(value: string | string[] | null): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => JSON.stringify(entry)).join(", ")}]`;
  }
  if (value === null) {
    return "null";
  }

  return SAFE_BARE_STRING_RE.test(value) ? value : JSON.stringify(value);
}

function injectFrontmatter(
  template: string,
  extraFrontmatter: Record<string, string | string[] | null | undefined>,
): string {
  const match = /^(---\r?\n)([\s\S]*?)(\r?\n---)([\s\S]*)$/.exec(template);
  if (!match) return template;

  const lines = Object.entries(extraFrontmatter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      if (!SAFE_FRONTMATTER_KEY_RE.test(key)) {
        throw new Error(`piece template: invalid frontmatter key: ${key}`);
      }
      return `${key}: ${serializeFrontmatterValue(value ?? null)}`;
    });

  if (lines.length === 0) return template;

  const [, opening, frontmatterBody, closing, rest] = match;
  const separator = frontmatterBody.endsWith("\n") || frontmatterBody.length === 0 ? "" : "\n";
  return `${opening}${frontmatterBody}${separator}${lines.join("\n")}${closing}${rest}`;
}

export function pieceTemplatePath(): string {
  return resolve(PACKAGE_ROOT, ".specs", "pieces", "piece-template.md");
}

export function renderPieceTemplate(options: RenderPieceTemplateOptions): string {
  let template = readFileSync(pieceTemplatePath(), "utf8");

  template = template
    .replace("id: PIECE-XXX", `id: ${options.id}`)
    .replace("client: <client-id>", `client: ${options.client}`)
    .replace("campaign: <campaign-id>", `campaign: ${options.campaign ?? "null"}`)
    .replace("date: YYYY-MM-DD", `date: ${options.date}`)
    .replace("status: draft", `status: ${options.status ?? "draft"}`)
    .replace("type: reel", `type: ${options.type}`)
    .replace("pillar: <pillar-id from PILLARS>", `pillar: ${options.pillar}`)
    .replace(
      "platforms: [instagram, tiktok, youtube-shorts, facebook]",
      `platforms: ${serializeFrontmatterValue(options.platforms)}`,
    );

  if (options.locale) {
    template = template.replace("locale: pt-BR", `locale: ${options.locale}`);
  }

  if (options.brief) {
    template = template.replace(BRIEF_PLACEHOLDER, options.brief);
  }

  return injectFrontmatter(template, options.extraFrontmatter ?? {});
}
