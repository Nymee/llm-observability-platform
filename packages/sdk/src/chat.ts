import { streamText } from "ai";
import { getProvider } from "./registry";
import { logInference } from "./logger";
import { redactPII } from "./pii";
import type { Provider, LLMMessage, LLMOptions } from "./types";

export interface ChatInput {
  provider: Provider;
  model?: string;
  messages: LLMMessage[];
  conversationId: string;
  options?: LLMOptions;
}

// Core SDK wrapper — every LLM call in the platform goes through here.
// Owns: provider selection, the actual LLM call, metadata capture, and
// async log dispatch to the ingestion service.
// Returns the raw streamText result so the caller controls how to stream
// it to the HTTP client (framework-specific concern, not the SDK's job).
export async function chat({ provider, model, messages, conversationId, options }: ChatInput) {
  const providerInstance = getProvider(provider);
  const resolvedModel = model ?? providerInstance.defaultModel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelInstance = providerInstance.getModel(resolvedModel) as any;

  const startedAt = Date.now();
  let firstTokenAt: number | null = null;
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const result = streamText({
    model: modelInstance,
    messages,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
    onChunk: () => {
      // Capture the timestamp of the very first token only
      if (!firstTokenAt) firstTokenAt = Date.now();
    },
    onFinish: async ({ text, usage, finishReason }) => {
      const latencyMs = Date.now() - startedAt;
      const firstTokenMs = firstTokenAt ? firstTokenAt - startedAt : undefined;

      const status =
        finishReason === "stop" || finishReason === "length"
          ? "success"
          : finishReason === "error"
            ? "error"
            : "cancelled";

      // Fire-and-forget — logging must never delay the chat response
      logInference({
        conversationId,
        provider,
        model: resolvedModel,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        latencyMs,
        firstTokenMs,
        status,
        requestPreview: redactPII(lastUserMessage.slice(0, 500)),
        responsePreview: redactPII(text.slice(0, 500)),
        metadata: { finishReason, timestamp: new Date(startedAt).toISOString() },
      });
    },
  });

  return result;
}
