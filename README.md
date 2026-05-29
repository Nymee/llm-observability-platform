# LLM Observability Platform

Multi-provider chatbot with real-time inference logging, a BullMQ ingestion pipeline, and a live dashboard.

## One-command start

```bash
cp .env.example .env          # fill in at least GOOGLE_GENERATIVE_AI_API_KEY
docker compose up --build
```

| Service    | URL                       |
|------------|---------------------------|
| Chat UI    | http://localhost:3000      |
| Dashboard  | http://localhost:3000/dashboard |
| Ingestion  | http://localhost:4001      |

## Architecture

```
Browser
  │
  │  SSE stream (POST /api/chat)
  ▼
Next.js  ──── repositories ────► PostgreSQL
  │                 ▲
  │  SDK chat()     │ inference_logs
  ▼                 │
@llmobs/sdk ────────┘
  │
  │  POST /ingest (fire-and-forget)
  ▼
Express ingestion service
  │
  │  enqueue job
  ▼
BullMQ (Redis) ── worker ──► PostgreSQL
```

### Components

| Layer | Technology | Why |
|-------|-----------|-----|
| Chat UI + API routes | Next.js 15 App Router | SSE streaming via `Response` + client-side `useChat` hook; one deploy unit |
| SDK | TypeScript (`@llmobs/sdk`) | Provider abstraction, TTFT capture, PII redaction, fire-and-forget logging all in one `chat()` call |
| Ingestion service | Express + BullMQ | Persistent Node process required for BullMQ worker; decouples logging from request path |
| Queue | Redis + BullMQ v5 | Exponential-backoff retry, job persistence across restarts, concurrency control |
| Database | PostgreSQL 16 (raw `pg`) | Explicit schema ownership; no ORM migration layer to debug |

### Why not a single Next.js backend?

Next.js API routes are serverless-style — each invocation is stateless and short-lived. BullMQ workers need a persistent process that survives between jobs to poll Redis and execute retries. Running a worker inside a Next.js route would either never start (`await` resolves immediately) or leak across invocations. The separate Express process is the minimal correct solution.

### Why Express + BullMQ instead of pure REST logging?

Fire-and-forget HTTP from the SDK means a single slow or crashed POST won't block the user's chat response. BullMQ adds:
- **Retries with exponential backoff** — transient DB failures don't lose logs
- **Concurrency control** — worker processes 5 jobs in parallel without overloading Postgres
- **Durability** — jobs survive an ingestion service restart

## Schema design

```sql
conversations   -- one row per chat session; tracks provider + model
messages        -- full message history; FK to conversations (CASCADE DELETE)
inference_logs  -- one row per LLM call; FK to conversations
```

Key decisions:

- **`total_tokens` is a generated column** (`COALESCE(input_tokens,0) + COALESCE(output_tokens,0) STORED`) — never out of sync, never manually set.
- **`first_token_ms`** — captures TTFT (time-to-first-token) independently from `latency_ms` (end-to-end). Both have `CHECK (>= 0)`.
- **`status` CHECK constraint** — only `'success'`, `'error'`, `'cancelled'` are valid. Mapped from Vercel SDK's `finishReason`.
- **`request_preview` / `response_preview`** — capped at 500 chars, PII-redacted (email, phone, SSN patterns stripped) before insert.
- **No `message_id` FK on `inference_logs`** — inference logs belong to a conversation, not a specific message. A single user turn may trigger retries or parallel calls; tying to a message_id creates false 1:1 coupling.
- **`pgcrypto` extension** — `gen_random_uuid()` used for all primary keys; explicit rather than relying on a Postgres version assumption.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes | — | Gemini API key |
| `OPENAI_API_KEY` | no | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | no | — | Anthropic API key |
| `DATABASE_URL` | yes | see compose | PostgreSQL connection string |
| `INGESTION_SERVICE_URL` | yes | `http://localhost:4001` | URL the SDK POSTs logs to |
| `REDIS_HOST` | no | `localhost` | Redis host for BullMQ |
| `REDIS_PORT` | no | `6379` | Redis port |
| `NEXT_PUBLIC_DEFAULT_PROVIDER` | no | `google` | Default provider shown in UI |

## SDK usage

```typescript
import { chat } from "@llmobs/sdk";

const result = await chat({
  provider: "google",
  model: "gemini-1.5-flash",
  conversationId: "uuid-here",
  messages: [{ role: "user", content: "Hello" }],
});

// result is a Vercel AI SDK StreamTextResult — pipe directly to Response
return result.toDataStreamResponse();
```

`chat()` owns the full lifecycle: provider selection, `streamText()` call, TTFT capture via `onChunk`, and fire-and-forget log dispatch in `onFinish`. Logging failures are swallowed — they never surface to the caller.

## What I'd improve with more time

- **Auth** — conversations are currently unscoped; add a session cookie and filter by user ID
- **Dashboard time-range picker** — currently fixed at last 24 h
- **Per-model latency breakdown** — the data is there; add a grouped bar chart
- **Worker process separation** — split the BullMQ worker into its own container for independent scaling
- **OpenTelemetry export** — emit spans to Jaeger/Tempo alongside the custom Postgres logs
- **Streaming token throughput** — count tokens per second from `onChunk`; currently only TTFT is captured
