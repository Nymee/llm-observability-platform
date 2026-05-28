import express from "express";
import cors from "cors";
import ingestRouter from "./routes/ingest";
import healthRouter from "./routes/health";
import { startWorker } from "./queue/worker";

const app = express();
const PORT = parseInt(process.env.INGESTION_PORT ?? "4001", 10);

app.use(cors());
app.use(express.json());

app.use(ingestRouter);
app.use(healthRouter);

// Start the BullMQ worker in the same process.
// In production you could split this into a separate container.
startWorker();

app.listen(PORT, () => {
  console.log(`[ingestion] listening on port ${PORT}`);
});
