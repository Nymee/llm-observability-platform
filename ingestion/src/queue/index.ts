import { Queue } from "bullmq";
import IORedis from "ioredis";

export const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null, // required by BullMQ
});

export const inferenceQueue = new Queue("inference-logs", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,                          // retry failed DB writes up to 3 times
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,                // keep last 100 completed jobs for debugging
    removeOnFail: 200,
  },
});
