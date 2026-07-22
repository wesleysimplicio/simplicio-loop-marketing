import assert from "node:assert/strict";
import test from "node:test";
import { fetchAllIssues } from "../../lib/audit/issues.ts";

test("paginates until a short page and supplies reproducible API parameters", async () => {
  const urls: string[] = [];
  const fetcher = async (input: string | URL | Request) => {
    urls.push(String(input));
    const count = urls.length === 1 ? 100 : 2;
    return new Response(JSON.stringify(Array.from({ length: count }, (_, number) => ({ number }))));
  };
  const result = await fetchAllIssues("owner/repo", fetcher as typeof fetch);
  assert.equal(result.length, 102);
  assert.match(urls[0], /state=all.*direction=asc.*per_page=100.*page=1/);
  assert.match(urls[1], /page=2/);
});

test("reports GitHub failures without retrying forever", async () => {
  await assert.rejects(fetchAllIssues("owner/repo", async () => new Response("rate limited", { status: 429 })), /HTTP 429/);
});
