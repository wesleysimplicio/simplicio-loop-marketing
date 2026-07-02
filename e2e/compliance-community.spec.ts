import { test, expect } from "@playwright/test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  auditCommunityPost,
  writeCommunityReport,
  communityGateBlocks,
} from "../lib/compliance/community";

test("rejects a drive-by promotional post on a known community channel", () => {
  const r = auditCommunityPost({
    piece_id: "p1",
    channel_id: "reddit-programming",
    title: "Check out my new SaaS!",
    body: "Link in bio, huge discount today only!",
    link_url: "https://example.com",
  });
  expect(r.status).toBe("fail");
  expect(r.checks.some((c) => c.check_id === "content.original_value" && c.status === "fail")).toBe(true);
});

test("accepts a substantive technical post with disclosure", () => {
  const body = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ") +
    " We built this after hitting a real production incident and want to share the postmortem.";
  const r = auditCommunityPost({
    piece_id: "p2",
    channel_id: "devto",
    title: "How we debugged a 3am latency spike",
    body,
    link_url: "https://example.com/postmortem",
    discloses_affiliation: true,
  });
  expect(r.status).toBe("pass");
});

test("channel rules that cannot be read hold for human review, never silently pass", () => {
  const r = auditCommunityPost({
    piece_id: "p3",
    channel_id: "some-unregistered-subreddit",
    title: "A totally normal title",
    body: "Some reasonably long technical body text that would otherwise be fine on its own merits here.",
  });
  expect(r.status).toBe("needs_review");
  expect(r.checks.find((c) => c.check_id === "channel.rules_readable")?.status).toBe("needs_review");
});

test("frequency limit exceeded blocks the post", () => {
  const host = mkdtempSync(join(tmpdir(), "me-freq-"));
  const historyPath = join(host, "data", "community-post-history.jsonl");
  mkdirSync(join(host, "data"), { recursive: true });
  const now = new Date().toISOString();
  writeFileSync(historyPath, [
    JSON.stringify({ channel_id: "reddit", posted_at: now }),
    JSON.stringify({ channel_id: "reddit", posted_at: now }),
  ].join("\n") + "\n");

  const r = auditCommunityPost({
    piece_id: "p4",
    channel_id: "reddit",
    title: "Another post",
    body: "Reasonably long technical body text describing a real engineering tradeoff in detail here.",
    postHistoryPath: historyPath,
  });
  expect(r.checks.find((c) => c.check_id === "channel.frequency_limit")?.status).toBe("fail");
  expect(r.status).toBe("fail");
});

test("corrupted post-history is needs_review, not a silent pass", () => {
  const host = mkdtempSync(join(tmpdir(), "me-freq-corrupt-"));
  const historyPath = join(host, "data", "community-post-history.jsonl");
  mkdirSync(join(host, "data"), { recursive: true });
  writeFileSync(historyPath, "not-json\n");

  const r = auditCommunityPost({
    piece_id: "p5",
    channel_id: "reddit",
    title: "Fine title",
    body: "Reasonably long technical body text describing a real engineering tradeoff in detail here.",
    postHistoryPath: historyPath,
  });
  expect(r.checks.find((c) => c.check_id === "channel.frequency_limit")?.status).toBe("needs_review");
});

test("writeCommunityReport persists the report and communityGateBlocks enforces override semantics", () => {
  const host = mkdtempSync(join(tmpdir(), "me-community-report-"));
  const report = auditCommunityPost({
    piece_id: "p6",
    channel_id: "hackernews",
    title: "Show HN: a thing we built",
    body: "Reasonably long technical body text describing a real engineering tradeoff in detail here.",
  });
  const path = writeCommunityReport(host, report);
  expect(path).toContain("compliance-community");

  expect(communityGateBlocks("pass")).toBe(false);
  expect(communityGateBlocks("fail")).toBe(true);
  expect(communityGateBlocks("needs_review")).toBe(true);
  expect(communityGateBlocks("needs_review", true)).toBe(false);
});
