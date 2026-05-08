import type { GenerationResult, LLMTask } from "./types";

export interface LLMGenerateOptions {
  task: LLMTask;
  max_tokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  name: string;
  generate(prompt: string, opts: LLMGenerateOptions): Promise<GenerationResult>;
}

abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: string;
  abstract readonly cost_per_1k_in: number;
  abstract readonly cost_per_1k_out: number;

  async generate(prompt: string, opts: LLMGenerateOptions): Promise<GenerationResult> {
    const tokens = 100;
    const cost_usd = this.estimateCost(tokens, tokens);
    const snippet = prompt.slice(0, 40);
    return {
      ok: true,
      provider: this.name,
      task: opts.task,
      output: `[mock-${this.name}] ${snippet}...`,
      tokens,
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

export class ClaudeProvider extends BaseLLMProvider {
  readonly name = "claude";
  readonly cost_per_1k_in = 0.003;
  readonly cost_per_1k_out = 0.015;
}

export class CodexProvider extends BaseLLMProvider {
  readonly name = "codex";
  readonly cost_per_1k_in = 0.003;
  readonly cost_per_1k_out = 0.015;
}

export class DeepSeekProvider extends BaseLLMProvider {
  readonly name = "deepseek";
  readonly cost_per_1k_in = 0.00014;
  readonly cost_per_1k_out = 0.00028;
}

export class OllamaProvider extends BaseLLMProvider {
  readonly name = "ollama";
  readonly cost_per_1k_in = 0;
  readonly cost_per_1k_out = 0;
}

const LLM_REGISTRY: Record<string, () => LLMProvider> = {
  claude: () => new ClaudeProvider(),
  codex: () => new CodexProvider(),
  deepseek: () => new DeepSeekProvider(),
  ollama: () => new OllamaProvider(),
};

const LLM_TASK_DEFAULTS: Record<LLMTask, string> = {
  orchestration: "claude",
  code: "claude",
  caption: "deepseek",
  script: "claude",
  compliance: "claude",
  translation: "deepseek",
  humanization: "claude",
};

export interface LLMFactoryOptions {
  override?: string;
}

export function getLLMProvider(task: LLMTask, opts?: LLMFactoryOptions): LLMProvider {
  const env_default = process.env.LLM_DEFAULT;
  const override = opts?.override;
  const candidate = override ?? LLM_TASK_DEFAULTS[task] ?? env_default ?? "claude";
  const factory = LLM_REGISTRY[candidate] ?? LLM_REGISTRY["claude"];
  if (!factory) {
    return new ClaudeProvider();
  }
  return factory();
}
