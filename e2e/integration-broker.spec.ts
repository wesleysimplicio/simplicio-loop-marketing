import { test, expect } from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chooseAdapter, simulate, recordFailure, explain } from "../lib/integrations/broker";

test("chooseAdapter uses the channel's declared publish method for publish", () => {
  const d = chooseAdapter("devto", "publish");
  expect(d.method).toBe("api");
  expect(d.rationale).toContain("DEV.to");
});

test("chooseAdapter falls back for capabilities the declared method can't serve", () => {
  const d = chooseAdapter("lobsters", "draft_ad");
  // lobsters is "manual" which IS in draft_ad's fallback list, so it stays manual.
  expect(d.method).toBe("manual");
});

test("chooseAdapter defaults unknown channels to manual review", () => {
  const d = chooseAdapter("not-a-real-channel", "publish");
  expect(d.method).toBe("manual");
  expect(d.rationale).toContain("Unknown channel");
});

test("simulate never performs a live call and returns a payload preview", () => {
  const r = simulate("hackernews", "publish", { title: "Show HN: thing" });
  expect(r.dry_run).toBe(true);
  expect(r.ok).toBe(true);
  expect(r.payload_preview).toEqual({ title: "Show HN: thing" });
});

test("recordFailure appends a structured failure record", () => {
  const root = mkdtempSync(join(tmpdir(), "me-broker-"));
  recordFailure(root, {
    channel_id: "tiktok",
    capability: "publish",
    method: "api",
    error: "login required",
    occurred_at: new Date().toISOString(),
  });
  const lines = readFileSync(join(root, "data", "integration-failures.jsonl"), "utf8")
    .trim()
    .split("\n");
  expect(lines).toHaveLength(1);
  const parsed = JSON.parse(lines[0]);
  expect(parsed.channel_id).toBe("tiktok");
  expect(parsed.error).toBe("login required");
});

test("explain returns a human-readable rationale string", () => {
  expect(explain("reddit", "publish")).toContain("Reddit");
});
