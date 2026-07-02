import { test, expect } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  writeTuple,
  readBoard,
  readTuple,
  tuplesByLane,
  tuplesByStatus,
  validateAgentManifest,
  WorkerGovernor,
} from "../lib/yool/board";

test("writeTuple + readBoard folds the event log, last write per id wins", () => {
  const host = mkdtempSync(join(tmpdir(), "me-yool-"));
  writeTuple(host, { id: "piece.plan:p1", class: "piece.plan", status: "pending", lane: "strategy" });
  writeTuple(host, { id: "piece.plan:p1", class: "piece.plan", status: "in_progress", lane: "strategy", owner: "worker-1" });
  const board = readBoard(host);
  expect(board).toHaveLength(1);
  expect(board[0].status).toBe("in_progress");
  expect(board[0].owner).toBe("worker-1");
});

test("readTuple, tuplesByLane, tuplesByStatus filter correctly", () => {
  const host = mkdtempSync(join(tmpdir(), "me-yool-filter-"));
  writeTuple(host, { id: "a", class: "piece.copy", status: "pending", lane: "copy" });
  writeTuple(host, { id: "b", class: "piece.compliance", status: "blocked", lane: "compliance" });
  expect(readTuple(host, "a")?.class).toBe("piece.copy");
  expect(tuplesByLane(host, "copy")).toHaveLength(1);
  expect(tuplesByStatus(host, "blocked")).toHaveLength(1);
});

test("validateAgentManifest requires mandatory cpu/disk/timeout guardrails", () => {
  const missing = validateAgentManifest({ yool_id: "agent.dev.copy", authority: "dev", lane: "copy" });
  expect(missing.ok).toBe(false);
  expect(missing.errors.some((e) => e.includes("agent_terms"))).toBe(true);

  const zeroQuota = validateAgentManifest({
    yool_id: "agent.dev.copy",
    authority: "dev",
    lane: "copy",
    agent_terms: { cpu_quota_pct: 0, disk_quota_mb: 100, timeout_s: 300 },
  });
  expect(zeroQuota.ok).toBe(false);

  const valid = validateAgentManifest({
    yool_id: "agent.dev.copy",
    authority: "dev",
    lane: "copy",
    agent_terms: { cpu_quota_pct: 60, disk_quota_mb: 100, timeout_s: 300 },
  });
  expect(valid.ok).toBe(true);
});

test("WorkerGovernor bounds concurrent workers per lane", () => {
  const gov = new WorkerGovernor({
    discovery: 1,
    strategy: 1,
    copy: 1,
    creative: 1,
    compliance: 1,
    publish: 1,
    analytics: 1,
    "paid-growth": 1,
    "community-replies": 1,
    evidence: 1,
    "budget-guardian": 1,
  });
  expect(gov.acquire("copy")).toBe(true);
  expect(gov.canDispatch("copy")).toBe(false);
  expect(gov.acquire("copy")).toBe(false);
  gov.release("copy");
  expect(gov.canDispatch("copy")).toBe(true);
});
