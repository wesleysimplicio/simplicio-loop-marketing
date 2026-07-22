import { test } from "node:test";
import assert from "node:assert/strict";
import { runConformance } from "../../lib/cli/conformance.ts";
test("source conformance produces replayable hashes and blocks incompatible upgrades", () => {
  const a: any = runConformance(process.cwd(), "1.0.0"); const b: any = runConformance(process.cwd(), "1.0.0");
  assert.equal(a.status, "PASS"); assert.equal(a.manifest_hash, b.manifest_hash); assert.equal(a.composed_graph_hash, b.composed_graph_hash);
  assert.equal(a.checks.find((x: any) => x.id === "exactly-once").pass, true);
  assert.equal((runConformance(process.cwd(), "2.0.0") as any).status, "BLOCKED");
});
