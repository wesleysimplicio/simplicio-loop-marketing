export type MetricsWindow = "24h" | "48h" | "7d";

export interface MetricsResult {
  reach: number;
  engagement: number;
  saves: number;
  profile_visits: number;
  window: string;
}

function isDryRun(): boolean {
  const v = process.env.DRY_RUN;
  return v === undefined || v === "" || v === "true";
}

function seedFromId(piece_id: string): number {
  let sum = 0;
  for (let i = 0; i < piece_id.length; i++) {
    sum += piece_id.charCodeAt(i);
  }
  return sum;
}

function windowMultiplier(window: MetricsWindow): number {
  if (window === "24h") return 1;
  if (window === "48h") return 2;
  return 7;
}

export async function fetchMetrics(
  piece_id: string,
  window: MetricsWindow,
): Promise<MetricsResult> {
  if (isDryRun()) {
    const seed = seedFromId(piece_id);
    const mult = windowMultiplier(window);
    return {
      reach: ((seed * 211) % 80000) * mult,
      engagement: ((seed * 71) % 6000) * mult,
      saves: ((seed * 23) % 500) * mult,
      profile_visits: ((seed * 41) % 1200) * mult,
      window,
    };
  }
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("youtube: YOUTUBE_API_KEY required");
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${piece_id}&key=${apiKey}`,
  );
  if (!res.ok) {
    throw new Error(`youtube: HTTP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    items?: Array<{
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        favoriteCount?: string;
        commentCount?: string;
      };
    }>;
  };
  const s = data.items?.[0]?.statistics ?? {};
  return {
    reach: Number(s.viewCount ?? 0),
    engagement: Number(s.likeCount ?? 0) + Number(s.commentCount ?? 0),
    saves: Number(s.favoriteCount ?? 0),
    profile_visits: 0,
    window,
  };
}
