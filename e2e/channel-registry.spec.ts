import { test, expect } from "@playwright/test";
import {
  CHANNEL_REGISTRY,
  getChannel,
  channelsByKind,
  channelsByLanguage,
  englishFirstOrder,
} from "../lib/channels/registry";

test("every channel has required registry fields", () => {
  for (const c of CHANNEL_REGISTRY) {
    expect(c.id).toBeTruthy();
    expect(c.language).toBeTruthy();
    expect(c.audience).toBeTruthy();
    expect(c.allowed_content_types.length).toBeGreaterThan(0);
    expect(c.link_policy).toBeTruthy();
    expect(c.tone).toBeTruthy();
    expect(["api", "mcp", "browser", "computer-use", "manual"]).toContain(c.publish_method);
    expect(c.compliance_notes).toBeTruthy();
  }
});

test("channel ids are unique", () => {
  const ids = CHANNEL_REGISTRY.map((c) => c.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("registry distinguishes social from community channels", () => {
  expect(channelsByKind("social").length).toBe(8);
  expect(channelsByKind("community").length).toBeGreaterThan(30);
});

test("getChannel resolves a known id", () => {
  expect(getChannel("hackernews")?.name).toBe("Hacker News");
  expect(getChannel("does-not-exist")).toBeUndefined();
});

test("channelsByLanguage groups Portuguese community channels", () => {
  const pt = channelsByLanguage("pt-BR");
  expect(pt.some((c) => c.id === "tabnews")).toBe(true);
});

test("englishFirstOrder puts English channels before localized ones", () => {
  const order = englishFirstOrder();
  const firstNonEnIndex = order.findIndex((c) => c.language !== "en");
  const lastEnIndex = order.map((c) => c.language).lastIndexOf("en");
  expect(lastEnIndex).toBeLessThan(firstNonEnIndex);
});
