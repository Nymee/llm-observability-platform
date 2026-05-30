# Architecture Notes

## System Overview

```
Browser
  │
  │  SSE stream  (POST /api/chat)
  ▼
┌─────────────────────────────────────────┐
│  Next.js 15  (frontend + API routes)    │
│  ├── /api/chat   → SDK → LLM           │
│  ├── /api/conversations  → Postgres     │
│  └── /dashboard  → Postgres            │
└────────────────┬────────────────────────┘
                 │ fire-and-forget POST /ingest
                 ▼
┌─────────────────────────────────────────┐
│  Express  Ingestion Service             │
│  ├── Zod validation                     │
│  └── BullMQ enqueue                     │
└────────────────┬────────────────────────┘
                 │ job
                 ▼
         Redis (BullMQ queue)
                 │ worker
                 ▼
            PostgreSQL
   ┌────────────────────────────┐
   │  conversations             │
   │  messages                  │
   │  inference_logs            │
   └────────────────────────────┘
```

---

## Ingestion Flow

Every LLM call goes through the SDK's `chat()` function which owns the full lifecycle:

1. **Request** — `chat()` calls `streamText()` from the Vercel AI SDK, passing the selected provider model and last 10 messages (short context window).
2. **TTFT capture** — `onChunk` fires on the first streamed token and records `firstTokenAt = Date.now()`. This gives us time-to-first-token independently from end-to-end latency.
3. **Completion** — `onFinish` fires when the stream ends. It assembles the payload: latency, TTFT, token counts, PII-redacted previews, and finish reason mapped to `success | error | cancelled`.
4. **Fire-and-forget** — `logInference()` POSTs to the ingestion service with a 3-second timeout. The result is never awaited in the request path — a logging failure is swallowed silently so it never surfaces to the user.
5. **Validation** — The ingestion service runs Zod validation on the payload. Invalid payloads are rejected with 400 before they touch the queue.
6. **Queue** — Valid jobs are pushed to a BullMQ queue backed by Redis. The HTTP response (202) is returned immediately — the caller doesn't wait for the DB write.
7. **Worker** — A BullMQ worker (running in the same Express process) picks up jobs, retries up to 3 times with exponential backoff, and `INSERT`s into `inference_logs`.

---

## Logging Strategy

| Decision | Reasoning |
|---|---|
| Fire-and-forget | Logging must never add latency to the user's chat response |
| 3-second SDK timeout | Prevents the SDK from hanging if ingestion is slow or down |
| BullMQ queue between ingest and DB | Decouples logging throughput from DB write speed; absorbs spikes |
| PII redaction before storage | Email, phone, SSN patterns stripped from previews at the SDK level — never reaches the wire |
| Short context window (10 messages) | Prevents token blowup on long conversations; logged separately from what's stored |
| TTFT as separate metric | `latency_ms` = end-to-end; `first_token_ms` = perceived responsiveness. Different signals. |
| `inference_logs` survive conversation delete | `ON DELETE SET NULL` on `conversation_id` — observability data has value independent of the chat session |

---

## Kubernetes Deployment

### Self-Hosted Setup (minikube for demo)

The application is packaged as Docker images and deployed on Kubernetes using minikube — a single-node k8s cluster that runs locally on the laptop. This satisfies the "self-hosted k8s" requirement: the cluster is provisioned, managed, and operated manually rather than through a managed cloud service.

```
Laptop
└── minikube (single-node k8s cluster)
    ├── namespace: llmobs
    ├── postgres  (Deployment + PVC + ClusterIP Service)
    ├── redis     (Deployment + ClusterIP Service)
    ├── ingestion (Deployment + ClusterIP Service)
    └── frontend  (Deployment + NodePort Service :30000)
```

**Manifests** live in `k8s/` and are applied with:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

**Secrets** (API keys, DB password) are stored in a k8s `Secret` object. ConfigMaps hold non-sensitive env vars. Neither is baked into the Docker image.

**Service types:**
- `ClusterIP` (default) — Postgres, Redis, Ingestion. Reachable only inside the cluster.
- `NodePort` — Frontend only. Exposed on port 30000 of the node's IP so external traffic can reach it.

### Public Demo via ngrok

Since minikube runs on a local machine without a public IP, [ngrok](https://ngrok.com) creates an encrypted tunnel from a public HTTPS URL to the local NodePort:

```
Internet → https://abc123.ngrok-free.app → ngrok agent → minikube :30000 → frontend pod
```

```bash
ngrok http http://$(minikube ip):30000
```

The ngrok URL is temporary (resets on restart) and only active while the laptop is on and ngrok is running. For a production deployment, the same manifests apply identically to any k8s cluster (k3s on a VPS, EKS, GKE etc.) with the NodePort replaced by an Ingress + LoadBalancer.

---

## Scaling Considerations

- **Ingestion service** — stateless HTTP server; horizontally scalable behind a load balancer. In production, split the BullMQ worker into its own `Deployment` so it scales independently from the HTTP layer.
- **Frontend** — stateless Next.js server; multiple replicas work without coordination.
- **Redis** — used only as a job queue, not for session state. A single instance handles high throughput; Redis Cluster if needed beyond that.
- **Postgres** — current single-node bottleneck. First step: PgBouncer for connection pooling. Second step: read replicas for dashboard queries.
- **BullMQ concurrency** — currently set to 5 concurrent DB writes per worker. Tune upward as Postgres capacity allows.

---

## Failure Handling Assumptions

| Failure | Behaviour |
|---|---|
| Ingestion service down | SDK swallows the HTTP error. Chat works; that call's log is lost. |
| Redis down | `inferenceQueue.add()` throws → ingestion returns 503. Chat still works; log is lost. |
| Postgres down (chat path) | `createConversation` / `createMessage` throws → chat route returns 500. User sees error. |
| Postgres down (worker path) | BullMQ retries up to 3× with exponential backoff. Job is preserved in Redis until DB recovers. |
| LLM provider error | Streamed as a `3:` error chunk. UI shows friendly message. Logged with `status: 'error'`. |
| Rate limit (429) | Detected in `onError`, shown to user as "Rate limit reached — please wait". Not retried by BullMQ (not a transient DB error). |
| Pod crash (k8s) | k8s restarts the pod automatically. BullMQ jobs in Redis survive the restart and are picked up on recovery. |
| Stale conversation ID on client | If a conversation is deleted from the DB while the browser still holds its ID, the next message fails with a FK violation. Clicking "New Chat" clears the stale state. |
