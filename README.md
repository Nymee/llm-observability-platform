# LLM Observability Platform

A multi-provider chatbot with real-time inference logging, an event-driven ingestion pipeline, live dashboards, and a one-command Docker Compose setup. Deployed on self-hosted Kubernetes.

---

## Quick Start

```bash
cp .env.example .env        # fill in at least GOOGLE_GENERATIVE_AI_API_KEY and GROQ_API_KEY
docker compose up --build
```

| Service   | URL                             |
| --------- | ------------------------------- |
| Chat UI   | http://localhost:3000           |
| Dashboard | http://localhost:3000/dashboard |
| Ingestion | http://localhost:4001/health    |

---

## Architecture

```
Browser
  │
  │  SSE stream (POST /api/chat)
  ▼
Next.js (frontend + API routes)
  │                  │
  │                  └─── repositories ──► PostgreSQL
  │                            ▲
  │  @llmobs/sdk               │ messages, conversations
  │  ├── provider selection    │
  │  ├── streamText()          │
  │  ├── TTFT capture          │
  │  ├── PII redaction         │
  │  └── fire-and-forget log   │
  │             │              │
  │             │ POST /ingest │ inference_logs
  ▼             ▼              │
Express ingestion service      │
  │                            │
  │  enqueue job               │
  ▼                            │
BullMQ (Redis) ── worker ──────┘
```

### Component Decisions

| Layer                | Technology                 | Why                                                                                                   |
| -------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| Chat UI + API routes | Next.js 15 App Router      | SSE streaming via `Response` + `useChat` hook; one deploy unit                                        |
| SDK                  | `@llmobs/sdk` (TypeScript) | Provider abstraction, TTFT capture, PII redaction, fire-and-forget logging — all in one `chat()` call |
| Ingestion service    | Express + BullMQ           | BullMQ workers need a persistent process — Next.js serverless routes can't host them                  |
| Queue                | Redis + BullMQ v5          | Retry with exponential backoff, job durability across restarts, concurrency control                   |
| Database             | PostgreSQL 16 (raw `pg`)   | Explicit schema ownership; no ORM migration layer                                                     |

### Why not a single Next.js backend?

Next.js API routes are stateless and short-lived. BullMQ workers need a persistent process that survives between jobs to poll Redis and retry failures. Running a worker inside a Next.js route would either never start or leak across invocations.

### Why BullMQ over direct DB writes?

Fire-and-forget HTTP from the SDK means a slow or failed DB write never blocks the user's response. BullMQ adds:

- **Retries with exponential backoff** — transient failures don't lose logs
- **Concurrency control** — 5 parallel DB writes without overwhelming Postgres
- **Durability** — jobs survive an ingestion service restart

---

## Ingestion Flow

1. `chat()` in the SDK calls `streamText()` with `onChunk` (TTFT) and `onFinish` (log dispatch)
2. `onFinish` fires after the stream completes — PII is redacted, metadata is assembled
3. `logInference()` POSTs to the ingestion service with a 3-second timeout — errors are swallowed so logging never surfaces to the user
4. The ingestion service validates the payload with Zod and enqueues a BullMQ job (202 response)
5. The BullMQ worker picks up the job and `INSERT`s into `inference_logs`

---

## Logging Strategy

- **Fire-and-forget** — logging is async and never blocks the chat response
- **TTFT (time-to-first-token)** — captured via `onChunk`, stored as `first_token_ms`
- **PII redaction** — email, phone, and SSN patterns are stripped from request/response previews before storage
- **Short context window** — only the last 10 messages are sent to the model per request to control token costs
- **Status mapping** — Vercel AI SDK's `finishReason` (`stop`, `length`, `error`, `other`) is mapped to `success`, `error`, or `cancelled`

---

## Schema Design

```sql
conversations   — one row per chat session (provider, model, title, timestamps)
messages        — full message history (role, content, FK to conversations CASCADE DELETE)
inference_logs  — one row per LLM API call (metrics + metadata per call)
```

### Key Decisions

- **`total_tokens` is a generated column** — `COALESCE(input_tokens,0) + COALESCE(output_tokens,0) STORED`. Never out of sync, never manually maintained.
- **`first_token_ms` separate from `latency_ms`** — TTFT and end-to-end latency measure different things. Both have `CHECK (>= 0)`.
- **`status` CHECK constraint** — only `'success'`, `'error'`, `'cancelled'` are valid. Enforced at the DB level, not just application level.
- **`request_preview` / `response_preview` capped at 500 chars** — PII-redacted before insert. Avoids storing large blobs in a hot table.
- **`metadata JSONB`** — flexible bag for `finishReason`, timestamp, and any future fields. Typed columns for things you aggregate; JSONB for the rest.
- **No `message_id` FK on `inference_logs`** — a single user turn can trigger retries or parallel calls. Tying a log to a specific message creates false 1:1 coupling.
- **`pgcrypto` extension** — `gen_random_uuid()` for all primary keys, explicit rather than relying on a Postgres version assumption.

---

## Environment Variables

| Variable                       | Required | Description                                  |
| ------------------------------ | -------- | -------------------------------------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes      | Gemini API key (free at aistudio.google.com) |
| `GROQ_API_KEY`                 | yes      | Groq API key (free at console.groq.com)      |
| `OPENAI_API_KEY`               | no       | OpenAI API key                               |
| `ANTHROPIC_API_KEY`            | no       | Anthropic API key                            |
| `DATABASE_URL`                 | yes      | PostgreSQL connection string                 |
| `INGESTION_SERVICE_URL`        | yes      | URL the SDK POSTs logs to                    |
| `REDIS_HOST`                   | no       | Redis host (default: localhost)              |
| `REDIS_PORT`                   | no       | Redis port (default: 6379)                   |

---

## Kubernetes Deployment

Manifests are in `k8s/`. Deployable on any cluster with:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

Tested on a local minikube cluster. For a remote server, install k3s:

```bash
curl -sfL https://get.k3s.io | sh -
```

The frontend is exposed via `NodePort 30000`. Access at `http://<server-ip>:30000`.

---

## Scaling Considerations

- **Ingestion service** is stateless (except the BullMQ worker) — horizontally scalable. In production, split the worker into its own container.
- **Frontend** is stateless — multiple replicas behind a load balancer work without coordination.
- **Postgres** is the current bottleneck — connection pooling (PgBouncer) and read replicas would be the first scaling step.
- **Redis** is used only for the job queue — not for session state, so a single instance is fine until very high throughput.

---

## Failure Handling

- **Ingestion service down** — SDK swallows the error silently. Chat still works; logs are lost for that call.
- **Redis down** — `inferenceQueue.add()` throws a 503. Chat still works; logs are lost.
- **Postgres down** — chat route returns 500 before the LLM call. Ingestion worker retries the job up to 3 times with exponential backoff.
- **LLM provider error** — streamed as a `3:` error chunk to the client. UI shows a friendly error message. Error is logged to `inference_logs` with `status: 'error'`.
- **Rate limits** — BullMQ retries are not used for rate limit errors (they're not transient). The UI surfaces the rate limit message directly to the user.

---

## What I Would Improve With More Time

- **Auth** — conversations are unscoped. Add session cookies and filter by user ID.
- **Streaming token throughput** — count tokens per second from `onChunk`. Currently only TTFT is captured per-token.
- **Dashboard time-range picker** — currently fixed at last 24 h.
- **Per-model latency breakdown** — data is in the DB, just needs another chart.
- **Worker process separation** — split the BullMQ worker into its own container for independent scaling and restarts.
- **OpenTelemetry export** — emit spans to Jaeger/Tempo alongside the custom Postgres logs.
- **Ingestion service HA** — single point of failure currently. A second replica with Redis as shared queue coordinator would fix this.
- **PgBouncer** — connection pooling in front of Postgres for high concurrency.
- **Structured logging** — replace `console.log` with a structured logger (Winston or Pino) that emits JSON for log aggregation pipelines.
