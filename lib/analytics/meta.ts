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
      reach: ((seed * 137) % 50000) * mult,
      engagement: ((seed * 53) % 4000) * mult,
      saves: ((seed * 17) % 800) * mult,
      profile_visits: ((seed * 29) % 1500) * mult,
      window,
    };
  }
  const token = process.env.META_ACCESS_TOKEN;
  const objectId = process.env.META_PAGE_ID;
  if (!token || !objectId) {
    throw new Error(
      "meta: META_ACCESS_TOKEN and META_PAGE_ID required for live analytics",
    );
  }
  const metrics = ["impressions", "reach", "saved", "profile_visits"];
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${objectId}/insights?metric=${metrics.join(",")}&access_token=${token}`,
  );
  if (!res.ok) {
    throw new Error(`meta: HTTP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
  };
  function val(name: string): number {
    const row = data.data?.find((d) => d.name === name);
    return row?.values?.[0]?.value ?? 0;
  }
  return {
    reach: val("reach"),
    engagement: val("impressions"),
    saves: val("saved"),
    profile_visits: val("profile_visits"),
    window,
  };
}
