import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { PieceFrontmatter } from "../pieces/frontmatter";
import { checkActionGate } from "../gate/action-gate";

export interface MetaAdsDraft {
  piece_id: string;
  campaign_name: string;
  objective: string;
  audience_hint: string;
  daily_budget_usd: number;
  creative_ids: string[];
  captions_by_platform: Record<string, string>;
  paused: boolean;
  generated_at: string;
}

function isDryRun(): boolean {
  const v = process.env.DRY_RUN;
  return v === undefined || v === "" || v === "true";
}

export function buildDraft(
  piece: PieceFrontmatter,
  options: {
    captions: Record<string, string>;
    creative_ids: string[];
    audience_hint?: string;
    daily_budget_usd?: number;
    objective?: string;
  },
): MetaAdsDraft {
  return {
    piece_id: piece.id,
    campaign_name: `auto-${piece.id}`,
    objective: options.objective ?? "OUTCOME_ENGAGEMENT",
    audience_hint: options.audience_hint ?? piece.pillar,
    daily_budget_usd: options.daily_budget_usd ?? 10,
    creative_ids: options.creative_ids,
    captions_by_platform: options.captions,
    paused: true,
    generated_at: new Date().toISOString(),
  };
}

export async function createCampaign(
  root: string,
  piece: PieceFrontmatter,
  draft: MetaAdsDraft,
): Promise<{ ok: boolean; path?: string; campaign_id?: string; error?: string }> {
  const dateStr = piece.date.slice(0, 10);
  const dir = resolve(root, "outputs", piece.client, dateStr, piece.id);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const draftPath = resolve(dir, "ads-draft.json");
  const finalPath = existsSync(draftPath)
    ? resolve(dir, `ads-draft.${Date.now()}.json`)
    : draftPath;
  writeFileSync(finalPath, JSON.stringify(draft, null, 2));
  const promotionsPath = resolve(root, "data", "promotions.jsonl");
  if (!existsSync(dirname(promotionsPath))) {
    mkdirSync(dirname(promotionsPath), { recursive: true });
  }
  appendFileSync(
    promotionsPath,
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      piece_id: piece.id,
      reason: "promoted-by-classifier",
      meta_ads_draft_path: finalPath,
    })}\n`,
  );
  if (isDryRun()) {
    return { ok: true, path: finalPath };
  }
  const gate = checkActionGate({ root, action: "ads_activate", pieceId: piece.id, campaignId: piece.campaign, dailyBudgetUsd: draft.daily_budget_usd, spendCeilingUsd: draft.daily_budget_usd });
  if (!gate.ok) return { ok: false, path: finalPath, error: `action-gate blocked: ${gate.reasons.join("; ")}` };
  if (process.env.META_ADS_MCP_ACTIVE !== "true") {
    return {
      ok: false,
      path: finalPath,
      error: "META_ADS_MCP_ACTIVE not true; cannot create campaign — draft kept",
    };
  }
  // Real path would call the meta-ads MCP here.
  return {
    ok: false,
    path: finalPath,
    error:
      "Meta Ads MCP integration is a stub. Use DRY_RUN=true for tests; wire MCP transport in production.",
  };
}
