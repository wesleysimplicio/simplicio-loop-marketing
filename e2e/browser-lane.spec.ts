import { test, expect } from "@playwright/test";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyFailure,
  redact,
  captureEvidence,
  runBrowserLane,
} from "../lib/automation/browser-lane";

test("classifyFailure recognizes login, captcha, 2fa, rejection, and policy block", () => {
  expect(classifyFailure("Please log in to continue")).toBe("login_required");
  expect(classifyFailure("Are you a robot? Complete the CAPTCHA")).toBe("captcha");
  expect(classifyFailure("Enter your two-factor verification code")).toBe("two_factor");
  expect(classifyFailure("Your post was rejected by moderators")).toBe("platform_rejection");
  expect(classifyFailure("This violates our community guidelines")).toBe("policy_block");
  expect(classifyFailure("Totally normal page")).toBe("unknown");
});

test("redact strips emails, keys, bearer tokens, and session ids", () => {
  const text = redact("contact me at a@b.com, key sk_live_abc123, Bearer xyz.abc, session_id=abcdef");
  expect(text).not.toContain("a@b.com");
  expect(text).not.toContain("sk_live_abc123");
  expect(text).toContain("[redacted-email]");
  expect(text).toContain("[redacted-key]");
  expect(text).toContain("[redacted-token]");
  expect(text).toContain("session_id=[redacted]");
});

test("captureEvidence persists redacted content to data/evidence/<piece>/<channel>.<kind>.txt", () => {
  const host = mkdtempSync(join(tmpdir(), "me-evidence-"));
  const artifact = captureEvidence(host, {
    piece_id: "p1",
    channel_id: "hackernews",
    kind: "dom_snapshot",
    rawContent: "leaked: a@b.com",
  });
  expect(existsSync(artifact.path)).toBe(true);
  expect(readFileSync(artifact.path, "utf8")).not.toContain("a@b.com");
});

test("runBrowserLane refuses to run when the broker prefers a non-browser adapter", () => {
  const host = mkdtempSync(join(tmpdir(), "me-lane-"));
  const r = runBrowserLane(host, {
    piece_id: "p1",
    channel_id: "devto",
    capability: "publish",
  });
  expect(r.ok).toBe(false);
  expect(r.blocked_reason).toContain('prefer that adapter');
});

test("runBrowserLane classifies a failure and blocks instead of silently passing", () => {
  const host = mkdtempSync(join(tmpdir(), "me-lane-fail-"));
  const r = runBrowserLane(host, {
    piece_id: "p1",
    channel_id: "hackernews",
    capability: "evidence_capture",
    simulatedPageContent: "Please log in to continue",
  });
  expect(r.ok).toBe(false);
  expect(r.failure_mode).toBe("login_required");
  expect(r.evidence).toHaveLength(1);
});

test("runBrowserLane succeeds in dry-run mode with evidence captured", () => {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-lane-ok-"));
  const r = runBrowserLane(host, {
    piece_id: "p1",
    channel_id: "hackernews",
    capability: "evidence_capture",
    simulatedPageContent: "Show HN: our launch post is live",
  });
  expect(r.ok).toBe(true);
  expect(r.dry_run).toBe(true);
  expect(r.evidence).toHaveLength(1);
});

test("runBrowserLane blocks a live action without human approval", () => {
  process.env.DRY_RUN = "false";
  try {
    const host = mkdtempSync(join(tmpdir(), "me-lane-live-"));
    const r = runBrowserLane(host, {
      piece_id: "p1",
      channel_id: "hackernews",
      capability: "evidence_capture",
      simulatedPageContent: "all good",
    });
    expect(r.ok).toBe(false);
    expect(r.blocked_reason).toContain("humanApproved");
  } finally {
    process.env.DRY_RUN = "true";
  }
});
