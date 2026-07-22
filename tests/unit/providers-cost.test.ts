import test from "node:test";
import assert from "node:assert/strict";
import { estimateTokenDetails, resolveUsageWithFallback } from "../../lib/providers/cost.ts";

test("provider usage remains authoritative and does not invoke the tokenizer", () => {
  let calls = 0;
  const result = resolveUsageWithFallback({
    provider: "example",
    model: "unknown-model",
    prompt: "private prompt",
    output: "rendered output",
    tokens_in: 17,
    tokens_out: 23,
    tokenizer: () => { calls += 1; throw new Error("must not run"); },
  });
  assert.deepEqual(result, {
    tokens_in: 17,
    tokens_out: 23,
    used_estimate: false,
    source: "provider",
  });
  assert.equal(calls, 0);
});

test("BPE fallback handles PT-BR accents and emoji with explicit encoding provenance", () => {
  const result = resolveUsageWithFallback({
    provider: "example",
    model: "unknown-model",
    prompt: "Olá 👋🏽 mundo — ação",
    output: "Legenda pronta ✅",
  });
  assert.equal(result.source, "tokenizer");
  assert.equal(result.encoding, "o200k_base");
  assert.ok(result.tokens_in > 0);
  assert.ok(result.tokens_out > 0);
  assert.match(result.fallback_reason ?? "", /model_encoding_unknown/);
});

test("known model resolves its native encoding", () => {
  const result = estimateTokenDetails("A compact prompt", "gpt-4o");
  assert.equal(result.encoding, "o200k_base");
  assert.equal(result.fallback_reason, undefined);
  assert.ok(result.tokens > 0);
});

test("tokenizer failure is fail-open and marks the measurement unavailable", () => {
  const result = resolveUsageWithFallback({
    provider: "example",
    prompt: "never persisted",
    output: "final output",
    tokenizer: () => { throw new TypeError("synthetic tokenizer failure"); },
  });
  assert.equal(result.source, "unavailable");
  assert.equal(result.tokens_in, 0);
  assert.equal(result.tokens_out, 0);
  assert.equal(result.fallback_reason, "tokenizer_failed:TypeError");
});
