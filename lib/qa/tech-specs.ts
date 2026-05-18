import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";

export type Platform =
  | "ig_feed"
  | "ig_reel"
  | "ig_story"
  | "ig_carousel"
  | "tiktok"
  | "yt_shorts"
  | "yt_long"
  | "fb_feed"
  | "fb_reels"
  | "linkedin";

interface PlatformSpec {
  aspect: string[];
  max_duration_s?: number;
  max_file_size_mb?: number;
  min_width: number;
  min_height: number;
}

const DEFAULT_SPECS: Record<Platform, PlatformSpec> = {
  ig_feed: { aspect: ["1:1", "4:5"], min_width: 1080, min_height: 1080, max_file_size_mb: 100 },
  ig_reel: { aspect: ["9:16"], min_width: 1080, min_height: 1920, max_duration_s: 90, max_file_size_mb: 250 },
  ig_story: { aspect: ["9:16"], min_width: 1080, min_height: 1920, max_duration_s: 60 },
  ig_carousel: { aspect: ["1:1", "4:5"], min_width: 1080, min_height: 1080 },
  tiktok: { aspect: ["9:16"], min_width: 1080, min_height: 1920, max_duration_s: 600 },
  yt_shorts: { aspect: ["9:16"], min_width: 1080, min_height: 1920, max_duration_s: 60 },
  yt_long: { aspect: ["16:9"], min_width: 1920, min_height: 1080 },
  fb_feed: { aspect: ["1:1", "4:5", "16:9"], min_width: 1080, min_height: 1080 },
  fb_reels: { aspect: ["9:16"], min_width: 1080, min_height: 1920, max_duration_s: 90 },
  linkedin: { aspect: ["1:1", "16:9", "4:5"], min_width: 1080, min_height: 1080 },
};

export interface AssetMetadata {
  width: number;
  height: number;
  aspect: string;
  duration_s?: number;
  file_size_mb: number;
  codec?: string;
  format?: string;
  container?: string;
  probe_warnings?: string[];
}

export interface Violation {
  rule: string;
  expected: string;
  actual: string;
  severity: "hard" | "soft";
}

export interface PerPlatformResult {
  pass: boolean;
  violations: Violation[];
  fixes: string[];
}

export interface TechSpecsReport {
  pass: boolean;
  per_platform: Record<string, PerPlatformResult>;
  metadata: AssetMetadata;
}

type AssetKind = "image" | "video";

interface ProbeOutcome {
  metadata: AssetMetadata;
  skip_validation: boolean;
}

const CHANNEL_DOC_PLATFORM_MAP: Record<Platform, string> = {
  ig_feed: "ig_carousel",
  ig_reel: "ig_reels",
  ig_story: "ig_stories",
  ig_carousel: "ig_carousel",
  tiktok: "tiktok",
  yt_shorts: "yt_shorts",
  yt_long: "linkedin_post",
  fb_feed: "fb_feed",
  fb_reels: "fb_reels",
  linkedin: "linkedin_post",
};

let cachedSpecsPath: string | null = null;
let cachedSpecs: Record<Platform, PlatformSpec> | null = null;

function gcd(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  if (b === 0) return a;
  return gcd(b, a % b);
}

function aspectFromDims(w: number, h: number): string {
  const g = gcd(w, h) || 1;
  return `${w / g}:${h / g}`;
}

function assetKindFor(path: string): AssetKind {
  const ext = extname(path).toLowerCase();
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) {
    return "video";
  }
  return "image";
}

function parseDimensionPair(raw: string): { width: number; height: number } | null {
  const matches = Array.from(raw.matchAll(/(\d+)\s*[xX]\s*(\d+)/g));
  if (matches.length === 0) return null;
  const pairs = matches
    .map((match) => ({
      width: Number(match[1]),
      height: Number(match[2]),
    }))
    .filter((pair) => pair.width > 0 && pair.height > 0);
  if (pairs.length === 0) return null;
  const width = Math.min(...pairs.map((pair) => pair.width));
  const height = Math.min(...pairs.map((pair) => pair.height));
  return { width, height };
}

function extractSeconds(raw?: string): number | undefined {
  if (!raw) return undefined;
  const match = /(\d+(?:\.\d+)?)\s*s?/.exec(raw);
  if (!match) return undefined;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? seconds : undefined;
}

function extractAspectList(raw?: string): string[] | undefined {
  if (!raw) return undefined;
  const values = Array.from(raw.matchAll(/\d+\s*:\s*\d+/g)).map((m) =>
    m[0].replace(/\s+/g, ""),
  );
  return values.length > 0 ? values : undefined;
}

function readChannelsMarkdown(path?: string): string | null {
  const target = resolve(path ?? process.cwd(), ".specs", "product", "CHANNELS.md");
  if (!existsSync(target)) return null;
  return readFileSync(target, "utf8");
}

function parseChannelsSpecs(markdown: string): Partial<Record<Platform, Partial<PlatformSpec>>> {
  const docById: Record<string, Partial<PlatformSpec>> = {};
  const headingRe = /^###\s+`([^`]+)`/;
  const rowRe = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/;
  let activeId: string | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = headingRe.exec(line.trim());
    if (heading) {
      activeId = heading[1];
      docById[activeId] = docById[activeId] ?? {};
      continue;
    }
    if (!activeId || !line.trim().startsWith("|")) continue;
    const row = rowRe.exec(line.trim());
    if (!row) continue;
    const field = row[1].trim().toLowerCase();
    const value = row[2].trim();
    const dims = parseDimensionPair(value);
    const duration = extractSeconds(value);
    const aspect = extractAspectList(value);
    const spec = docById[activeId] ?? {};

    if (
      field.includes("aspect") ||
      field.includes("image aspect") ||
      field.includes("video")
    ) {
      if (aspect && aspect.length > 0) {
        const merged = new Set([...(spec.aspect ?? []), ...aspect]);
        spec.aspect = Array.from(merged);
      }
    }
    if (field.includes("resolution") && dims) {
      spec.min_width = dims.width;
      spec.min_height = dims.height;
    }
    if ((field.includes("max duration") || field.includes("max video duration")) && duration) {
      spec.max_duration_s = duration;
    }
    if (field.includes("file size")) {
      const sizeMatch = /(\d+(?:\.\d+)?)\s*MB/i.exec(value);
      if (sizeMatch) {
        spec.max_file_size_mb = Number(sizeMatch[1]);
      }
    }
    docById[activeId] = spec;
  }

  const out: Partial<Record<Platform, Partial<PlatformSpec>>> = {};
  for (const [platform, docId] of Object.entries(CHANNEL_DOC_PLATFORM_MAP) as Array<[Platform, string]>) {
    const spec = docById[docId];
    if (spec) out[platform] = spec;
  }
  return out;
}

function loadSpecs(channelsPath?: string): Record<Platform, PlatformSpec> {
  const resolvedPath = resolve(channelsPath ?? process.cwd(), ".specs", "product", "CHANNELS.md");
  if (cachedSpecs && cachedSpecsPath === resolvedPath) {
    return cachedSpecs;
  }

  const markdown = readChannelsMarkdown(channelsPath);
  const parsed = markdown ? parseChannelsSpecs(markdown) : {};
  cachedSpecs = Object.fromEntries(
    (Object.entries(DEFAULT_SPECS) as Array<[Platform, PlatformSpec]>).map(([platform, spec]) => [
      platform,
      {
        ...spec,
        ...(parsed[platform] ?? {}),
      },
    ]),
  ) as Record<Platform, PlatformSpec>;
  cachedSpecsPath = resolvedPath;
  return cachedSpecs;
}

function parseImageMagickSize(raw: string): number | undefined {
  const match = /(\d+(?:\.\d+)?)([KMG]?B)/i.exec(raw);
  if (!match) return undefined;
  const value = Number(match[1]);
  const unit = match[2].toUpperCase();
  if (!Number.isFinite(value)) return undefined;
  if (unit === "GB") return value * 1024;
  if (unit === "MB") return value;
  if (unit === "KB") return value / 1024;
  return value / 1024 / 1024;
}

function heuristicMetadata(path: string, sizeMb: number): AssetMetadata | null {
  const match = /(\d+)x(\d+)/.exec(path);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return {
    width,
    height,
    aspect: aspectFromDims(width, height),
    file_size_mb: sizeMb,
  };
}

function probeMedia(path: string): ProbeOutcome {
  if (!existsSync(path)) {
    throw new Error(`asset not found: ${path}`);
  }
  const sizeMb = statSync(path).size / 1024 / 1024;
  const kind = assetKindFor(path);
  const warnings: string[] = [];

  if (kind === "video") {
    const ffprobe = spawnSync(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", path],
      { encoding: "utf8" },
    );
    if (ffprobe.status === 0 && ffprobe.stdout) {
      try {
        const data = JSON.parse(ffprobe.stdout) as {
          streams?: Array<{ width?: number; height?: number; codec_name?: string }>;
          format?: { duration?: string; format_name?: string };
        };
        const stream = data.streams?.find((s) => s.width && s.height);
        const width = stream?.width ?? 0;
        const height = stream?.height ?? 0;
        return {
          metadata: {
            width,
            height,
            aspect: width && height ? aspectFromDims(width, height) : "?",
            duration_s: data.format?.duration ? Number(data.format.duration) : undefined,
            file_size_mb: sizeMb,
            codec: stream?.codec_name,
            container: data.format?.format_name,
            probe_warnings: warnings,
          },
          skip_validation: false,
        };
      } catch {
        warnings.push("ffprobe returned unreadable JSON; using fallback metadata");
      }
    } else if ((ffprobe.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      warnings.push("ffprobe missing; install with `brew install ffmpeg`");
    }
  } else {
    const identify = spawnSync("identify", ["-format", "%w %h %m %b", path], {
      encoding: "utf8",
    });
    if (identify.status === 0 && identify.stdout) {
      const parts = identify.stdout.trim().split(/\s+/);
      const width = Number(parts[0] ?? 0);
      const height = Number(parts[1] ?? 0);
      const format = parts[2]?.toLowerCase();
      return {
        metadata: {
          width,
          height,
          aspect: width && height ? aspectFromDims(width, height) : "?",
          file_size_mb: parseImageMagickSize(parts[3] ?? "") ?? sizeMb,
          format,
          probe_warnings: warnings,
        },
        skip_validation: false,
      };
    } else if ((identify.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      warnings.push("identify missing; install with `brew install imagemagick`");
    }
  }

  const heuristic = heuristicMetadata(path, sizeMb);
  if (heuristic) {
    return {
      metadata: {
        ...heuristic,
        probe_warnings: warnings,
      },
      skip_validation: false,
    };
  }

  return {
    metadata: {
      width: 0,
      height: 0,
      aspect: "?",
      file_size_mb: sizeMb,
      probe_warnings: warnings,
    },
    skip_validation: warnings.length > 0,
  };
}

export function validate(
  assetPath: string,
  targetPlatforms: Platform[],
  opts?: { channelsPath?: string },
): TechSpecsReport {
  const { metadata, skip_validation } = probeMedia(assetPath);
  const specs = loadSpecs(opts?.channelsPath);
  const per_platform: Record<string, PerPlatformResult> = {};
  if (skip_validation) {
    const fixes =
      metadata.probe_warnings && metadata.probe_warnings.length > 0
        ? metadata.probe_warnings
        : ["validation skipped: insufficient metadata"];
    for (const platform of targetPlatforms) {
      per_platform[platform] = {
        pass: true,
        violations: [],
        fixes,
      };
    }
    return { pass: true, per_platform, metadata };
  }
  let overallPass = true;
  for (const p of targetPlatforms) {
    const spec = specs[p];
    if (!spec) {
      per_platform[p] = {
        pass: true,
        violations: [],
        fixes: [`no spec for platform ${p} — skipped`],
      };
      continue;
    }
    const violations: Violation[] = [];
    if (!spec.aspect.includes(metadata.aspect)) {
      violations.push({
        rule: "aspect_mismatch",
        expected: spec.aspect.join(" or "),
        actual: metadata.aspect,
        severity: "hard",
      });
    }
    if (metadata.width && metadata.width < spec.min_width) {
      violations.push({
        rule: "min_width",
        expected: String(spec.min_width),
        actual: String(metadata.width),
        severity: "hard",
      });
    }
    if (metadata.height && metadata.height < spec.min_height) {
      violations.push({
        rule: "min_height",
        expected: String(spec.min_height),
        actual: String(metadata.height),
        severity: "hard",
      });
    }
    if (
      metadata.duration_s !== undefined &&
      spec.max_duration_s !== undefined &&
      metadata.duration_s > spec.max_duration_s
    ) {
      violations.push({
        rule: "duration_exceeds",
        expected: `<= ${spec.max_duration_s}s`,
        actual: `${metadata.duration_s.toFixed(1)}s`,
        severity: "hard",
      });
    }
    if (spec.max_file_size_mb && metadata.file_size_mb > spec.max_file_size_mb) {
      violations.push({
        rule: "file_size_exceeds",
        expected: `<= ${spec.max_file_size_mb} MB`,
        actual: `${metadata.file_size_mb.toFixed(1)} MB`,
        severity: "hard",
      });
    }
    const pass = !violations.some((v) => v.severity === "hard");
    if (!pass) overallPass = false;
    const fixes = violations.map((v) => `fix ${v.rule}: expected ${v.expected}, got ${v.actual}`);
    if (metadata.probe_warnings?.length) {
      fixes.push(...metadata.probe_warnings);
    }
    per_platform[p] = {
      pass,
      violations,
      fixes,
    };
  }
  return { pass: overallPass, per_platform, metadata };
}
