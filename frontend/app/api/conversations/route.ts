import { listConversations } from "@/repositories/conversations";

export async function GET() {
  const conversations = await listConversations();
  return Response.json(conversations);
}
