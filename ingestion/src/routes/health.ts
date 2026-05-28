import { Router } from "express";
import { db } from "../db/client";
import { redis } from "../queue/index";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    await redis.ping();
    res.json({ status: "ok", db: "connected", redis: "connected" });
  } catch (err) {
    res.status(503).json({ status: "degraded", error: (err as Error).message });
  }
});

export default router;
