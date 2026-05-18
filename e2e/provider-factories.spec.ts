import { test, expect } from "@playwright/test";
import { getImageProvider } from "../lib/providers/image";
import { getLLMProvider } from "../lib/providers/llm";
import { getVideoProvider } from "../lib/providers/video";
import { resetMatrixCache } from "../lib/providers/matrix";

test.describe("provider factories", () => {
  test.afterEach(() => {
    delete process.env.DRY_RUN;
    resetMatrixCache();
  });

  test("return real providers when DRY_RUN=false", async () => {
    process.env.DRY_RUN = "false";

    const llm = getLLMProvider("script");
    expect(llm.name).toBe("claude");
    await expect(llm.generate("hello", { task: "script" })).rejects.toThrow(
      /ANTHROPIC_API_KEY missing/i,
    );

    const image = getImageProvider("quote-card");
    expect(image.name).toBe("gpt-image");
    await expect(
      image.generate("hello", { task: "quote-card", aspect: "1:1" }),
    ).rejects.toThrow(/OPENAI_API_KEY missing/i);

    const video = getVideoProvider("cinematic-reel");
    expect(video.name).toBe("higgsfield");
    await expect(
      video.generate("hello", { task: "cinematic-reel", aspect: "9:16", duration_s: 5 }),
    ).rejects.toThrow(/HIGGSFIELD_MCP_ACTIVE not true/i);
  });
});
