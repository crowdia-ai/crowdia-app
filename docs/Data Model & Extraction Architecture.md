# Data Model & Extraction Architecture

*Working document — thinking through how to model the event discovery ecosystem*

---

## The Problem

The events industry in Palermo (and everywhere) is fragmented. There's no single source of truth. A single event might appear:

- On the promoter's Instagram story
- On the venue's website calendar
- Listed on RA.co with ticket links
- Shared by a co-promoter's Facebook
- Mentioned in palermotoday.it
- Announced in a WhatsApp group

Each source has partial information. None is authoritative. They often conflict (different times, different prices, different descriptions).

**Crowdia's job is to be the unified layer that doesn't exist yet.**

---

## Core Entities

### 1. Event (the canonical thing)

The actual real-world gathering. One event, regardless of how many places it's mentioned.

```
Event
  ├── title, description, images
  ├── start_time, end_time
  ├── organized_by → [Organization, Organization, ...]  (can be multiple)
  ├── hosted_at → Location
  ├── category
  ├── ticket_url, price
  └── found_via → [EventMention, EventMention, ...]  (provenance)
```

**Key insight:** An Event exists independently of where we found it. The sources are just *evidence* of the event.

### 2. Organization (promoters, collectives, brands)

The people/groups who create and promote events.

```
Organization
  ├── name (e.g., "PopShock", "Exit Drinks", "Electrolab")
  ├── contact info (email, phone)
  ├── social handles (instagram, facebook, twitter)
  ├── sources → [EventSource, ...]  (where they post their events)
  └── events → [Event, ...]  (what they've organized)
```

**Examples of organizations:**
- PopShock (promoter collective)
- Exit Drinks (party series / promoter)
- Electrolab (techno collective)
- I Candelai (venue that also promotes — dual role)

### 3. Location (venues, spaces)

Physical places where events happen.

```
Location
  ├── name (e.g., "I Candelai", "Teatro Massimo")
  ├── address, coordinates
  ├── capacity, type (club, theater, outdoor, etc.)
  ├── sources → [EventSource, ...]  (their website, Google listing, etc.)
  └── events → [Event, ...]  (what's hosted there)
```

**Note:** Some locations are also organizations (they host AND promote). This is a common pattern — the venue itself throws events, not just renting to external promoters.

### 4. EventSource (where we find event info)

A place we can scrape/check for event information.

```
EventSource
  ├── url
  ├── type: "website" | "instagram" | "facebook" | "ra" | "aggregator" | ...
  ├── belongs_to → Organization | Location | null (aggregators)
  ├── scrape_config (frequency, selectors, etc.)
  └── last_scraped, reliability_score
```

**Three kinds of sources:**

| Type | Example | What it contains |
|------|---------|------------------|
| **Org source** | @popshock_ Instagram | Events from that org |
| **Venue source** | icandelai.it/eventi | Events at that venue |
| **Aggregator** | ra.co/events/it/sicily | Events from many orgs/venues |

### 5. EventMention (provenance tracking)

When we find an event mentioned somewhere, we record it.

```
EventMention
  ├── event → Event
  ├── source → EventSource
  ├── found_at: timestamp
  ├── raw_data: json (what we scraped)
  └── confidence_score
```

This lets us:
- Track where we found each event
- Merge info from multiple sources
- Know which source had the best data
- Debug extraction issues

---

## The Extraction Workflow (Proposed)

### Current Flow (source-centric)

```
For each source in sources:
    Scrape source
    Extract events
    Save events
```

**Problem:** Sources are treated equally. Instagram sources end up at the back of the queue. No holistic view per-organization.

### Proposed Flow (entity-centric)

```
1. AGGREGATOR PASS
   For each aggregator (RA, Xceed, palermotoday...):
       Scrape → Extract events
       For each event:
           Try to match to existing Event (dedupe)
           Try to identify Organization (from mentions, venue, etc.)
           Create/update Event with what we know

2. ORGANIZATION PASS  
   For each organization:
       What sources does this org have? (website, instagram, ra page...)
       For each source:
           Scrape → Extract events
           Match to existing Events or create new
           These events definitely belong to this org

3. VENUE PASS
   For each venue with its own event calendar:
       Scrape their calendar
       Match to existing Events or create new
       These events definitely at this venue

4. ENRICHMENT PASS
   For events with missing info:
       Can we find more from other sources?
       Fill in gaps (images, descriptions, ticket links)
```

**Why this is better:**
- Organizations are first-class citizens, not afterthoughts
- Instagram-only orgs get processed just like website orgs
- We build a complete picture per-org
- Deduplication happens naturally (same event from multiple sources)
- We know the provenance of each piece of data

---

## Instagram's Role

Instagram isn't a "special source type" — it's just one of many places an organization might post their events.

**Current:** "Process all Instagram sources" (as a category)

**Proposed:** "For PopShock, check their Instagram. For Exit Drinks, check their website AND Instagram."

The question isn't "should we scrape Instagram?" — it's "what sources does this organization have, and do we have event info from them?"

For nightlife promoters without websites, Instagram IS their primary source. That's fine. We just need to model it as "PopShock has one source: Instagram" rather than "Instagram is a separate extraction pipeline."

---

## Data Model Changes Needed

### Current (approximate)

```sql
organizations
  - id, name, website_url
  - event_sources: jsonb  -- {"website": "https://..."}
  - instagram_handle: text

locations
  - id, name, address
  - event_sources: jsonb
  
events
  - id, title, start_time, ...
  - organizer_id → organizations
  - location_id → locations
  - source: text  -- "aggregator" | "instagram" | etc.
```

### Proposed Additions

```sql
-- Normalize event sources into their own table
event_sources
  - id
  - url
  - type: "website" | "instagram" | "facebook" | "ra" | "aggregator"
  - organization_id → organizations (nullable)
  - location_id → locations (nullable)
  - is_aggregator: boolean
  - scrape_frequency, last_scraped, etc.

-- Track where we found each event
event_mentions
  - id
  - event_id → events
  - source_id → event_sources
  - found_at: timestamp
  - raw_data: jsonb
  - confidence_score

-- Allow multiple organizers per event
event_organizers (join table)
  - event_id → events
  - organization_id → organizations
  - role: "primary" | "co-promoter" | "presented_by"
```

---

## Open Questions

1. **Multi-org events:** How common are co-promoted events? Do we need many-to-many org↔event?

2. **Venue as org:** When a venue is also a promoter, do we model it as one entity with two roles, or two separate entities?

3. **Confidence & conflicts:** When two sources disagree (different start times), how do we decide which to trust?

4. **Discovery vs. extraction:** Should discovery agent focus on finding new *organizations* (and their sources), rather than finding sources directly?

5. **Scrape frequency:** Aggregators daily? Org instagrams weekly? How do we prioritize?

6. **Historical data:** Do we care about past events? (For building org profiles, understanding patterns)

---

## Next Steps

1. **Validate this model** — Does it match how Matt + Mattia think about the industry?

2. **Audit current schema** — What do we have? What needs to change?

3. **Refactor extraction agent** — Shift from source-centric to entity-centric

4. **Test with Instagram orgs** — PopShock, Exit Drinks, etc. — verify the flow works

---

*Last updated: 2026-01-28*
