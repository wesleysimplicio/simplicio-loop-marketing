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
      reach: ((seed * 313) % 120000) * mult,
      engagement: ((seed * 89) % 9000) * mult,
      saves: ((seed * 31) % 1500) * mult,
      profile_visits: ((seed * 47) % 2200) * mult,
      window,
    };
  }
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) {
    throw new Error("tiktok: TIKTOK_ACCESS_TOKEN required");
  }
  const res = await fetch(
    `https://open.tiktokapis.com/v2/research/video/query/?fields=video_views,likes,shares,comments`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ filters: { video_ids: [piece_id] } }),
    },
  );
  if (!res.ok) {
    throw new Error(`tiktok: HTTP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    data?: { videos?: Array<{ video_views?: number; likes?: number; shares?: number }> };
  };
  const v = data.data?.videos?.[0] ?? {};
  return {
    reach: v.video_views ?? 0,
    engagement: (v.likes ?? 0) + (v.shares ?? 0),
    saves: 0,
    profile_visits: 0,
    window,
  };
}
