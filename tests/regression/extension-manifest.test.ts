import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("extension manifest preserves safety, budgets and non-replicable irreversible effects", () => {
  const manifest = JSON.parse(readFileSync(".specs/extensions/loop.marketing.json", "utf8"));
  assert.deepEqual(manifest.policies.evolution.protected_gates.sort(), ["compliance", "safety"]);
  for (const key of ["max_agents", "max_tokens", "max_media_usd", "max_ads_usd", "max_backlog"]) assert.equal(Number.isFinite(manifest.policies.replication_admission[key]), true);
  assert.deepEqual(manifest.effects.replicable, []);
  assert.deepEqual(manifest.effects.forbidden_replication, ["publish", "ads"]);
  assert.deepEqual(manifest.receipt_extensions.required_fields, ["extension_version", "composed_graph_hash"]);
});
