-- =============================================
-- DISCOVERY AGENT V2: Hashtag Stats & Provenance
-- =============================================
-- This migration adds:
-- 1. hashtag_stats table for tracking popular hashtags
-- 2. potential_sources queue for discovery agent
-- 3. Provenance fields on event_sources

-- =============================================
-- 1. CREATE hashtag_stats TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS hashtag_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT UNIQUE NOT NULL,
  occurrence_count INT DEFAULT 1,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  sources_using JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_hashtag_stats_tag ON hashtag_stats(tag);
CREATE INDEX idx_hashtag_stats_count ON hashtag_stats(occurrence_count DESC);
CREATE INDEX idx_hashtag_stats_last_seen ON hashtag_stats(last_seen_at DESC);

-- RLS Policies
ALTER TABLE hashtag_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hashtag_stats" ON hashtag_stats
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage hashtag_stats" ON hashtag_stats
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- 2. CREATE potential_sources TABLE (queue for discovery)
-- =============================================
CREATE TABLE IF NOT EXISTS potential_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,  -- Instagram handle without @
  platform TEXT NOT NULL DEFAULT 'instagram',
  discovered_via_source_id UUID REFERENCES event_sources(id) ON DELETE SET NULL,
  discovered_via_method TEXT NOT NULL CHECK (discovered_via_method IN (
    'mention', 'collab_post', 'hashtag', 'aggregator', 'web_search', 'manual', 'tagged_user'
  )),
  occurrence_count INT DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  validation_status TEXT CHECK (validation_status IN (
    'pending', 'validated', 'rejected', 'skipped'
  )) DEFAULT 'pending',
  validation_score INT,
  validation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(handle, platform)
);

-- Indexes
CREATE INDEX idx_potential_sources_status ON potential_sources(validation_status);
CREATE INDEX idx_potential_sources_count ON potential_sources(occurrence_count DESC);
CREATE INDEX idx_potential_sources_pending ON potential_sources(validation_status) WHERE validation_status = 'pending';

-- RLS Policies
ALTER TABLE potential_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view potential_sources" ON potential_sources
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage potential_sources" ON potential_sources
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- 3. ADD PROVENANCE FIELDS TO event_sources
-- =============================================
ALTER TABLE event_sources 
  ADD COLUMN IF NOT EXISTS discovered_via_source_id UUID REFERENCES event_sources(id) ON DELETE SET NULL;

ALTER TABLE event_sources 
  ADD COLUMN IF NOT EXISTS discovered_via_method TEXT CHECK (discovered_via_method IS NULL OR discovered_via_method IN (
    'mention', 'collab_post', 'hashtag', 'aggregator', 'web_search', 'manual', 'tagged_user'
  ));

ALTER TABLE event_sources 
  ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE event_sources 
  ADD COLUMN IF NOT EXISTS auto_discovered BOOLEAN DEFAULT false;

-- Add instagram_handle column for easier querying
ALTER TABLE event_sources
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- Index for provenance tracking
CREATE INDEX IF NOT EXISTS idx_event_sources_discovered_via ON event_sources(discovered_via_source_id);
CREATE INDEX IF NOT EXISTS idx_event_sources_auto_discovered ON event_sources(auto_discovered) WHERE auto_discovered = true;
CREATE INDEX IF NOT EXISTS idx_event_sources_instagram_handle ON event_sources(instagram_handle);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE hashtag_stats IS 'Tracks hashtag popularity from Instagram posts for discovery';
COMMENT ON TABLE potential_sources IS 'Queue of potential event sources discovered via mentions/collabs for validation';
COMMENT ON COLUMN event_sources.discovered_via_source_id IS 'The source that led to discovering this source';
COMMENT ON COLUMN event_sources.discovered_via_method IS 'How this source was discovered (mention, collab, etc.)';
COMMENT ON COLUMN event_sources.discovered_at IS 'When this source was discovered';
COMMENT ON COLUMN event_sources.auto_discovered IS 'Whether this source was auto-discovered by the discovery agent';
COMMENT ON COLUMN event_sources.instagram_handle IS 'Instagram handle without @ for quick lookups';
