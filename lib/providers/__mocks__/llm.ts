import type { GenerationResult, LLMTask } from "../types";
import type { LLMGenerateOptions, LLMProvider } from "../llm";

abstract class BaseMockLLM implements LLMProvider {
  abstract readonly name: string;
  abstract readonly cost_per_1k_in: number;
  abstract readonly cost_per_1k_out: number;

  async generate(prompt: string, opts: LLMGenerateOptions): Promise<GenerationResult> {
    const tokens = 100;
    const cost_usd = this.estimateCost(tokens, tokens);
    // Echo enough of the prompt that brief terms survive into the mock
    // output — a real LLM incorporates the brief, and downstream gates
    // (watcher topic-coverage) verify exactly that.
    const snippet = prompt.slice(0, 2000);
    return {
      ok: true,
      provider: this.name,
      task: opts.task,
      output: `[mock-${this.name}] ${snippet}...`,
      tokens,
      tokens_in: tokens,
      tokens_out: tokens,
      used_estimate: true,
      source: "tokenizer",
      encoding: "o200k_base",
      prompt_format: opts.system ? "toon" : "json",
      cache_status: opts.system ? "enabled" : "not_requested",
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: opts.system ? tokens : 0,
      cost_usd,
      latency_ms: 50,
    };
  }
  protected estimateCost(tokens_in: number, tokens_out: number): number {
    return (
      (tokens_in / 1000) * this.cost_per_1k_in +
      (tokens_out / 1000) * this.cost_per_1k_out
    );
  }
}

export class MockClaudeProvider extends BaseMockLLM {
  readonly name = "claude";
  readonly cost_per_1k_in = 0.003;
  readonly cost_per_1k_out = 0.015;
}

export class MockCodexProvider extends BaseMockLLM {
  readonly name = "codex";
  readonly cost_per_1k_in = 0.003;
  readonly cost_per_1k_out = 0.015;
}

export class MockDeepSeekProvider extends BaseMockLLM {
  readonly name = "deepseek";
  readonly cost_per_1k_in = 0.00014;
  readonly cost_per_1k_out = 0.00028;
}

export class MockOllamaProvider extends BaseMockLLM {
  readonly name = "ollama";
  readonly cost_per_1k_in = 0;
  readonly cost_per_1k_out = 0;
}

export const MOCK_LLM_REGISTRY: Record<string, () => LLMProvider> = {
  claude: () => new MockClaudeProvider(),
  codex: () => new MockCodexProvider(),
  deepseek: () => new MockDeepSeekProvider(),
  ollama: () => new MockOllamaProvider(),
};

export class FailingMockLLM implements LLMProvider {
  readonly name: string;
  private readonly _err: string;
  constructor(name: string, err = "synthetic failure") {
    this.name = name;
    this._err = err;
  }
  async generate(_p: string, opts: LLMGenerateOptions): Promise<GenerationResult> {
    void opts;
    throw new Error(this._err);
  }
}

export function _llmTaskFor(_task: LLMTask): string {
  void _task;
  return "claude";
}
