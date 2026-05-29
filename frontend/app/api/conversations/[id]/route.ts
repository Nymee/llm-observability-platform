import { findConversation, deleteConversation } from "@/repositories/conversations";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const conversation = await findConversation(id);
    if (!conversation) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(conversation);
  } catch (err) {
    console.error("[conversations] fetch failed:", err);
    return Response.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    await deleteConversation(id);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[conversations] delete failed:", err);
    return Response.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
