import { Router } from "express";
import { db } from "../db/client";
import { inferenceQueue } from "../queue";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    await inferenceQueue.getJobCounts(); // throws if Redis is unreachable
    res.json({ status: "ok", db: "connected", redis: "connected" });
  } catch (err) {
    res.status(503).json({ status: "degraded", error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
