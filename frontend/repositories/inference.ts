import { db } from "@/lib/db";

export interface InferenceLog {
  id: string;
  conversation_id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  status: "success" | "error" | "cancelled";
  error_message: string | null;
  request_preview: string | null;
  response_preview: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface DashboardStats {
  total_requests: number;
  success_count: number;
  error_count: number;
  cancelled_count: number;
  avg_latency_ms: number;
  total_tokens: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { rows } = await db.query<DashboardStats>(`
    SELECT
      COUNT(*)                                          AS total_requests,
      COUNT(*) FILTER (WHERE status = 'success')       AS success_count,
      COUNT(*) FILTER (WHERE status = 'error')         AS error_count,
      COUNT(*) FILTER (WHERE status = 'cancelled')     AS cancelled_count,
      COALESCE(AVG(latency_ms), 0)::int                AS avg_latency_ms,
      COALESCE(SUM(total_tokens), 0)                   AS total_tokens
    FROM inference_logs
  `);
  return rows[0];
}

export async function getLatencyOverTime() {
  const { rows } = await db.query(`
    SELECT
      date_trunc('hour', created_at) AS hour,
      AVG(latency_ms)::int           AS avg_latency_ms,
      COUNT(*)                       AS request_count
    FROM inference_logs
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY 1
    ORDER BY 1 ASC
  `);
  return rows;
}

export async function getErrorRate() {
  const { rows } = await db.query(`
    SELECT
      date_trunc('hour', created_at)                                AS hour,
      COUNT(*) FILTER (WHERE status = 'error')::float / COUNT(*)   AS error_rate
    FROM inference_logs
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY 1
    ORDER BY 1 ASC
  `);
  return rows;
}

export async function getLogsByConversation(conversationId: string): Promise<InferenceLog[]> {
  const { rows } = await db.query<InferenceLog>(
    `SELECT * FROM inference_logs WHERE conversation_id = $1 ORDER BY created_at DESC`,
    [conversationId]
  );
  return rows;
}

export interface ProviderBreakdown {
  provider: string;
  request_count: number;
  avg_latency_ms: number;
  total_tokens: number;
}

export async function getProviderBreakdown(): Promise<ProviderBreakdown[]> {
  const { rows } = await db.query<ProviderBreakdown>(`
    SELECT
      provider,
      COUNT(*)                       AS request_count,
      COALESCE(AVG(latency_ms), 0)::int AS avg_latency_ms,
      COALESCE(SUM(total_tokens), 0) AS total_tokens
    FROM inference_logs
    GROUP BY provider
    ORDER BY request_count DESC
  `);
  return rows;
}
