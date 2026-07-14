'use strict';

import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeToon, decodeToon } from "../../lib/format/toon.ts";

test("encodeToon: scalar values", () => {
  assert.equal(encodeToon("hello"), "hello");
  assert.equal(encodeToon(42), "42");
  assert.equal(encodeToon(true), "true");
  assert.equal(encodeToon(null), "null");
});

test("encodeToon: quotes strings that need it", () => {
  assert.equal(encodeToon(""), '""');
  assert.equal(encodeToon("true"), '"true"');
  assert.equal(encodeToon("42"), '"42"');
  assert.equal(encodeToon("has, comma"), '"has, comma"');
  assert.equal(encodeToon(" padded "), '" padded "');
});

test("encodeToon: plain object as YAML-like key/value lines", () => {
  const out = encodeToon({ a: 1, b: "x" });
  assert.equal(out, "a: 1\nb: x");
});

test("encodeToon: uniform object array becomes a tabular block", () => {
  const out = encodeToon({
    pieces: [
      { id: "p1", status: "ready" },
      { id: "p2", status: "draft" },
    ],
  });
  assert.equal(
    out,
    "pieces[2]{id,status}:\n  p1,ready\n  p2,draft",
  );
});

test("encodeToon: scalar array becomes an inline list", () => {
  const out = encodeToon({ tags: ["a", "b", "c"] });
  assert.equal(out, "tags[3]: a,b,c");
});

test("encodeToon: empty array falls back to compact JSON", () => {
  const out = encodeToon({ items: [] });
  assert.equal(out, "items: []");
});

test("encodeToon: non-uniform object array falls back to compact JSON", () => {
  const out = encodeToon({ items: [{ a: 1 }, { a: 1, b: 2 }] });
  assert.equal(out, 'items: [{"a":1},{"a":1,"b":2}]');
});

test("decodeToon: round-trips a nested payload through encode/decode", () => {
  const original = {
    piece_id: "p-1",
    tags: ["ad", "reel"],
    variants: [
      { platform: "ig", length: 30 },
      { platform: "tt", length: 15 },
    ],
    meta: { client: "acme" },
  };
  const encoded = encodeToon(original);
  const decoded = decodeToon(encoded);
  assert.deepEqual(decoded, original);
});

test("decodeToon: root-level scalar array", () => {
  assert.deepEqual(decodeToon("[3]: 1,2,3"), [1, 2, 3]);
});

test("decodeToon: empty text decodes to an empty object", () => {
  assert.deepEqual(decodeToon(""), {});
});

test("decodeToon: quoted scalar preserves embedded comma", () => {
  const encoded = encodeToon({ note: "has, comma" });
  assert.deepEqual(decodeToon(encoded), { note: "has, comma" });
});
