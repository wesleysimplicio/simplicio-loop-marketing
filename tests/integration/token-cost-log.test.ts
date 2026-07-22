import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logUsage } from "../../lib/router.ts";
import { readUsage, reconcileGenerationCosts } from "../../lib/observability/cost.ts";

test("cost analytics reconstruct a run without persisting prompts", () => {
  const root = mkdtempSync(join(tmpdir(), "token-cost-"));
  const path = join(root, "data", "llm-usage.jsonl");
  logUsage({ task: "script", stage: "script", correlation_id: "run-97", provider: "p", tokens: 30, source: "provider", cost_usd: 0.03 }, path);
  logUsage({ task: "caption", stage: "caption", correlation_id: "run-97", provider: "p", tokens: 12, source: "tokenizer", cache_read_input_tokens: 4, cost_usd: 0.01 }, path);

  const persisted = readFileSync(path, "utf8");
  assert.doesNotMatch(persisted, /prompt|private brief/i);
  assert.deepEqual(reconcileGenerationCosts(readUsage(path)), [{ correlation_id: "run-97", currency: "USD", predicted_tokens: 12, actual_tokens: 30, unavailable_calls: 0, cache_reuse_tokens: 4, cost_usd: 0.04 }]);
});
