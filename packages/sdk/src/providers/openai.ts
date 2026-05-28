import { openai } from '@ai-sdk/openai';
import type { ILLMProvider } from '../types';

export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai' as const;
  readonly defaultModel = 'gpt-4o-mini';

  getModel(modelId?: string) {
    return openai(modelId ?? this.defaultModel);
  }
}
