-- Initialize pgvector extension and ai_vectors table for vector search
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_vectors (
  id BIGSERIAL PRIMARY KEY,
  message_id TEXT,
  conversation_id TEXT NOT NULL,
  role TEXT,
  content TEXT,
  turn INTEGER,
  embedding vector(1024) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fast filtering by conversation for scoped recall.
CREATE INDEX IF NOT EXISTS idx_ai_vectors_conversation_id
ON ai_vectors (conversation_id);

-- Useful when replaying a conversation in turn order.
CREATE INDEX IF NOT EXISTS idx_ai_vectors_conversation_turn
ON ai_vectors (conversation_id, turn);

-- Cosine search matches the pgvector query path in server/pg_db.py.
CREATE INDEX IF NOT EXISTS idx_ai_vectors_embedding_ivfflat
ON ai_vectors
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 20);
