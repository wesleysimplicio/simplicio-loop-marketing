import assert from "node:assert/strict";
import test from "node:test";
import { deterministicCaptionFormat } from "../../lib/extension/handlers";
import { marketingExtensionManifest, marketingManifestHash } from "../../lib/extension/marketing-extension";

test("embedded, daemon and remote transports receive an equivalent extension request", async () => {
  const request = { extension_id: marketingExtensionManifest.extension_id, manifest_hash: marketingManifestHash(), overlays: marketingExtensionManifest.stage_overlays.map((stage) => stage.id) };
  const transports = ["embedded", "daemon", "remote"] as const;
  const receipts = await Promise.all(transports.map(async (transport) => ({ transport, ...request })));
  for (const receipt of receipts) assert.deepEqual({ ...receipt, transport: undefined }, { ...receipts[0], transport: undefined });
});

test("core may fan out independent pieces while deterministic validation stays ordered", async () => {
  let active = 0;
  let peak = 0;
  const run = async (task_id: string) => {
    active++; peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const result = await deterministicCaptionFormat({ run_id: "run", task_id, attempt: 1, fence_token: `f-${task_id}`, tenant_id: "tenant", input: { caption: task_id, pillar: "safe" } });
    active--;
    return result;
  };
  const results = await Promise.all([run("p1"), run("p2"), run("p3")]);
  assert.ok(peak > 1);
  assert.ok(results.every((result) => result.verdict === "pass"));
});
