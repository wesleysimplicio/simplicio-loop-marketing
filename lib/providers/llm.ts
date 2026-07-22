import type { GenerationResult, LLMTask } from "./types";
import { llmRow, loadProviderMatrix } from "./matrix";
import { MOCK_LLM_REGISTRY } from "./__mocks__/llm";
import {
  estimateCost,
  resolveUsageWithFallback,
} from "./cost";
import { withRetry } from "./policy";

export interface LLMGenerateOptions {
  task: LLMTask;
  system?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  name: string;
  generate(prompt: string, opts: LLMGenerateOptions): Promise<GenerationResult>;
}

function deepseekModelForTask(task: LLMTask): string {
  switch (task) {
    case "caption":
    case "translation":
      return "deepseek-chat";
    default:
      return "deepseek-reasoner";
  }
}

function isDryRun(): boolean {
  const v = process.env.DRY_RUN;
  return v === undefined || v === "" || v === "true";
}

abstract class RealLLMBase implements LLMProvider {
  abstract readonly name: string;
  abstract realGenerate(
    prompt: string,
    opts: LLMGenerateOptions,
  ): Promise<GenerationResult>;

  async generate(prompt: string, opts: LLMGenerateOptions): Promise<GenerationResult> {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts += 1;
      return this.realGenerate(prompt, opts);
    }, {
      retries: 1,
      backoffMs: 2000,
      timeoutMs: opts.task === "script" ? 180_000 : 60_000,
    });
    return {
      ...result,
      attempt: attempts,
    };
  }
}

export class ClaudeProvider extends RealLLMBase {
  readonly name = "claude";
  async realGenerate(
    prompt: string,
    opts: LLMGenerateOptions,
  ): Promise<GenerationResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "claude: ANTHROPIC_API_KEY missing — set it or run with DRY_RUN=true",
      );
    }
    const model = opts.task === "caption" || opts.task === "humanization"
      ? "claude-sonnet-4-6"
      : "claude-opus-4-7";
    const t0 = Date.now();
    const body = {
      model,
      max_tokens: opts.max_tokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
      system: opts.system
        ? [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }]
        : undefined,
      messages: [{ role: "user", content: prompt }],
    };
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`claude: HTTP ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
    };
    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
    const usage = resolveUsageWithFallback({
      provider: this.name,
      model,
      prompt,
      output: text,
      tokens_in: data.usage?.input_tokens,
      tokens_out: data.usage?.output_tokens,
    });
    return {
      ok: true,
      provider: this.name,
      task: opts.task,
      output: text,
      tokens: usage.tokens_in + usage.tokens_out,
      tokens_in: usage.tokens_in,
      tokens_out: usage.tokens_out,
      used_estimate: usage.used_estimate,
      source: usage.source,
      encoding: usage.encoding,
      prompt_format: opts.system ? "toon" : "json",
      savings_tokens_est: 0,
      cache_read_input_tokens: data.usage?.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: data.usage?.cache_creation_input_tokens ?? 0,
      cache_status: (data.usage?.cache_read_input_tokens ?? 0) > 0 ? "hit" : opts.system ? "enabled" : "not_requested",
      fallback_reason: usage.fallback_reason,
      cost_usd: estimateCost({
        provider: "claude",
        model,
        tokens_in: usage.tokens_in,
        tokens_out: usage.tokens_out,
      }),
      latency_ms: Date.now() - t0,
    };
  }
}

export class CodexProvider extends RealLLMBase {
  readonly name = "codex";
  async realGenerate(
    prompt: string,
    opts: LLMGenerateOptions,
  ): Promise<GenerationResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("codex: OPENAI_API_KEY missing");
    }
    const model =
      opts.task === "caption" || opts.task === "translation"
        ? "gpt-5.1-mini"
        : "gpt-5.1";
    return callOpenAICompatible({
      apiKey,
      baseUrl: "https://api.openai.com/v1",
      providerName: "codex",
      model,
      prompt,
      opts,
    });
  }
}

export class DeepSeekProvider extends RealLLMBase {
  readonly name = "deepseek";
  async realGenerate(
    prompt: string,
    opts: LLMGenerateOptions,
  ): Promise<GenerationResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("deepseek: DEEPSEEK_API_KEY missing");
    const model = deepseekModelForTask(opts.task);
    return callOpenAICompatible({
      apiKey,
      baseUrl: "https://api.deepseek.com",
      providerName: "deepseek",
      model,
      prompt,
      opts,
    });
  }
}

export class OllamaProvider extends RealLLMBase {
  readonly name = "ollama";
  async realGenerate(
    prompt: string,
    opts: LLMGenerateOptions,
  ): Promise<GenerationResult> {
    const host = process.env.OLLAMA_HOST ?? "http://localhost:11434";
    const model = process.env.OLLAMA_MODEL ?? "llama3.2";
    const t0 = Date.now();
    const endpoint = `${host.replace(/\/+$/, "")}/api/chat`;
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: opts.system
            ? [
                { role: "system", content: opts.system },
                { role: "user", content: prompt },
              ]
            : [{ role: "user", content: prompt }],
          stream: false,
          options: {
            temperature: opts.temperature ?? 0.7,
            num_predict: opts.max_tokens ?? 1024,
          },
        }),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `ollama: could not reach ${endpoint} (${reason}). Start Ollama locally or set OLLAMA_HOST to a reachable server.`,
      );
    }
    if (!res.ok) {
      throw new Error(`ollama: HTTP ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const text = data.message?.content ?? "";
    return {
      ok: true,
      provider: this.name,
      task: opts.task,
      output: text,
      tokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      tokens_in: data.prompt_eval_count ?? 0,
      tokens_out: data.eval_count ?? 0,
      used_estimate: false,
      prompt_format: opts.system ? "toon" : "json",
      cache_status: "unsupported",
      cost_usd: 0,
      latency_ms: Date.now() - t0,
    };
  }
}

interface OpenAICompatibleArgs {
  apiKey: string;
  baseUrl: string;
  providerName: string;
  model: string;
  prompt: string;
  opts: LLMGenerateOptions;
}

async function callOpenAICompatible(
  args: OpenAICompatibleArgs,
): Promise<GenerationResult> {
  const { apiKey, baseUrl, providerName, model, prompt, opts } = args;
  const t0 = Date.now();
  const messages = opts.system
    ? [
        { role: "system", content: opts.system },
        { role: "user", content: prompt },
      ]
    : [{ role: "user", content: prompt }];
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: opts.max_tokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
    }),
  });
  if (!res.ok) {
    throw new Error(`${providerName}: HTTP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  const usage = resolveUsageWithFallback({
    provider: providerName,
    model,
    prompt,
    output: text,
    tokens_in: data.usage?.prompt_tokens,
    tokens_out: data.usage?.completion_tokens,
  });
  return {
    ok: true,
    provider: providerName,
    task: opts.task,
    output: text,
    tokens: usage.tokens_in + usage.tokens_out,
    tokens_in: usage.tokens_in,
    tokens_out: usage.tokens_out,
    used_estimate: usage.used_estimate,
    source: usage.source,
    encoding: usage.encoding,
    prompt_format: opts.system ? "toon" : "json",
      savings_tokens_est: 0,
      cache_status: opts.system ? "unsupported" : "not_requested",
      fallback_reason: usage.fallback_reason,
      cost_usd: estimateCost({
      provider: providerName,
      model,
      tokens_in: usage.tokens_in,
      tokens_out: usage.tokens_out,
    }),
    latency_ms: Date.now() - t0,
  };
}

const REAL_LLM_REGISTRY: Record<string, () => LLMProvider> = {
  claude: () => new ClaudeProvider(),
  codex: () => new CodexProvider(),
  deepseek: () => new DeepSeekProvider(),
  ollama: () => new OllamaProvider(),
};

export interface LLMFactoryOptions {
  override?: string;
}

export function getLLMProvider(task: LLMTask, opts?: LLMFactoryOptions): LLMProvider {
  const env_default = process.env.LLM_DEFAULT;
  const override = opts?.override;
  const fromMatrix = llmRow(task, loadProviderMatrix()).default;
  const candidate = override ?? fromMatrix ?? env_default ?? "claude";
  const registry = isDryRun() ? MOCK_LLM_REGISTRY : REAL_LLM_REGISTRY;
  const factory = registry[candidate] ?? registry["claude"];
  if (!factory) {
    return (isDryRun() ? MOCK_LLM_REGISTRY : REAL_LLM_REGISTRY)["claude"]();
  }
  return factory();
}

export function getLLMProviderByName(name: string): LLMProvider {
  const registry = isDryRun() ? MOCK_LLM_REGISTRY : REAL_LLM_REGISTRY;
  const factory = registry[name] ?? registry["claude"];
  return factory();
}
