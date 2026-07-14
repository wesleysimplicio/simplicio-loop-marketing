'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { validate, validateArtifact, type SubsetSchema } from "../../lib/contracts/validate.ts";

const PIECE_SCHEMA: SubsetSchema = {
  type: "object",
  required: ["piece_id", "status"],
  properties: {
    piece_id: { type: "string" },
    status: { type: "string", enum: ["draft", "ready", "published"] },
    tags: { type: "array", items: { type: "string" } },
  },
};

test("validate: passes a conforming object", () => {
  const result = validate({ piece_id: "p1", status: "draft" }, PIECE_SCHEMA);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("validate: reports a missing required property", () => {
  const result = validate({ status: "draft" }, PIECE_SCHEMA);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('"piece_id"')));
});

test("validate: reports an enum violation", () => {
  const result = validate({ piece_id: "p1", status: "archived" }, PIECE_SCHEMA);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("not in enum")));
});

test("validate: integers satisfy a 'number' type", () => {
  const result = validate(3, { type: "number" });
  assert.equal(result.ok, true);
});

test("validate: array minItems is enforced", () => {
  const result = validate([1], { type: "array", minItems: 2 });
  assert.equal(result.ok, false);
  assert.ok(result.errors[0].includes("at least 2"));
});

test("validate: nested array items are validated recursively", () => {
  const result = validate(
    { tags: ["a", 2] },
    { type: "object", properties: { tags: { type: "array", items: { type: "string" } } } },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("$.tags[1]")));
});

test("validate: const mismatch is reported", () => {
  const result = validate("v2", { const: "v1" });
  assert.equal(result.ok, false);
});

test("validateArtifact: skips artifacts with an unknown schema id", () => {
  const result = validateArtifact({ schema: "unknown/v1" }, { "piece/v1": PIECE_SCHEMA });
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
});

test("validateArtifact: validates against the matching registry schema", () => {
  const registry = { "piece/v1": PIECE_SCHEMA };
  const good = validateArtifact({ schema: "piece/v1", piece_id: "p1", status: "ready" }, registry);
  assert.equal(good.ok, true);
  assert.equal(good.schema, "piece/v1");

  const bad = validateArtifact({ schema: "piece/v1", status: "ready" }, registry);
  assert.equal(bad.ok, false);
});

test("validateArtifact: rejects a non-object artifact", () => {
  const result = validateArtifact("not-an-object", {});
  assert.equal(result.ok, false);
});
