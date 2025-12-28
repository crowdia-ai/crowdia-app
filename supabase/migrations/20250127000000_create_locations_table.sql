-- =============================================
-- DROP MATERIALIZED VIEW FIRST (depends on location columns)
-- =============================================
DROP TRIGGER IF EXISTS refresh_events_stats_on_interest ON event_interests;
DROP TRIGGER IF EXISTS refresh_events_stats_on_checkin ON event_check_ins;
DROP MATERIALIZED VIEW IF EXISTS events_with_stats;

-- =============================================
-- LOCATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(300) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add spatial index for location queries
CREATE INDEX idx_locations_coords ON locations USING GIST (
    ST_MakePoint(lng::float, lat::float)
);

-- Trigger for updated_at
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view locations"
    ON locations FOR SELECT
    USING (true);

CREATE POLICY "Organizers can create locations"
    ON locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organizers WHERE organizers.id = auth.uid()
        )
    );

-- =============================================
-- ORGANIZER_LOCATIONS JUNCTION TABLE (Many-to-Many)
-- =============================================
CREATE TABLE IF NOT EXISTS organizer_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organizer_id, location_id)
);

CREATE INDEX idx_organizer_locations_organizer ON organizer_locations(organizer_id);
CREATE INDEX idx_organizer_locations_location ON organizer_locations(location_id);

-- RLS Policies for organizer_locations
ALTER TABLE organizer_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view organizer locations"
    ON organizer_locations FOR SELECT
    USING (true);

CREATE POLICY "Organizers can link own locations"
    ON organizer_locations FOR INSERT
    WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can unlink own locations"
    ON organizer_locations FOR DELETE
    USING (auth.uid() = organizer_id);

-- =============================================
-- MIGRATE EXISTING LOCATION DATA FROM EVENTS
-- =============================================

-- Insert unique locations from events into locations table
INSERT INTO locations (id, name, address, lat, lng, created_at)
SELECT
    uuid_generate_v4(),
    location_name,
    location_address,
    location_lat,
    location_lng,
    created_at
FROM events
ON CONFLICT DO NOTHING;

-- Create organizer_locations entries for migrated data
INSERT INTO organizer_locations (organizer_id, location_id)
SELECT DISTINCT
    e.organizer_id,
    l.id
FROM events e
JOIN locations l ON l.name = e.location_name
    AND l.address = e.location_address
    AND l.lat = e.location_lat
    AND l.lng = e.location_lng
ON CONFLICT DO NOTHING;

-- =============================================
-- ADD LOCATION_ID TO EVENTS AND MIGRATE DATA
-- =============================================

-- Add location_id column to events
ALTER TABLE events ADD COLUMN location_id UUID REFERENCES locations(id);

-- Update events with their corresponding location_id
UPDATE events e
SET location_id = l.id
FROM locations l
WHERE l.name = e.location_name
    AND l.address = e.location_address
    AND l.lat = e.location_lat
    AND l.lng = e.location_lng;

-- Make location_id NOT NULL after migration
ALTER TABLE events ALTER COLUMN location_id SET NOT NULL;

-- Add index for location_id
CREATE INDEX idx_events_location_id ON events(location_id);

-- Drop old location columns from events
ALTER TABLE events DROP COLUMN location_name;
ALTER TABLE events DROP COLUMN location_lat;
ALTER TABLE events DROP COLUMN location_lng;
ALTER TABLE events DROP COLUMN location_address;

-- Drop old spatial index (no longer needed)
DROP INDEX IF EXISTS idx_events_location;

-- =============================================
-- RECREATE MATERIALIZED VIEW WITH LOCATION JOIN
-- =============================================
CREATE MATERIALIZED VIEW events_with_stats AS
SELECT
    e.id,
    e.organizer_id,
    e.title,
    e.description,
    e.cover_image_url,
    e.category_id,
    e.location_id,
    l.name AS location_name,
    l.address AS location_address,
    l.lat AS location_lat,
    l.lng AS location_lng,
    e.event_start_time,
    e.event_end_time,
    e.external_ticket_url,
    e.is_featured,
    e.created_at,
    e.updated_at,
    COALESCE(i.interested_count, 0) AS interested_count,
    COALESCE(c.check_ins_count, 0) AS check_ins_count
FROM events e
JOIN locations l ON e.location_id = l.id
LEFT JOIN (
    SELECT event_id, COUNT(*) AS interested_count
    FROM event_interests
    GROUP BY event_id
) i ON e.id = i.event_id
LEFT JOIN (
    SELECT event_id, COUNT(*) AS check_ins_count
    FROM event_check_ins
    GROUP BY event_id
) c ON e.id = c.event_id;

-- Recreate unique index for concurrent refresh
CREATE UNIQUE INDEX idx_events_with_stats_id ON events_with_stats(id);

-- Recreate triggers for auto-refresh
CREATE TRIGGER refresh_events_stats_on_interest
    AFTER INSERT OR DELETE ON event_interests
    FOR EACH STATEMENT EXECUTE FUNCTION refresh_events_with_stats();

CREATE TRIGGER refresh_events_stats_on_checkin
    AFTER INSERT OR DELETE ON event_check_ins
    FOR EACH STATEMENT EXECUTE FUNCTION refresh_events_with_stats();

-- Add update policy for locations
CREATE POLICY "Organizers can update locations they use"
    ON locations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organizer_locations
            WHERE organizer_locations.location_id = locations.id
            AND organizer_locations.organizer_id = auth.uid()
        )
    );
