export type Provider = "google" | "openai" | "anthropic" | "groq";

export type MessageRole = "user" | "assistant" | "system";

export interface LLMMessage {
  role: MessageRole;
  content: string;
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// Payload expected to be sent to the ingestion service for every LLM call. Need to finalise after seeing actua response
export interface InferenceLogPayload {
  conversationId: string;
  provider: Provider;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  firstTokenMs?: number;       // time from request start to first token arriving
  status: "success" | "error" | "cancelled";
  errorMessage?: string;
  requestPreview: string;
  responsePreview: string;
  metadata?: Record<string, unknown>;
}

// Every provider class implements this interface.
// getModel() returns the AI SDK model object
export interface ILLMProvider {
  readonly name: Provider;
  readonly defaultModel: string;
  getModel(modelId?: string): unknown;
}
