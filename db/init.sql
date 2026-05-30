
--  PostgreSQL Schema
-- Auto-executed by Docker on first container boot.

                             -- conversations 
-- One row per conversation. is_active indicates which provider/model was active so the
-- conversation can be resumed on the same model the user started with.
CREATE TABLE conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255)    NOT NULL DEFAULT 'New Conversation',
    provider    VARCHAR(50)     NOT NULL DEFAULT 'google',
    model       VARCHAR(100)    NOT NULL DEFAULT 'gemini-1.5-flash',
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

                        --  messages 
-- Stores messages of all conversations. One row per message.
-- Ordered by created_at.
-- Cascade delete on ensures all messages of a conversation and deleted if a conversation is deleted.
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);


                        --  inference_logs 
-- One row per LLM API call. possible columns written with metadata for JSONB structure
CREATE TABLE inference_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID         REFERENCES conversations(id) ON DELETE SET NULL,
    provider         VARCHAR(50)  NOT NULL,
    model            VARCHAR(100) NOT NULL,
    input_tokens     INTEGER,
    output_tokens    INTEGER,
    total_tokens     INTEGER GENERATED ALWAYS AS (
                         COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
                     ) STORED,
    latency_ms       INTEGER CHECK (latency_ms >= 0),
    first_token_ms   INTEGER CHECK (first_token_ms >= 0), -- time from request start to first token
    status           VARCHAR(20) NOT NULL DEFAULT 'success'
                         CHECK (status IN ('success', 'error', 'cancelled')),
    error_message    TEXT,
    request_preview  VARCHAR(500),
    response_preview VARCHAR(500),
    metadata         JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inference_logs_conversation_id ON inference_logs(conversation_id);
CREATE INDEX idx_inference_logs_created_at      ON inference_logs(created_at);
CREATE INDEX idx_inference_logs_provider        ON inference_logs(provider);
CREATE INDEX idx_inference_logs_status          ON inference_logs(status);

-- auto-update conversations.updated_at 
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
