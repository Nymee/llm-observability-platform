import { findConversation, deleteConversation } from "@/repositories/conversations";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const conversation = await findConversation(id);
  if (!conversation) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(conversation);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await deleteConversation(id);
  return new Response(null, { status: 204 });
}
