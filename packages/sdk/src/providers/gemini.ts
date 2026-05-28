import { google } from '@ai-sdk/google';
import type { ILLMProvider } from '../types';

export class GeminiProvider implements ILLMProvider {
  readonly name = 'google' as const;
  readonly defaultModel = 'gemini-1.5-flash';

  getModel(modelId?: string) {
    return google(modelId ?? this.defaultModel);
  }
}
