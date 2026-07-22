import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendHbp, decodeEnvelope, encodeEnvelope, readHbi, readHbp, writeHbiAtomic } from "../../lib/formats/binary.ts";
import { LEGACY_MAX_BYTES, migrateLegacy } from "../../lib/formats/migrate.ts";

test("HBP appends deterministic, checksummed records", () => {
  const root = mkdtempSync(join(tmpdir(), "hbp-"));
  const path = join(root, "runs.hbp");
  appendHbp(path, { id: 1, tags: ["a"] });
  appendHbp(path, { id: 2, ok: true });
  assert.deepEqual(readHbp(path), [{ id: 1, tags: ["a"] }, { id: 2, ok: true }]);
  const bytes = readFileSync(path);
  bytes[bytes.length - 1] ^= 1;
  writeFileSync(path, bytes);
  assert.throws(() => readHbp(path), /checksum/);
});
test("HBI atomically replaces a typed snapshot", () => {
  const root = mkdtempSync(join(tmpdir(), "hbi-"));
  const path = join(root, "manifest.hbi");
  writeHbiAtomic(path, { schema: "manifest/v1", cost: 1.25 });
  assert.deepEqual(readHbi(path), { schema: "manifest/v1", cost: 1.25 });
  writeHbiAtomic(path, { schema: "manifest/v1", cost: 2 });
  assert.equal((readHbi<{ cost: number }>(path)).cost, 2);
});

test("envelopes reject wrong kind, truncation, trailing bytes and oversized headers", () => {
  const hbp = encodeEnvelope("HBP", { x: 1 });
  assert.throws(() => decodeEnvelope(hbp, "HBI"), /expected HBI/);
  assert.throws(() => decodeEnvelope(hbp.subarray(0, 10), "HBP"), /truncated/);
  assert.throws(() => decodeEnvelope(Buffer.concat([hbp, Buffer.from([0])]), "HBP"), /trailing/);
  const hostile = Buffer.alloc(16); hostile.write("HBP", 0); hostile.writeUInt16BE(1, 4); hostile.writeUInt32BE(0xffffffff, 8);
  assert.throws(() => decodeEnvelope(hostile, "HBP"), /exceeds/);
});

test("legacy migration supports dry-run, backup, verification and idempotent resume", () => {
  const root = mkdtempSync(join(tmpdir(), "migration-"));
  const source = join(root, "runs.jsonl");
  const target = join(root, "runs.hbp");
  writeFileSync(source, '{"id":1}\n{"id":2}\n');
  assert.equal(migrateLegacy(source, target, "HBP", true).status, "dry_run");
  const migrated = migrateLegacy(source, target, "HBP");
  assert.equal(migrated.records, 2);
  assert.deepEqual(readHbp(target), [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(readFileSync(`${source}.bak`), readFileSync(source));
  assert.equal(migrateLegacy(source, target, "HBP").status, "already_migrated");
});

test("legacy migration rejects corrupt, truncated and over-limit inputs without publishing", () => {
  const root = mkdtempSync(join(tmpdir(), "migration-bad-"));
  const source = join(root, "bad.jsonl");
  writeFileSync(source, '{"id":1}\n{"id"');
  assert.throws(() => migrateLegacy(source, join(root, "bad.hbp"), "HBP"), /line 2/);
  writeFileSync(source, Buffer.alloc(LEGACY_MAX_BYTES + 1));
  assert.throws(() => migrateLegacy(source, join(root, "large.hbp"), "HBP"), /exceeds/);
});
