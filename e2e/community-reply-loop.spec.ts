import { test, expect } from "@playwright/test";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyComment,
  riskLevelFor,
  requiresHumanApproval,
  processComment,
  recordComment,
  recordObjectionLearning,
} from "../lib/community/reply-loop";

test("classifyComment recognizes bug reports, pricing concerns, and buying signals", () => {
  expect(classifyComment("This crashed with an exception on load")).toBe("bug_report");
  expect(classifyComment("This is too expensive for what it does")).toBe("pricing_concern");
  expect(classifyComment("Take my money, how do I start?")).toBe("buying_signal");
  expect(classifyComment("Does this integrate with our webhook api?")).toBe("integration_request");
});

test("legal/security/billing sensitive comments are always high risk regardless of classification", () => {
  expect(riskLevelFor("question", "Is this GDPR compliant, worried about a data leak")).toBe("high");
});

test("high/medium risk and spam always require human approval; plain questions don't", () => {
  expect(requiresHumanApproval("high", "objection")).toBe(true);
  expect(requiresHumanApproval("low", "spam")).toBe(true);
  expect(requiresHumanApproval("low", "question")).toBe(false);
});

test("processComment drafts a reply that says evidence is missing when none is provided", () => {
  const r = processComment({
    source_url: "https://reddit.com/r/x/1",
    channel: "reddit",
    author_handle: "dev123",
    text: "Does this actually reduce latency or is that marketing?",
  });
  expect(r.evidence_cited).toBe(false);
  expect(r.suggested_response.toLowerCase()).toContain("don't have");
});

test("processComment cites evidence when provided", () => {
  const r = processComment(
    {
      source_url: "https://news.ycombinator.com/item?id=1",
      channel: "hackernews",
      author_handle: "hnuser",
      text: "This crashed on load, is that a known bug?",
    },
    "confirmed in v1.2.3, fix shipping this week",
  );
  expect(r.evidence_cited).toBe(true);
  expect(r.suggested_response).toContain("confirmed in v1.2.3");
});

test("spam comments get an empty suggested response and require approval", () => {
  const r = processComment({
    source_url: "https://x.com/1",
    channel: "x",
    author_handle: "bot1",
    text: "DM me to make $500/day, click here",
  });
  expect(r.classification).toBe("spam");
  expect(r.suggested_response).toBe("");
  expect(r.requires_human_approval).toBe(true);
});

test("recordComment and recordObjectionLearning persist to the expected logs", () => {
  const host = mkdtempSync(join(tmpdir(), "me-reply-loop-"));
  const record = processComment({
    source_url: "https://devto.com/1",
    channel: "devto",
    author_handle: "critic",
    text: "This is way too expensive compared to alternatives",
  });
  recordComment(host, record);
  recordObjectionLearning(host, record);

  const comments = readFileSync(join(host, "data", "community-comments.jsonl"), "utf8");
  expect(comments.trim().split("\n")).toHaveLength(1);

  const learnings = readFileSync(join(host, "data", "learnings.md"), "utf8");
  expect(learnings).toContain("community-objection");
  expect(existsSync(join(host, "data", "learnings.md"))).toBe(true);
});
