import { Worker } from "bullmq";
import { redis, inferenceQueue } from "./index";
import { db } from "../db/client";
import type { InferenceLogInput } from "../validators/log";

// Processes one job at a time — writes the inference log to Postgres.
// BullMQ handles retries automatically on failure.
export function startWorker() {
  const worker = new Worker<InferenceLogInput>(
    inferenceQueue.name,
    async (job) => {
      const d = job.data;

      await db.query(
        `INSERT INTO inference_logs (
          conversation_id, provider, model,
          input_tokens, output_tokens,
          latency_ms, first_token_ms,
          status, error_message,
          request_preview, response_preview, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          d.conversationId,
          d.provider,
          d.model,
          d.inputTokens ?? null,
          d.outputTokens ?? null,
          d.latencyMs,
          d.firstTokenMs ?? null,
          d.status,
          d.errorMessage ?? null,
          d.requestPreview,
          d.responsePreview,
          d.metadata ? JSON.stringify(d.metadata) : null,
        ]
      );
    },
    { connection: redis, concurrency: 5 }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] job ${job.id} written to DB`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
  });

  return worker;
}
