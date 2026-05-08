import { test, expect } from "@playwright/test";
import { routeImage, routeLLM, routeVideo } from "../lib/router";

test("LLM caption defaults to deepseek", () => {
  expect(routeLLM("caption")).toBe("deepseek");
});

test("LLM script defaults to claude", () => {
  expect(routeLLM("script")).toBe("claude");
});

test("LLM override wins over default", () => {
  expect(routeLLM("caption", "claude")).toBe("claude");
});

test("Image quote-card routes to gpt-image", () => {
  expect(routeImage("quote-card")).toBe("gpt-image");
});

test("Image ugc-ad routes to topview", () => {
  expect(routeImage("ugc-ad")).toBe("topview");
});

test("Video cinematic-reel routes to higgsfield", () => {
  expect(routeVideo("cinematic-reel")).toBe("higgsfield");
});
