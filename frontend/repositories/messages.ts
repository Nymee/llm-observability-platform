import { db } from "@/lib/db";

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: Date;
}

export async function createMessage(
  conversationId: string,
  role: Message["role"],
  content: string
): Promise<Message> {
  const { rows } = await db.query<Message>(
    `INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING *`,
    [conversationId, role, content]
  );
  return rows[0];
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { rows } = await db.query<Message>(
    `SELECT * FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId]
  );
  return rows;
}
