import { createGroq } from '@ai-sdk/groq';
import type { ILLMProvider } from '../types';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export class GroqProvider implements ILLMProvider {
  readonly name = 'groq' as const;
  readonly defaultModel = 'llama-3.3-70b-versatile';

  getModel(modelId?: string): unknown {
    return groq(modelId ?? this.defaultModel);
  }
}
