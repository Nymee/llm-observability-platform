import axios from "axios";
import type { InferenceLogPayload } from "./types";

// POSTs one inference log to the ingestion service.
// Errors are intentionally swallowed as a logging failure must never
// surface to the user or crash the chat response.
export async function logInference(
  payload: InferenceLogPayload,
): Promise<void> {
  const url = process.env.INGESTION_SERVICE_URL;
  if (!url) {
    console.warn("[sdk] INGESTION_SERVICE_URL not set — skipping log");
    return;
  }

  try {
    await axios.post(`${url}/ingest`, payload, { timeout: 3000 });
  } catch (err) {
    console.error(
      "[sdk] Failed to deliver inference log:",
      err instanceof Error ? err.message : String(err),
    );
  }
}
