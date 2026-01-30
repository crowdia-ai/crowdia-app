
-- =============================================
-- SCHEMA REFACTOR: Entity-centric event sources
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================

-- 1. CREATE event_sources TABLE
CREATE TABLE IF NOT EXISTS event_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('website', 'instagram', 'facebook', 'ra', 'aggregator', 'other')),
  organizer_id UUID REFERENCES organizers(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  is_aggregator BOOLEAN DEFAULT false,
  scrape_frequency INTERVAL DEFAULT '1 day',
  last_scraped_at TIMESTAMPTZ,
  reliability_score INTEGER DEFAULT 50,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_sources_org ON event_sources(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_sources_location ON event_sources(location_id);
CREATE INDEX IF NOT EXISTS idx_event_sources_type ON event_sources(type);
CREATE INDEX IF NOT EXISTS idx_event_sources_enabled ON event_sources(enabled) WHERE enabled = true;

ALTER TABLE event_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view event_sources" ON event_sources;
DROP POLICY IF EXISTS "Service role can manage event_sources" ON event_sources;
CREATE POLICY "Anyone can view event_sources" ON event_sources FOR SELECT USING (true);
CREATE POLICY "Service role can manage event_sources" ON event_sources FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Trigger for updated_at (use existing function)
DROP TRIGGER IF EXISTS update_event_sources_updated_at ON event_sources;
CREATE TRIGGER update_event_sources_updated_at BEFORE UPDATE ON event_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. CREATE event_mentions TABLE
CREATE TABLE IF NOT EXISTS event_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES event_sources(id) ON DELETE CASCADE,
  found_at TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB,
  confidence_score INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_event_mentions_event ON event_mentions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_mentions_source ON event_mentions(source_id);
CREATE INDEX IF NOT EXISTS idx_event_mentions_found ON event_mentions(found_at);

ALTER TABLE event_mentions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view event_mentions" ON event_mentions;
DROP POLICY IF EXISTS "Service role can manage event_mentions" ON event_mentions;
CREATE POLICY "Anyone can view event_mentions" ON event_mentions FOR SELECT USING (true);
CREATE POLICY "Service role can manage event_mentions" ON event_mentions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 3. CREATE event_organizers JOIN TABLE
CREATE TABLE IF NOT EXISTS event_organizers (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'primary' CHECK (role IN ('primary', 'co-promoter', 'presented_by', 'supported_by')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (event_id, organizer_id)
);

CREATE INDEX IF NOT EXISTS idx_event_organizers_org ON event_organizers(organizer_id);

ALTER TABLE event_organizers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view event_organizers" ON event_organizers;
DROP POLICY IF EXISTS "Service role can manage event_organizers" ON event_organizers;
CREATE POLICY "Anyone can view event_organizers" ON event_organizers FOR SELECT USING (true);
CREATE POLICY "Service role can manage event_organizers" ON event_organizers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 4. ADD operator_org_id TO locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS operator_org_id UUID REFERENCES organizers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_locations_operator ON locations(operator_org_id);

-- 5. ADD home_location_id TO organizers
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS home_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_organizers_home_location ON organizers(home_location_id);

-- Comments
COMMENT ON TABLE event_sources IS 'Normalized event sources - replaces event_sources jsonb fields and event_aggregators table';
COMMENT ON TABLE event_mentions IS 'Tracks where each event was discovered (provenance)';
COMMENT ON TABLE event_organizers IS 'Many-to-many relationship between events and organizers (supports co-promotion)';
COMMENT ON COLUMN locations.operator_org_id IS 'The organization that operates this venue';
COMMENT ON COLUMN organizers.home_location_id IS 'The home venue for this organization (if applicable)';
