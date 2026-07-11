import { test, expect } from "@playwright/test";
import { decodeToon, encodeToon } from "../lib/format/toon";

function roundTrip(value: unknown): unknown {
  return decodeToon(encodeToon(value));
}

test("round-trips a nested object with a scalar array", () => {
  const value = {
    client: "acme",
    campaign: { id: "c1", tags: ["a", "b"] },
    scores: [1, 2, 3],
  };
  expect(roundTrip(value)).toEqual(value);
});

test("round-trips a uniform array of objects as a tabular block", () => {
  const value = {
    captions: [
      { platform: "instagram", length: 220 },
      { platform: "tiktok", length: 90 },
    ],
  };
  const encoded = encodeToon(value);
  expect(encoded).toContain("captions[2]{platform,length}:");
  expect(roundTrip(value)).toEqual(value);
});

test("round-trips an empty array and an empty object", () => {
  const value = { tags: [], meta: {} };
  const encoded = encodeToon(value);
  expect(encoded).toContain("tags: []");
  expect(encoded).toContain("meta: {}");
  expect(roundTrip(value)).toEqual(value);
});

test("falls back to compact JSON for a non-uniform array of objects", () => {
  const value = { violations: [{ rule_id: "r1" }, { rule_id: "r2", severity: "block" }] };
  const encoded = encodeToon(value);
  expect(encoded).toBe(`violations: ${JSON.stringify(value.violations)}`);
  expect(roundTrip(value)).toEqual(value);
});

test("falls back to compact JSON for a mixed-type array", () => {
  const value = { mixed: [1, { a: 1 }, "x"] };
  const encoded = encodeToon(value);
  expect(encoded).toBe(`mixed: ${JSON.stringify(value.mixed)}`);
  expect(roundTrip(value)).toEqual(value);
});

test("falls back to compact JSON for an array whose elements carry nested structures", () => {
  const value = { rows: [{ id: 1, tags: ["a"] }, { id: 2, tags: ["b"] }] };
  const encoded = encodeToon(value);
  expect(encoded).toBe(`rows: ${JSON.stringify(value.rows)}`);
  expect(roundTrip(value)).toEqual(value);
});

test("round-trips a non-uniform array fallback at the root", () => {
  const value = [{ a: 1 }, { b: 2 }];
  const encoded = encodeToon(value);
  expect(encoded).toBe(JSON.stringify(value));
  expect(roundTrip(value)).toEqual(value);
});

test("round-trips a uniform array of objects at the root", () => {
  const value = [{ x: 1 }, { x: 2 }];
  expect(roundTrip(value)).toEqual(value);
});

test("quotes strings only when required and round-trips them", () => {
  const value = {
    note: "hello, world: test",
    numericLooking: "42",
    boolLooking: "true",
    nullLooking: "null",
    empty: "",
    padded: "  pad  ",
    plain: "no quoting needed",
  };
  const encoded = encodeToon(value);
  expect(encoded).toContain('note: "hello, world: test"');
  expect(encoded).toContain('numericLooking: "42"');
  expect(encoded).toContain('boolLooking: "true"');
  expect(encoded).toContain("plain: no quoting needed");
  expect(roundTrip(value)).toEqual(value);
});

test("round-trips strings wrapped in quotes", () => {
  const value = { quoted: '"quoted"' };
  expect(encodeToon(value)).toContain(`quoted: ${JSON.stringify(value.quoted)}`);
  expect(roundTrip(value)).toEqual(value);
});

test("round-trips a realistic piece-brief-style payload with a compliance report shape", () => {
  const value = {
    piece_id: "p-001",
    client: "acme",
    pillar: "growth",
    platforms: ["instagram", "tiktok"],
    compliance: {
      pass: false,
      violations: [
        { rule_id: "no-guarantee", severity: "block" },
        { rule_id: "no-superlative", severity: "warn", snippet: "best ever" },
      ],
      checked_against: ["compliance-generic"],
    },
    empty_notes: [],
    meta: {},
  };
  expect(roundTrip(value)).toEqual(value);
});

test("produces fewer characters than JSON.stringify for a uniform array of objects", () => {
  const value = {
    captions: Array.from({ length: 8 }, (_, i) => ({
      platform: `platform-${i}`,
      length: 100 + i,
      approved: true,
    })),
  };
  const toonLength = encodeToon(value).length;
  const jsonLength = JSON.stringify(value).length;
  expect(toonLength).toBeLessThan(jsonLength);
});
