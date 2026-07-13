import { test, expect } from "@playwright/test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { anchorPath, checkAnchor, createAnchor, gateAnchor, readAnchor } from "../lib/loop/anchor";
import { fingerprint, nextStrategy, pieceJournalPath, recordAttempt } from "../lib/loop/journal";

test("campaign anchor freezes plan and blocks unverified acceptance", () => {
  const root = mkdtempSync(join(tmpdir(), "me-anchor-"));
  const anchor = createAnchor(root, {
    client: "acme", campaign: "launch", allowed_channels: ["instagram", "linkedin"],
    primary_kpi: "qualified_leads", dry_run: true,
    piece_acceptance: [{ id: "piece-1", description: "compliance and evidence pass" }],
  }, "2026-07-11T00:00:00.000Z");
  expect(readAnchor(root, "acme", "launch").anchor_id).toBe(anchor.anchor_id);
  expect(checkAnchor(anchor, { channels: ["reddit"], primary_kpi: "clicks" }).drift).toEqual([
    "channel-out-of-plan:reddit", "primary-kpi-changed:clicks",
  ]);
  expect(gateAnchor(root, "acme", "launch", { "piece-1": false })).toMatchObject({ pass: false, status: "blocked" });
  expect(gateAnchor(root, "acme", "launch", { "piece-1": false }, { reason: "approved by owner", at: "2026-07-11T00:01:00.000Z" })).toMatchObject({ pass: true, override_logged: true });
  expect(readAnchor(root, "acme", "launch").status_events.some((e) => e.kind === "human_override")).toBe(true);
  expect(anchorPath(root, "acme", "launch")).toContain(join("outputs", "acme", "launch", "anchor.json"));
});

test("journal fingerprint and strategy ladder are deterministic", () => {
  expect(fingerprint("compliance failed at /tmp/a:42 after 2s")).toBe(fingerprint("COMPLIANCE failed at /tmp/b:99 after 9s"));
  const root = mkdtempSync(join(tmpdir(), "me-journal-"));
  expect(nextStrategy(root, "piece-1")).toBe("rewrite-hook");
  recordAttempt(root, {
    item_id: "piece-1",
    client: "acme",
    campaign: "launch",
    date: "2026-05-08T12:34:56.000Z",
    attempt: 1,
    action: "generate:rewrite-hook",
    gate: "fail",
    strategy: "rewrite-hook",
    failure_text: "compliance failed at /tmp/a:42 after 2s",
  });
  expect(existsSync(pieceJournalPath(root, "acme", "2026-05-08", "piece-1"))).toBe(true);
});
