import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeEffectServer, redact, safeArtifactPath, stableHash, supportsCore, validateManifest } from "../../lib/extension/conformance.ts";
import manifest from "../../.specs/extensions/loop.marketing.json" with { type: "json" };

test("manifest passes supported core and fails incompatible core clearly", () => {
  assert.ok(validateManifest(manifest, "1.9.0").every(x => x.pass));
  assert.equal(validateManifest(manifest, "2.0.0").find(x => x.id === "core-version")?.pass, false);
  assert.equal(supportsCore(">=1.0.0 <2.0.0", "garbage"), false);
});
test("stable hash ignores object key order", () => assert.equal(stableHash({ b: 2, a: 1 }), stableHash({ a: 1, b: 2 })));
test("filesystem guard rejects traversal and absolute paths", () => {
  assert.match(safeArtifactPath("/tmp/root", "safe/file.json"), /safe\/file\.json$/);
  assert.throws(() => safeArtifactPath("/tmp/root", "../secret"), /PATH_TRAVERSAL/);
  assert.throws(() => safeArtifactPath("/tmp/root", "/etc/passwd"), /PATH_TRAVERSAL/);
});
test("redaction recursively removes secrets and PII", () => assert.deepEqual(redact({ api_key: "x", nested: [{ email: "a@b" }], ok: 2 }), { api_key: "[REDACTED]", nested: [{ email: "[REDACTED]" }], ok: 2 }));
test("fake server is exactly once, rejects forged approval and stale fence", () => {
  const server = new FakeEffectServer();
  assert.throws(() => server.request({ key: "k", fence: 1, authorized: false }), /FORGED_APPROVAL/);
  const a = server.request({ key: "k", fence: 2, authorized: true });
  assert.deepEqual(server.request({ key: "k", fence: 2, authorized: true }), a);
  assert.deepEqual(server.requery("k"), a); assert.equal(server.requery("missing"), null);
  assert.throws(() => server.request({ key: "k", fence: 1, authorized: true }), /STALE_FENCE/);
  assert.equal(server.effectCount, 1);
});
