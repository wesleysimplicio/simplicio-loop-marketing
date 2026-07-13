import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createAnchor, gateAnchor, readAnchor } from "../lib/loop/anchor";

test("anchor gate appends blocked events before override", () => {
  const root = mkdtempSync(join(tmpdir(), "me-anchor-blocked-"));
  createAnchor(root, {
    client: "acme",
    campaign: "launch",
    allowed_channels: ["instagram"],
    primary_kpi: "qualified_leads",
    dry_run: true,
    piece_acceptance: [{ id: "piece-1", description: "compliance and evidence pass" }],
  }, "2026-07-13T00:00:00.000Z");

  expect(gateAnchor(root, "acme", "launch", { "piece-1": false })).toMatchObject({
    pass: false,
    status: "blocked",
  });
  expect(readAnchor(root, "acme", "launch").status_events.at(-1)).toMatchObject({
    kind: "gate",
    status: "blocked",
    reason: "unverified:piece-1",
  });
});

test("anchor CLI create/check/gate/selftest is wired end-to-end", () => {
  const root = mkdtempSync(join(tmpdir(), "me-anchor-cli-"));
  const cli = resolve(process.cwd(), "bin", "marketing-engine.mjs");

  const create = spawnSync(process.execPath, [
    cli,
    "anchor",
    "create",
    "--client",
    "acme",
    "--campaign",
    "launch",
    "--channels",
    "instagram,linkedin",
    "--primary-kpi",
    "qualified_leads",
    "--dry-run",
    "--acceptance",
    "piece-1=compliance and evidence pass",
  ], { cwd: root, encoding: "utf8" });
  expect(create.status).toBe(0);
  expect(create.stdout).toContain('"anchor_id"');

  const check = spawnSync(process.execPath, [
    cli,
    "anchor",
    "check",
    "--client",
    "acme",
    "--campaign",
    "launch",
    "--channels",
    "reddit",
    "--primary-kpi",
    "clicks",
  ], { cwd: root, encoding: "utf8" });
  expect(check.status).toBe(2);
  expect(check.stdout).toContain("channel-out-of-plan:reddit");

  const gate = spawnSync(process.execPath, [
    cli,
    "anchor",
    "gate",
    "--client",
    "acme",
    "--campaign",
    "launch",
    "--status",
    "piece-1=false",
  ], { cwd: root, encoding: "utf8" });
  expect(gate.status).toBe(2);
  expect(gate.stdout).toContain('"status": "blocked"');

  const selftest = spawnSync(process.execPath, [cli, "anchor", "selftest"], {
    cwd: root,
    encoding: "utf8",
  });
  expect(selftest.status).toBe(0);
  expect(selftest.stdout).toContain('"ok": true');
});
