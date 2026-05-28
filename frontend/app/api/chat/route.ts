import { NextRequest } from "next/server";
import { z } from "zod";
import { chat } from "@llmobs/sdk";
import type { Provider } from "@llmobs/sdk";
import {
  createConversation,
  autoTitleConversation,
} from "@/repositories/conversations";
import { createMessage } from "@/repositories/messages";

const RequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
  conversationId: z.string().uuid().optional(),
  provider: z.enum(["google", "openai", "anthropic"]).default("google"),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // ── Parse + validate ─────────────────────────────────────────────────────────
  let body;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    return Response.json(
      { error: "Invalid request", details: err },
      { status: 400 },
    );
  }

  const { messages, provider, model } = body;
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!lastUserMessage) {
    return Response.json({ error: "No user message found" }, { status: 400 });
  }

  // ── Resolve conversation ──────────────────────────────────────────────────────
  let conversationId = body.conversationId;
  if (!conversationId) {
    const convo = await createConversation(
      provider,
      model ?? "gemini-1.5-flash",
    );
    conversationId = convo.id;
  }

  // ── Persist user message ──────────────────────────────────────────────────────
  await createMessage(conversationId, "user", lastUserMessage.content);

  // ── Call SDK — provider selection + streaming + inference logging ─────────────
  const result = await chat({
    provider: provider as Provider,
    model,
    messages,
    conversationId,
  });

  //  This only runs after stream finished (non-blocking). Persists message in DB
  result.text
    .then(async (text) => {
      await createMessage(conversationId!, "assistant", text);
      await autoTitleConversation(conversationId!, lastUserMessage.content);
    })
    .catch((err) =>
      console.error("[chat] Failed to save assistant message:", err),
    );

  //  Stream back to client conversationId in header for new conversations
  return result.toDataStreamResponse({
    headers: { "X-Conversation-Id": conversationId },
  });
}
