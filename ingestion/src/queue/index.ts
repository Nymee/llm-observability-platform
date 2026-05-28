import { Queue } from "bullmq";

// Pass connection options directly — BullMQ v5 manages its own ioredis instance.
// Never pass an external IORedis instance; BullMQ bundles its own version which
// causes a type mismatch.
export const redisConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  maxRetriesPerRequest: null as null, // required by BullMQ
};

export const inferenceQueue = new Queue("inference-logs", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
