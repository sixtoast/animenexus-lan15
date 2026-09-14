CREATE TABLE IF NOT EXISTS anime_semantic_index (
  nexus_id TEXT PRIMARY KEY,
  fingerprint JSONB NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  fingerprint_source TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anime_semantic_index_confidence_idx
  ON anime_semantic_index (confidence DESC);

CREATE INDEX IF NOT EXISTS anime_semantic_index_updated_idx
  ON anime_semantic_index (updated_at DESC);

ALTER TABLE anime_semantic_index ENABLE ROW LEVEL SECURITY;
