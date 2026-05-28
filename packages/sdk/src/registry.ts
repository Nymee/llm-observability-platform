import { GeminiProvider }    from './providers/gemini';
import { OpenAIProvider }    from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import type { ILLMProvider, Provider } from './types';

const PROVIDERS: Record<Provider, ILLMProvider> = {
  google:    new GeminiProvider(),
  openai:    new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
};

// Returns the provider instance for a given name.
// Throw early so callers get a clear error rather than a cryptic undefined.
export function getProvider(name: Provider): ILLMProvider {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`[sdk] Unknown provider: "${name}"`);
  return provider;
}

export function listProviders(): Provider[] {
  return Object.keys(PROVIDERS) as Provider[];
}
