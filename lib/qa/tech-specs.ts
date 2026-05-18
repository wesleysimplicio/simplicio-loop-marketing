import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";

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

const SPECS: Record<Platform, PlatformSpec> = {
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

function gcd(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  if (b === 0) return a;
  return gcd(b, a % b);
}

function aspectFromDims(w: number, h: number): string {
  const g = gcd(w, h) || 1;
  return `${w / g}:${h / g}`;
}

function probeMedia(path: string): AssetMetadata {
  if (!existsSync(path)) {
    throw new Error(`asset not found: ${path}`);
  }
  const sizeMb = statSync(path).size / 1024 / 1024;
  // Try ffprobe for video / identify for image; if unavailable, fall back to filename heuristic.
  const ffprobe = spawnSync("ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    path,
  ]);
  if (ffprobe.status === 0 && ffprobe.stdout) {
    try {
      const data = JSON.parse(ffprobe.stdout.toString()) as {
        streams?: Array<{ width?: number; height?: number; codec_name?: string }>;
        format?: { duration?: string };
      };
      const stream = data.streams?.find((s) => s.width && s.height);
      const w = stream?.width ?? 0;
      const h = stream?.height ?? 0;
      const duration = data.format?.duration ? Number(data.format.duration) : undefined;
      return {
        width: w,
        height: h,
        aspect: w && h ? aspectFromDims(w, h) : "?",
        duration_s: duration,
        file_size_mb: sizeMb,
        codec: stream?.codec_name,
      };
    } catch {
      // fall through
    }
  }
  const identify = spawnSync("identify", ["-format", "%w %h", path]);
  if (identify.status === 0 && identify.stdout) {
    const parts = identify.stdout.toString().trim().split(/\s+/);
    const w = Number(parts[0]);
    const h = Number(parts[1]);
    return {
      width: w,
      height: h,
      aspect: w && h ? aspectFromDims(w, h) : "?",
      file_size_mb: sizeMb,
    };
  }
  // Heuristic fallback from filename like 1080x1920
  const match = /(\d+)x(\d+)/.exec(path);
  if (match) {
    const w = Number(match[1]);
    const h = Number(match[2]);
    return {
      width: w,
      height: h,
      aspect: aspectFromDims(w, h),
      file_size_mb: sizeMb,
    };
  }
  return {
    width: 0,
    height: 0,
    aspect: "?",
    file_size_mb: sizeMb,
  };
}

export function validate(
  assetPath: string,
  targetPlatforms: Platform[],
): TechSpecsReport {
  const metadata = probeMedia(assetPath);
  const per_platform: Record<string, PerPlatformResult> = {};
  let overallPass = true;
  for (const p of targetPlatforms) {
    const spec = SPECS[p];
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
    per_platform[p] = {
      pass,
      violations,
      fixes: violations.map((v) => `fix ${v.rule}: expected ${v.expected}, got ${v.actual}`),
    };
  }
  return { pass: overallPass, per_platform, metadata };
}
