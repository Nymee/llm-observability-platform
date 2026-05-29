import { listMessages } from "@/repositories/messages";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const messages = await listMessages(id);
    return Response.json(messages);
  } catch (err) {
    console.error("[messages] list failed:", err);
    return Response.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
