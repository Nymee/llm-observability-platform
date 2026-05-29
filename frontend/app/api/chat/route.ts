import { NextRequest } from "next/server";
import { z } from "zod";
import { chat } from "@llmobs/sdk";
import type { Provider } from "@llmobs/sdk";
import {
  createConversation,
  autoTitleConversation,
} from "@/repositories/conversations";
import { createMessage } from "@/repositories/messages";
import { log, logError } from "@/lib/logger";

const RequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
  conversationId: z.string().uuid().nullish(),
  provider: z.enum(["google", "openai", "anthropic"]).default("google"),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  log("chat", "request received");

  let body;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    logError("chat", "validation failed", err);
    return Response.json({ error: "Invalid request", details: err }, { status: 400 });
  }

  const { messages, provider, model } = body;
  log("chat", `provider=${provider} model=${model ?? "default"} messages=${messages.length}`);

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return Response.json({ error: "No user message found" }, { status: 400 });
  }

  let conversationId = body.conversationId;
  try {
    if (!conversationId) {
      log("chat", "creating new conversation");
      const convo = await createConversation(provider, model ?? "gemini-2.5-flash");
      conversationId = convo.id;
      log("chat", `conversation created: ${conversationId}`);
    } else {
      log("chat", `resuming conversation: ${conversationId}`);
    }
    await createMessage(conversationId, "user", lastUserMessage.content);
    log("chat", "user message saved");
  } catch (err) {
    logError("chat", "DB error before LLM call", err);
    return Response.json({ error: "Failed to initialise conversation" }, { status: 500 });
  }

  // Keep only the most recent turns so we don't blow the context window
  const contextMessages = messages.slice(-10);

  log("chat", "calling LLM...");
  let result;
  try {
    result = await chat({ provider: provider as Provider, model, messages: contextMessages, conversationId });
    log("chat", "LLM stream started");
  } catch (err) {
    logError("chat", "LLM call failed", err);
    return Response.json({ error: "LLM provider error" }, { status: 502 });
  }

  result.text
    .then(async (text) => {
      log("chat", `stream complete, saving assistant message (${text.length} chars)`);
      await createMessage(conversationId!, "assistant", text);
      await autoTitleConversation(conversationId!, lastUserMessage.content);
    })
    .catch((err) => logError("chat", "failed to save assistant message", err));

  return result.toDataStreamResponse({ headers: { "X-Conversation-Id": conversationId } });
}
