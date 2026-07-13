import { test, expect } from "@playwright/test";
import { runAutoresearch } from "../lib/loop/autoresearch";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("autoresearch records a fixed judge, holdout, cost, and DRY_RUN receipt", async () => {
  const root = await mkdtemp(join(tmpdir(), "me-autoresearch-"));
  const result = await runAutoresearch({ root, client: "demo", briefs: ["A clear onboarding story with a call to action."], maxIter: 2 });
  const manifest = JSON.parse(await readFile(result.manifest_path, "utf8"));
  expect(result.dry_run).toBe(true);
  expect(manifest.schema).toBe("marketing-autoresearch/v1");
  expect(manifest.judge).toMatchObject({ version: "judge/v1", temperature: 0 });
  expect(manifest.published).toBe(false);
  expect(manifest.validation_set.holdout_count).toBe(1);
  expect(manifest.validation_set.briefs_sha256).toMatch(/^[a-f0-9]{16}$/);
  expect(manifest.post_run_verification).toMatchObject({ pass: true, winners: 1 });
  expect(manifest.total_cost_usd).toBeGreaterThan(0);
  expect((await readFile(join(root, "data", "llm-usage.jsonl"), "utf8")).trim()).not.toBe("");
});
