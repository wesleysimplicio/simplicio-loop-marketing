'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emitEvent, eventsPath, eventsSummary, runId } from "../../lib/observability/events.ts";

test("runId: returns the same run id across calls within a process", () => {
  assert.equal(runId(), runId());
  assert.match(runId(), /^run-/);
});

test("emitEvent: honors SIMPLICIO_EVENTS_MAX_BYTES to trigger rotation earlier", () => {
  const root = mkdtempSync(join(tmpdir(), "me-events-maxbytes-"));
  process.env.SIMPLICIO_EVENTS_MAX_BYTES = "50";
  try {
    emitEvent(root, { kind: "loop_start", data: { padding: "x".repeat(100) } });
    emitEvent(root, { kind: "loop_iteration" });
    // second call should have rotated the first, oversized file to .1
    assert.ok(existsSync(`${eventsPath(root)}.1`));
  } finally {
    delete process.env.SIMPLICIO_EVENTS_MAX_BYTES;
  }
});

test("eventsSummary: returns a zeroed summary when the events file does not exist", () => {
  const root = mkdtempSync(join(tmpdir(), "me-events-missing-"));
  const summary = eventsSummary(root);
  assert.equal(summary.count, 0);
  assert.deepEqual(summary.by_kind, {});
  assert.deepEqual(summary.last, []);
});

test("eventsSummary: skips malformed lines and events with a mismatched schema", () => {
  const root = mkdtempSync(join(tmpdir(), "me-events-malformed-"));
  const dir = join(root, ".simplicio");
  mkdirSync(dir, { recursive: true });
  const lines = [
    "not-json",
    JSON.stringify({ schema: "other-schema/v1", kind: "ignored", level: "info", run_id: "r", ts: "t" }),
    JSON.stringify({ schema: "marketing-event/v1", kind: "piece_start", level: "info", run_id: "r", ts: "t" }),
    "",
  ];
  writeFileSync(join(dir, "events.jsonl"), lines.join("\n"));
  const summary = eventsSummary(root);
  assert.equal(summary.count, 1);
  assert.equal(summary.by_kind.piece_start, 1);
});

test("eventsSummary: last respects the requested lastN window", () => {
  const root = mkdtempSync(join(tmpdir(), "me-events-lastn-"));
  for (let i = 0; i < 5; i++) {
    emitEvent(root, { kind: `k${i}` });
  }
  const summary = eventsSummary(root, 2);
  assert.equal(summary.count, 5);
  assert.equal(summary.last.length, 2);
  assert.equal(summary.last[1].kind, "k4");
});
