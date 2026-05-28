import { listMessages } from "@/repositories/messages";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const messages = await listMessages(id);
  return Response.json(messages);
}
