-- =============================================
-- SCHEMA REFACTOR: Entity-centric event sources
-- =============================================
-- This migration:
-- 1. Creates event_sources table (normalized from orgs/locations)
-- 2. Creates event_mentions table (provenance tracking)
-- 3. Creates event_organizers join table (many-to-many)
-- 4. Adds operator_org_id to locations
-- 5. Adds home_location_id to organizers
-- 6. Migrates existing data

-- =============================================
-- 1. CREATE event_sources TABLE
-- =============================================
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
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure at least one owner (unless it's an aggregator)
  CONSTRAINT event_sources_owner_check CHECK (
    is_aggregator = true OR organizer_id IS NOT NULL OR location_id IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_event_sources_org ON event_sources(organizer_id);
CREATE INDEX idx_event_sources_location ON event_sources(location_id);
CREATE INDEX idx_event_sources_type ON event_sources(type);
CREATE INDEX idx_event_sources_enabled ON event_sources(enabled) WHERE enabled = true;

-- RLS Policies
ALTER TABLE event_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event_sources" ON event_sources
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage event_sources" ON event_sources
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_event_sources_updated_at BEFORE UPDATE ON event_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. CREATE event_mentions TABLE
-- =============================================
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

-- Indexes
CREATE INDEX idx_event_mentions_event ON event_mentions(event_id);
CREATE INDEX idx_event_mentions_source ON event_mentions(source_id);
CREATE INDEX idx_event_mentions_found ON event_mentions(found_at);

-- RLS Policies
ALTER TABLE event_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event_mentions" ON event_mentions
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage event_mentions" ON event_mentions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- 3. CREATE event_organizers JOIN TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS event_organizers (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'primary' CHECK (role IN ('primary', 'co-promoter', 'presented_by', 'supported_by')),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  PRIMARY KEY (event_id, organizer_id)
);

-- Indexes
CREATE INDEX idx_event_organizers_org ON event_organizers(organizer_id);

-- RLS Policies
ALTER TABLE event_organizers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event_organizers" ON event_organizers
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage event_organizers" ON event_organizers
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- 4. ADD operator_org_id TO locations
-- =============================================
ALTER TABLE locations 
  ADD COLUMN IF NOT EXISTS operator_org_id UUID REFERENCES organizers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_locations_operator ON locations(operator_org_id);

-- =============================================
-- 5. ADD home_location_id TO organizers
-- =============================================
ALTER TABLE organizers 
  ADD COLUMN IF NOT EXISTS home_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organizers_home_location ON organizers(home_location_id);

-- =============================================
-- 6. MIGRATE DATA: event_aggregators → event_sources
-- =============================================
INSERT INTO event_sources (url, type, is_aggregator, enabled, reliability_score, last_scraped_at, created_at)
SELECT 
  COALESCE(events_url, base_url) AS url,
  'aggregator' AS type,
  true AS is_aggregator,
  is_active AS enabled,
  scrape_priority AS reliability_score,
  last_scraped_at,
  created_at
FROM event_aggregators
WHERE COALESCE(events_url, base_url) IS NOT NULL
ON CONFLICT (url) DO NOTHING;

-- =============================================
-- 7. MIGRATE DATA: organizers.instagram_handle → event_sources
-- =============================================
INSERT INTO event_sources (url, type, organizer_id, is_aggregator, enabled, created_at)
SELECT 
  'https://www.instagram.com/' || REPLACE(instagram_handle, '@', '') || '/' AS url,
  'instagram' AS type,
  id AS organizer_id,
  false AS is_aggregator,
  true AS enabled,
  created_at
FROM organizers
WHERE instagram_handle IS NOT NULL AND instagram_handle != ''
ON CONFLICT (url) DO NOTHING;

-- =============================================
-- 8. MIGRATE DATA: organizers.event_sources jsonb → event_sources
-- =============================================
INSERT INTO event_sources (url, type, organizer_id, is_aggregator, enabled, created_at)
SELECT 
  value AS url,
  CASE 
    WHEN value LIKE '%instagram.com%' THEN 'instagram'
    WHEN value LIKE '%facebook.com%' THEN 'facebook'
    WHEN value LIKE '%ra.co%' THEN 'ra'
    ELSE 'website'
  END AS type,
  o.id AS organizer_id,
  false AS is_aggregator,
  true AS enabled,
  o.created_at
FROM organizers o,
LATERAL jsonb_each_text(o.event_sources) AS j(key, value)
WHERE o.event_sources IS NOT NULL 
  AND o.event_sources != '{}'::jsonb
  AND value IS NOT NULL
  AND value != ''
ON CONFLICT (url) DO NOTHING;

-- =============================================
-- 9. MIGRATE DATA: locations.event_sources jsonb → event_sources
-- =============================================
INSERT INTO event_sources (url, type, location_id, is_aggregator, enabled, created_at)
SELECT 
  value AS url,
  CASE 
    WHEN value LIKE '%instagram.com%' THEN 'instagram'
    WHEN value LIKE '%facebook.com%' THEN 'facebook'
    WHEN value LIKE '%ra.co%' THEN 'ra'
    ELSE 'website'
  END AS type,
  l.id AS location_id,
  false AS is_aggregator,
  true AS enabled,
  l.created_at
FROM locations l,
LATERAL jsonb_each_text(l.event_sources) AS j(key, value)
WHERE l.event_sources IS NOT NULL 
  AND l.event_sources != '{}'::jsonb
  AND value IS NOT NULL
  AND value != ''
ON CONFLICT (url) DO NOTHING;

-- =============================================
-- 10. MIGRATE DATA: events.organizer_id → event_organizers
-- =============================================
INSERT INTO event_organizers (event_id, organizer_id, role, created_at)
SELECT 
  id AS event_id,
  organizer_id,
  'primary' AS role,
  created_at
FROM events
WHERE organizer_id IS NOT NULL
ON CONFLICT (event_id, organizer_id) DO NOTHING;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE event_sources IS 'Normalized event sources - replaces event_sources jsonb fields and event_aggregators table';
COMMENT ON TABLE event_mentions IS 'Tracks where each event was discovered (provenance)';
COMMENT ON TABLE event_organizers IS 'Many-to-many relationship between events and organizers (supports co-promotion)';
COMMENT ON COLUMN locations.operator_org_id IS 'The organization that operates this venue';
COMMENT ON COLUMN organizers.home_location_id IS 'The home venue for this organization (if applicable)';
