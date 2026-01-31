/**
 * Create AI SDK provider from a provider URL.
 * Supports OpenAI-compatible, Anthropic, and Google endpoints.
 */
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

interface ProviderConfig {
  provider_url: string;
  api_key: string;
  model_name: string;
}

export function createProvider(config: ProviderConfig) {
  const url = config.provider_url.toLowerCase();

  // Anthropic
  if (url.includes('anthropic')) {
    const anthropic = createAnthropic({ apiKey: config.api_key });
    return anthropic(config.model_name);
  }

  // Google
  if (url.includes('googleapis') || url.includes('generativelanguage')) {
    const google = createGoogleGenerativeAI({ apiKey: config.api_key });
    return google(config.model_name);
  }

  // OpenAI-compatible (OpenAI, OpenRouter, Together, Groq, local, etc.)
  const openai = createOpenAI({
    apiKey: config.api_key,
    baseURL: config.provider_url,
  });
  return openai(config.model_name);
}
