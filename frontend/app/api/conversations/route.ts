import { listConversations } from "@/repositories/conversations";

export async function GET() {
  try {
    const conversations = await listConversations();
    return Response.json(conversations);
  } catch (err) {
    console.error("[conversations] list failed:", err);
    return Response.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}
