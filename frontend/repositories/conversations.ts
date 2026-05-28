import { db } from "@/lib/db";

export interface Conversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function createConversation(
  provider: string,
  model: string
): Promise<Conversation> {
  const { rows } = await db.query<Conversation>(
    `INSERT INTO conversations (provider, model) VALUES ($1, $2) RETURNING *`,
    [provider, model]
  );
  return rows[0];
}

export async function listConversations(): Promise<Conversation[]> {
  const { rows } = await db.query<Conversation>(
    `SELECT * FROM conversations ORDER BY updated_at DESC`
  );
  return rows;
}

export async function findConversation(id: string): Promise<Conversation | null> {
  const { rows } = await db.query<Conversation>(
    `SELECT * FROM conversations WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

// Only updates title if it hasn't been set yet (still 'New Conversation').
// Auto-titles from the first user message.
export async function autoTitleConversation(
  id: string,
  firstMessage: string
): Promise<void> {
  await db.query(
    `UPDATE conversations SET title = $1 WHERE id = $2 AND title = 'New Conversation'`,
    [firstMessage.slice(0, 80), id]
  );
}

export async function deleteConversation(id: string): Promise<void> {
  await db.query(`DELETE FROM conversations WHERE id = $1`, [id]);
}
