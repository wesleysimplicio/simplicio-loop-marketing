import { test, expect } from "@playwright/test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WavespeedProvider } from "../lib/providers/image";
import { WavespeedVideoProvider } from "../lib/providers/video";

test.describe("wavespeed providers", () => {
  const originalFetch = globalThis.fetch;

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.WAVESPEED_API_KEY;
  });

  test("image batch-ab expands variant axis and limits concurrency to five", async () => {
    process.env.WAVESPEED_API_KEY = "test-key";
    const outputDir = mkdtempSync(join(tmpdir(), "me-ws-img-"));
    const provider = new WavespeedProvider();
    let active = 0;
    let maxActive = 0;
    let submitCalls = 0;

    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "https://api.wavespeed.ai/api/v3/predictions") {
        submitCalls++;
        active++;
        maxActive = Math.max(maxActive, active);
        const payload = JSON.parse(String(init?.body ?? "{}"));
        await new Promise((resolve) => setTimeout(resolve, 10));
        active--;
        return new Response(
          JSON.stringify({
            output: [`https://cdn.example.test/${payload.input.prompt}.png`],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("png-binary", { status: 200 });
    }) as typeof globalThis.fetch;

    const result = await provider.generate(
      "Quote card with hook: { hook }",
      {
        task: "batch-ab",
        aspect: "1:1",
        model: "sdxl-turbo",
        output_dir: outputDir,
        variant_axis: {
          field: "hook",
          values: ["one", "two", "three", "four", "five", "six"],
        },
      },
    );

    expect(result.ok).toBe(true);
    expect(result.output).toHaveLength(6);
    expect(result.output?.every((path) => existsSync(path))).toBe(true);
    expect(result.cost_usd).toBeCloseTo(0.024, 6);
    expect(submitCalls).toBe(6);
    expect(maxActive).toBeLessThanOrEqual(5);
  });

  test("video batch-hooks polls wan-video jobs and saves each asset", async () => {
    process.env.WAVESPEED_API_KEY = "test-key";
    const outputDir = mkdtempSync(join(tmpdir(), "me-ws-vid-"));
    const provider = new WavespeedVideoProvider();
    const polls = new Map<string, number>();
    const created: string[] = [];

    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "https://api.wavespeed.ai/api/v3/predictions") {
        const payload = JSON.parse(String(init?.body ?? "{}"));
        created.push(payload.model);
        const id = `job-${created.length}`;
        return new Response(
          JSON.stringify({ id, status: "starting" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.startsWith("https://api.wavespeed.ai/api/v3/predictions/job-")) {
        const id = url.split("/").pop() ?? "job-unknown";
        const count = (polls.get(id) ?? 0) + 1;
        polls.set(id, count);
        return new Response(
          JSON.stringify({
            id,
            status: count > 1 ? "completed" : "processing",
            output: count > 1 ? [`https://cdn.example.test/${id}.mp4`] : undefined,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("video-binary", { status: 200 });
    }) as typeof globalThis.fetch;

    const result = await provider.generate(
      "Hook test: { hook }",
      {
        task: "batch-hooks",
        aspect: "9:16",
        duration_s: 15,
        output_dir: outputDir,
        variant_axis: {
          field: "hook",
          values: ["alpha", "beta"],
        },
      },
    );

    expect(created).toEqual(["wan-video", "wan-video"]);
    expect(Array.isArray(result.output)).toBe(true);
    expect(result.output).toHaveLength(2);
    expect((result.output as string[]).every((path) => existsSync(path))).toBe(true);
    expect(result.cost_usd).toBeCloseTo(0.1, 6);
  });
});
