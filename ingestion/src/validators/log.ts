import { z } from "zod";

// Must match InferenceLogPayload in packages/sdk/src/types.ts
export const InferenceLogSchema = z.object({
  conversationId: z.string().uuid(),
  provider:       z.enum(["google", "openai", "anthropic", "groq"]),
  model:          z.string().min(1),
  inputTokens:    z.number().int().nonnegative().optional(),
  outputTokens:   z.number().int().nonnegative().optional(),
  latencyMs:      z.number().int().nonnegative(),
  firstTokenMs:   z.number().int().nonnegative().optional(),
  status:         z.enum(["success", "error", "cancelled"]),
  errorMessage:   z.string().optional(),
  requestPreview: z.string().max(500),
  responsePreview:z.string().max(500),
  metadata:       z.record(z.unknown()).optional(),
});

export type InferenceLogInput = z.infer<typeof InferenceLogSchema>;
