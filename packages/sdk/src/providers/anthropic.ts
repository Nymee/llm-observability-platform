import { anthropic } from '@ai-sdk/anthropic';
import type { ILLMProvider } from '../types';

export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic' as const;
  readonly defaultModel = 'claude-haiku-4-5-20251001';

  getModel(modelId?: string) {
    return anthropic(modelId ?? this.defaultModel);
  }
}
