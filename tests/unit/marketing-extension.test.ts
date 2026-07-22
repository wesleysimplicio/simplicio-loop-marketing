import assert from "node:assert/strict";
import test from "node:test";
import { marketingExtensionManifest, marketingManifestHash, validateMarketingManifest, type MarketingExtensionManifest } from "../../lib/extension/marketing-extension";

const clone = (): MarketingExtensionManifest => structuredClone(marketingExtensionManifest);

test("manifest is valid, provider-neutral, deterministic and exposes parallel lanes", () => {
  assert.deepEqual(validateMarketingManifest(clone()), []);
  assert.match(marketingManifestHash(), /^sha256:[a-f0-9]{64}$/);
  assert.equal(marketingManifestHash(clone()), marketingManifestHash());
  const executing = marketingExtensionManifest.stage_overlays.filter((stage) => stage.hook === "executing");
  assert.deepEqual(executing.map((stage) => stage.id), ["marketing.copy", "marketing.creative"]);
  assert.deepEqual(executing.map((stage) => stage.depends_on), [["marketing.strategy"], ["marketing.strategy"]]);
  assert.equal(JSON.stringify(marketingExtensionManifest).includes("WorkerGovernor"), false);
});

test("preflight rejects conflicts, cycles, forbidden removal and unknown resources", () => {
  const invalid = clone();
  invalid.stage_overlays.push({ ...invalid.stage_overlays[0], operation: "remove" as never, depends_on: ["marketing.evidence"] });
  invalid.stage_overlays[0].depends_on = ["marketing.evidence"];
  invalid.stage_overlays[0].resource_class = "private-scheduler";
  const errors = validateMarketingManifest(invalid);
  assert.ok(errors.some((error) => error.startsWith("duplicate overlay")));
  assert.ok(errors.some((error) => error.startsWith("forbidden overlay operation")));
  assert.ok(errors.some((error) => error.startsWith("unknown resource class")));
  assert.ok(errors.includes("overlay dependency cycle"));
});
