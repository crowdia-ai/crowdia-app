# Schema & Agent Refactor Plan

*Consolidated from planning session — January 30, 2026*

---

## Overview

Shifting from a **source-centric** to **entity-centric** architecture for event discovery and extraction. This improves organization handling (especially Instagram-only promoters), enables better deduplication via provenance tracking, and clarifies the venue-as-promoter relationship.

---

## Database Schema Changes

### 1. New `event_sources` table

Normalize event sources out of the organizations/locations tables.

```sql
create table event_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  type text not null check (type in ('website', 'instagram', 'facebook', 'ra', 'aggregator', 'other')),
  organization_id uuid references organizations(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  is_aggregator boolean default false,
  scrape_frequency interval default '1 day',
  last_scraped_at timestamptz,
  reliability_score integer default 50,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_event_sources_org on event_sources(organization_id);
create index idx_event_sources_location on event_sources(location_id);
create index idx_event_sources_type on event_sources(type);
create index idx_event_sources_enabled on event_sources(enabled) where enabled = true;
```

### 2. New `event_mentions` table

Track provenance — where we found each event.

```sql
create table event_mentions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  source_id uuid not null references event_sources(id) on delete cascade,
  found_at timestamptz default now(),
  raw_data jsonb,
  confidence_score integer default 50,
  created_at timestamptz default now(),
  
  unique(event_id, source_id)
);

-- Indexes
create index idx_event_mentions_event on event_mentions(event_id);
create index idx_event_mentions_source on event_mentions(source_id);
create index idx_event_mentions_found on event_mentions(found_at);
```

### 3. New `event_organizers` join table

Support multiple organizers per event (co-promoted events).

```sql
create table event_organizers (
  event_id uuid not null references events(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text default 'primary' check (role in ('primary', 'co-promoter', 'presented_by', 'supported_by')),
  created_at timestamptz default now(),
  
  primary key (event_id, organization_id)
);

-- Indexes
create index idx_event_organizers_org on event_organizers(organization_id);
```

### 4. Update `locations` table

Add link to operating organization (venue-as-promoter).

```sql
alter table locations 
  add column operator_org_id uuid references organizations(id) on delete set null;

create index idx_locations_operator on locations(operator_org_id);
```

### 5. Update `organizations` table

Add home location link, remove denormalized source fields.

```sql
alter table organizations 
  add column home_location_id uuid references locations(id) on delete set null;

-- After migrating data to event_sources:
alter table organizations 
  drop column if exists event_sources,
  drop column if exists instagram_handle;

create index idx_organizations_home_location on organizations(home_location_id);
```

### 6. Update `events` table

Remove old single-organizer field (replaced by join table).

```sql
-- After migrating data to event_organizers:
alter table events 
  drop column if exists organizer_id,
  drop column if exists source;
```

---

## Image Storage Policy

**All images stored in Supabase Storage.** No external URLs.

- When extracting events, download images immediately
- Upload to `event-images` bucket with path: `events/{event_id}/{filename}`
- Store the Supabase storage URL in the event record
- For Instagram: images expire in ~5 days, so must download during scrape
- Existing migration script: `agents/migrate-images-to-storage.ts`

---

## Agent Architecture

### Current (source-centric)
```
For each source in sources:
    Scrape source
    Extract events
    Save events
```

**Problems:**
- Instagram sources processed last, may get skipped on timeout
- No holistic view per-organization
- Duplicate events from multiple sources

### New (entity-centric)

**Three-agent system:**

#### 1. Discovery Agent (weekly)
- Finds NEW organizations, venues, and event sources
- Searches for Palermo nightlife, concerts, etc.
- Adds to event_sources table with `enabled: false` (pending review)
- Does NOT extract events

#### 2. Extraction Agent (daily)
- Processes enabled event_sources by priority:
  1. **Aggregators** (RA, Xceed, PalermoToday) — broad coverage
  2. **Organization sources** — per-org, including Instagram
  3. **Venue sources** — venue calendars
- Creates event_mentions for provenance
- Merges info when same event found in multiple sources
- Uploads all images to Supabase storage

#### 3. Enrichment Agent (daily, after extraction)
- For events with low confidence scores
- Tries to find additional sources
- Fills in missing images, descriptions, ticket links

---

## Agent Scheduling

Moving from GitHub Actions to local cron (Oliver manages).

| Agent | Schedule | Cron Expression |
|-------|----------|-----------------|
| Extraction | Daily 3 AM | `0 3 * * *` |
| Discovery | Weekly Sunday 4 AM | `0 4 * * 0` |
| Enrichment | Daily 5 AM (after extraction) | `0 5 * * *` |

---

## Migration Steps

### Phase 1: Schema
1. Create new tables (event_sources, event_mentions, event_organizers)
2. Add new columns to locations/organizations
3. Migrate existing source data to event_sources
4. Migrate organizer relationships to event_organizers
5. Drop old columns

### Phase 2: Images
1. Run migrate-images-to-storage.ts for existing events
2. Update extraction agent to always upload images
3. Add check for external URLs (should be none after migration)

### Phase 3: Agents
1. Refactor extraction.ts for entity-centric flow
2. Refactor discovery.ts to only find new sources (not extract)
3. Create enrichment.ts for gap-filling
4. Set up local cron jobs
5. Disable GitHub Actions workflow

### Phase 4: Instagram
1. Ensure Instagram sources processed per-organization
2. Verify image download/upload working
3. Test with all 16 organizations

---

## Open Items

- [ ] Schema migrations (Supabase)
- [ ] Migrate existing data
- [ ] Refactor extraction agent
- [ ] Refactor discovery agent
- [ ] Create enrichment agent
- [ ] Set up local cron jobs
- [ ] Image migration
- [ ] Test full pipeline

---

*Last updated: 2026-01-30*
