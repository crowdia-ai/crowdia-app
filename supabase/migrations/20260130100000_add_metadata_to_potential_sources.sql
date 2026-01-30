-- Add metadata column to potential_sources for storing extra info
-- (e.g., original_name for websites, hostname for URLs)

ALTER TABLE potential_sources
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for metadata queries if needed
CREATE INDEX IF NOT EXISTS idx_potential_sources_metadata ON potential_sources USING gin(metadata);

COMMENT ON COLUMN potential_sources.metadata IS 'Extra metadata like original_name, hostname, etc.';
