/**
 * Model tier configuration for the agentic loop.
 *
 * Tiers:
 *   🟢 small  — classification, simple tasks (fast, cheap)
 *   🟡 mid    — planner, critic, RLM controller (balanced)
 *   🔴 frontier — synthesis, final polish (highest quality)
 *
 * Each tier reads from environment variables with fallback to defaults.
 * Set OPENAI_API_KEY (or tier-specific keys) in .env.
 */

export type ModelTier = 'small' | 'mid' | 'frontier';

export interface TierConfig {
  modelName: string;
  temperature: number;
  /** Optional override for OpenAI-compatible base URL (e.g. local vLLM) */
  baseUrl?: string;
  /** Optional override for API key (e.g. Anthropic key for frontier) */
  apiKey?: string;
}

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Resolve the configuration for a given model tier.
 */
export function getTierConfig(tier: ModelTier): TierConfig {
  switch (tier) {
    case 'small':
      return {
        modelName: process.env.SMALL_MODEL_NAME || DEFAULT_MODEL,
        temperature: 0,
        baseUrl: process.env.SMALL_MODEL_BASE_URL || undefined,
        apiKey: process.env.SMALL_MODEL_API_KEY || process.env.OPENAI_API_KEY,
      };
    case 'mid':
      return {
        modelName: process.env.MID_MODEL_NAME || DEFAULT_MODEL,
        temperature: 0,
        baseUrl: process.env.MID_MODEL_BASE_URL || undefined,
        apiKey: process.env.MID_MODEL_API_KEY || process.env.OPENAI_API_KEY,
      };
    case 'frontier':
      return {
        modelName: process.env.FRONTIER_MODEL_NAME || DEFAULT_MODEL,
        temperature: 0,
        baseUrl: process.env.FRONTIER_MODEL_BASE_URL || undefined,
        apiKey: process.env.FRONTIER_MODEL_API_KEY || process.env.OPENAI_API_KEY,
      };
  }
}

/**
 * Create a ChatOpenAI instance configured for the given tier.
 * Import ChatOpenAI at the call site to avoid circular deps.
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
    opts.configuration = { baseURL: cfg.baseUrl };
  }
  return opts;
}
