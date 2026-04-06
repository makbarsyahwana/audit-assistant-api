/**
 * Vendor-agnostic model tier configuration for the agentic loop.
 *
 * Tiers:
 *   🟢 small    — classification, simple tasks (fast, cheap)
 *   🟡 mid      — planner, critic, RLM controller (balanced)
 *   🔴 frontier — synthesis, final polish (highest quality)
 *
 * Providers (value of *_MODEL_PROVIDER env var):
 *   - "openai_compatible"  Active — covers OpenAI, OpenRouter, vLLM, Ollama, Groq, etc.
 *   - "anthropic"          Planned — install @langchain/anthropic and implement branch.
 *   - "google"             Planned — install @langchain/google-genai and implement branch.
 *   - "ollama"             Planned — install @langchain/ollama and implement branch.
 *
 * API key fallback: tier key → OPENROUTER_API_KEY → OPENAI_API_KEY
 */

import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type ModelTier = 'small' | 'mid' | 'frontier';

export type LLMProvider = 'openai_compatible' | 'anthropic' | 'google' | 'ollama';

export interface TierConfig {
  provider: LLMProvider;
  modelName: string;
  temperature: number;
  /** Optional override for OpenAI-compatible base URL (e.g. OpenRouter, local vLLM) */
  baseUrl?: string;
  /** API key for the provider */
  apiKey?: string;
}

const DEFAULT_MODEL = 'gpt-4o-mini';

const OPENROUTER_HEADERS = {
  'HTTP-Referer': 'https://audit-assistant.app',
  'X-Title': 'AI RAG Audit Assistant',
};

/** Resolve the shared fallback API key (OPENROUTER_API_KEY → OPENAI_API_KEY). */
function fallbackApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || undefined;
}

/**
 * Resolve the configuration for a given model tier.
 */
export function getTierConfig(tier: ModelTier): TierConfig {
  switch (tier) {
    case 'small':
      return {
        provider: (process.env.SMALL_MODEL_PROVIDER as LLMProvider) || 'openai_compatible',
        modelName: process.env.SMALL_MODEL_NAME || DEFAULT_MODEL,
        temperature: 0,
        baseUrl: process.env.SMALL_MODEL_BASE_URL || undefined,
        apiKey: process.env.SMALL_MODEL_API_KEY || fallbackApiKey(),
      };
    case 'mid':
      return {
        provider: (process.env.MID_MODEL_PROVIDER as LLMProvider) || 'openai_compatible',
        modelName: process.env.MID_MODEL_NAME || DEFAULT_MODEL,
        temperature: 0,
        baseUrl: process.env.MID_MODEL_BASE_URL || undefined,
        apiKey: process.env.MID_MODEL_API_KEY || fallbackApiKey(),
      };
    case 'frontier':
      return {
        provider: (process.env.FRONTIER_MODEL_PROVIDER as LLMProvider) || 'openai_compatible',
        modelName: process.env.FRONTIER_MODEL_NAME || DEFAULT_MODEL,
        temperature: 0,
        baseUrl: process.env.FRONTIER_MODEL_BASE_URL || undefined,
        apiKey: process.env.FRONTIER_MODEL_API_KEY || fallbackApiKey(),
      };
  }
}

/**
 * Build a LangChain chat model for the given tier.
 *
 * Only 'openai_compatible' is active. Other providers throw NotImplementedError
 * until the matching @langchain/<provider> package is installed and wired in.
 */
export function buildChatModel(tier: ModelTier, temperature?: number): BaseChatModel {
  const cfg = getTierConfig(tier);
  const _temperature = temperature ?? cfg.temperature;

  if (cfg.provider === 'openai_compatible') {
    const opts: ConstructorParameters<typeof ChatOpenAI>[0] = {
      modelName: cfg.modelName,
      temperature: _temperature,
    };
    if (cfg.apiKey) {
      opts.openAIApiKey = cfg.apiKey;
    }
    if (cfg.baseUrl) {
      const isOpenRouter = cfg.baseUrl.includes('openrouter.ai');
      opts.configuration = {
        baseURL: cfg.baseUrl,
        ...(isOpenRouter ? { defaultHeaders: OPENROUTER_HEADERS } : {}),
      };
    }
    return new ChatOpenAI(opts);
  }

  throw new Error(
    `LLM provider '${cfg.provider}' is not yet implemented. ` +
      `Install the matching @langchain/${cfg.provider} package and add the branch in buildChatModel.`,
  );
}

/**
 * @deprecated Use buildChatModel() instead.
 * Kept for backward compatibility with existing call sites.
 */
export function getChatOpenAIConfig(tier: ModelTier): Record<string, unknown> {
  const cfg = getTierConfig(tier);
  const opts: Record<string, unknown> = {
    modelName: cfg.modelName,
    temperature: cfg.temperature,
  };
  if (cfg.apiKey) {
    opts.openAIApiKey = cfg.apiKey;
  }
  if (cfg.baseUrl) {
    const isOpenRouter = cfg.baseUrl.includes('openrouter.ai');
    opts.configuration = {
      baseURL: cfg.baseUrl,
      ...(isOpenRouter ? { defaultHeaders: OPENROUTER_HEADERS } : {}),
    };
  }
  return opts;
}
