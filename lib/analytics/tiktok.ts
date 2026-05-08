export type MetricsWindow = "24h" | "48h" | "7d";

export interface MetricsResult {
  reach: number;
  engagement: number;
  saves: number;
  profile_visits: number;
  window: string;
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
