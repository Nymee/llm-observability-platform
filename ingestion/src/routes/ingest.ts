import { Router } from "express";
import { InferenceLogSchema } from "../validators/log";
import { inferenceQueue } from "../queue/index";

const router = Router();

// SDK POSTs here after every inference call.
// We validate the payload and enqueue the job immediately — no DB write here.
// The worker picks it up and writes to Postgres asynchronously.
// This keeps the response fast and decoupled from DB availability.
router.post("/ingest", async (req, res) => {
  const result = InferenceLogSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: result.error.flatten(),
    });
  }

  try {
    await inferenceQueue.add("log", result.data);
  } catch (err) {
    console.error("[ingest] failed to enqueue job:", err instanceof Error ? err.message : String(err));
    return res.status(503).json({ error: "Queue unavailable" });
  }

  return res.status(202).json({ queued: true });
});

export default router;
