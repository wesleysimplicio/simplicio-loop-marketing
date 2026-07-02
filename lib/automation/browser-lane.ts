/**
 * browser-lane.ts — governed browser / computer-use automation lane
 * (issue #51). Used only when the integration broker (lib/integrations/
 * broker.ts) resolves a capability to "browser" or "computer-use" because
 * no safe REST/MCP route exists for that channel.
 *
 * Guardrails:
 *  - DRY_RUN=true by default; live actions require an explicit human
 *    approval flag, never just the absence of DRY_RUN.
 *  - Every call records an evidence artifact (screenshot/video/DOM
 *    snapshot placeholder in dry-run) alongside the manifest.
 *  - Text captured from the page is redacted for secrets/PII before
 *    persisting.
 *  - Failure modes are classified so a human reviewer knows *why* a lane
 *    run stopped (login wall vs. captcha vs. policy rejection).
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chooseAdapter, type Capability } from "../integrations/broker";

export type FailureMode =
  | "login_required"
  | "captcha"
  | "two_factor"
  | "platform_rejection"
  | "policy_block"
  | "unknown";

const FAILURE_PATTERNS: Array<[RegExp, FailureMode]> = [
  [/log\s*in|sign\s*in|session\s+expired/i, "login_required"],
  [/captcha|are you a robot|prove you'?re human/i, "captcha"],
  [/two[- ]factor|2fa|verification code/i, "two_factor"],
  [/policy|terms of service|community guidelines/i, "policy_block"],
  [/rejected|removed|violates|not allowed/i, "platform_rejection"],
];

export function classifyFailure(message: string): FailureMode {
  for (const [pattern, mode] of FAILURE_PATTERNS) {
    if (pattern.test(message)) return mode;
  }
  return "unknown";
}

const REDACT_PATTERNS: Array<[RegExp, string]> = [
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[redacted-email]"],
  [/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+\b/g, "[redacted-key]"],
  [/\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/g, "Bearer [redacted-token]"],
  [/\bsession[_-]?id=[A-Za-z0-9\-._~]+/gi, "session_id=[redacted]"],
];

export function redact(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REDACT_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export interface EvidenceArtifact {
  piece_id: string;
  channel_id: string;
  kind: "screenshot" | "video" | "dom_snapshot";
  path: string;
  captured_at: string;
  redacted: boolean;
}

function isDryRun(): boolean {
  const v = process.env.DRY_RUN;
  return v === undefined || v === "" || v === "true";
}

export function captureEvidence(
  root: string,
  input: {
    piece_id: string;
    channel_id: string;
    kind: EvidenceArtifact["kind"];
    rawContent: string;
  },
): EvidenceArtifact {
  const dir = resolve(root, "data", "evidence", input.piece_id);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${input.channel_id}.${input.kind}.txt`);
  writeFileSync(path, redact(input.rawContent));
  return {
    piece_id: input.piece_id,
    channel_id: input.channel_id,
    kind: input.kind,
    path,
    captured_at: new Date().toISOString(),
    redacted: true,
  };
}

export interface BrowserLaneRequest {
  piece_id: string;
  channel_id: string;
  capability: Capability;
  /** Simulated page content for dry-run evidence + failure classification. */
  simulatedPageContent?: string;
  /** Required to perform a live (non-dry-run) action. */
  humanApproved?: boolean;
}

export interface BrowserLaneResult {
  ok: boolean;
  piece_id: string;
  channel_id: string;
  method: "browser" | "computer-use";
  dry_run: boolean;
  evidence: EvidenceArtifact[];
  failure_mode?: FailureMode;
  blocked_reason?: string;
}

/**
 * Runs a browser/computer-use lane action under the standard guardrails.
 * Never performs a real page interaction here — this is the governance
 * wrapper; a real Playwright/computer-use driver would be injected by the
 * caller in a non-DRY_RUN, credentialed environment and is out of scope
 * for this module.
 */
export function runBrowserLane(root: string, req: BrowserLaneRequest): BrowserLaneResult {
  const decision = chooseAdapter(req.channel_id, req.capability);
  if (decision.method !== "browser" && decision.method !== "computer-use") {
    return {
      ok: false,
      piece_id: req.piece_id,
      channel_id: req.channel_id,
      method: "browser",
      dry_run: isDryRun(),
      evidence: [],
      blocked_reason: `Broker resolved "${decision.method}" for this capability — prefer that adapter over browser automation. ${decision.rationale}`,
    };
  }

  const evidence = [
    captureEvidence(root, {
      piece_id: req.piece_id,
      channel_id: req.channel_id,
      kind: "dom_snapshot",
      rawContent: req.simulatedPageContent ?? "",
    }),
  ];

  const failureMode = req.simulatedPageContent
    ? classifyFailure(req.simulatedPageContent)
    : undefined;
  if (failureMode && failureMode !== "unknown") {
    return {
      ok: false,
      piece_id: req.piece_id,
      channel_id: req.channel_id,
      method: decision.method,
      dry_run: isDryRun(),
      evidence,
      failure_mode: failureMode,
      blocked_reason: `Browser lane detected "${failureMode}" on ${req.channel_id}; escalating to human.`,
    };
  }

  if (!isDryRun() && !req.humanApproved) {
    return {
      ok: false,
      piece_id: req.piece_id,
      channel_id: req.channel_id,
      method: decision.method,
      dry_run: false,
      evidence,
      blocked_reason: "Live (non-DRY_RUN) browser/computer-use action requires humanApproved=true.",
    };
  }

  return {
    ok: true,
    piece_id: req.piece_id,
    channel_id: req.channel_id,
    method: decision.method,
    dry_run: isDryRun(),
    evidence,
  };
}

void dirname;
