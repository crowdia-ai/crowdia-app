# Crowdia: Event Handling & Image Backfill Plan

## Current State

### Schema
- `events` table has `event_start_time` and `event_end_time` (can represent duration)
- No recurring event support (no `parent_event_id`, `recurrence_pattern`, etc.)
- `cover_image_url TEXT NOT NULL` (but many have empty string `''`)

### Data Issues
- **897 total events**
- **322 missing images (36%)** — stored as empty string `''`
- **"Duplicate" perception** — same event extracted for each day it runs

---

## Part 1: Multi-Day Events vs Recurring Events

### Key Distinction

These are **fundamentally different** and need different solutions:

| Type | Definition | Example | Database Representation |
|------|------------|---------|------------------------|
| **Multi-day event** | Single continuous event spanning multiple days | Art exhibition open Jan 1-31, Music festival Jan 24-26 | **ONE row**: `start: Jan 1 10am`, `end: Jan 31 6pm` |
| **Recurring event** | Distinct performances/instances on specific dates | Theater show at 8pm on Jan 24, 25, 26 | **Multiple rows** linked as a series |

### Current Problem

The extraction agent incorrectly treats **multi-day events as recurring**:
- "MOSTRA ONIRICA" (exhibition Jan 6-24) → extracted as 19 separate events ❌
- Should be 1 event with `start: Jan 6`, `end: Jan 24` ✅

And for actual recurring events, we have no way to group them:
- "Il lago dei cigni" (11 performances) → 11 unlinked events
- Should be linked as a series with a parent

---

## Solution A: Multi-Day Events (Extraction Fix)

### Problem
Extraction agent creates one event per day for exhibitions/festivals.

### Fix
Update extraction logic to detect multi-day events and set proper date range:

```typescript
// In extraction agent
if (isMultiDayEvent(eventData)) {
  // Exhibition, festival, etc. - use date RANGE
  event.event_start_time = eventData.firstDay;
  event.event_end_time = eventData.lastDay;
} else {
  // Single occurrence - start and end same day
  event.event_start_time = eventData.startTime;
  event.event_end_time = eventData.endTime;
}
```

### Detection Heuristics
- Keywords: "mostra", "exhibition", "festival", "fino al", "dal...al"
- Same title extracted for consecutive days
- Source metadata indicates date range

### Cleanup Script
For existing data, merge duplicate multi-day events:
```sql
-- Find multi-day events incorrectly split
SELECT title, MIN(event_start_time) as first, MAX(event_start_time) as last, COUNT(*) 
FROM events 
WHERE title ILIKE '%mostra%' OR title ILIKE '%exhibition%'
GROUP BY title 
HAVING COUNT(*) > 1;
```

---

## Solution B: Recurring Events (Series Linking)

### Problem
Theater shows, concerts with multiple performances appear as duplicates.

### Schema Addition
```sql
ALTER TABLE events ADD COLUMN series_id UUID;
ALTER TABLE events ADD COLUMN is_series_parent BOOLEAN DEFAULT FALSE;

-- Index for efficient series queries
CREATE INDEX idx_events_series ON events(series_id) WHERE series_id IS NOT NULL;
```

### How It Works
1. **Extraction**: Continue creating one event per performance (correct)
2. **Post-process**: Detect series (same title + venue + within 60 days)
3. **Link**: Assign shared `series_id`, mark earliest as `is_series_parent = true`
4. **UI**: Show parent with "8 more dates" badge, expandable

### Detection Logic
```typescript
// Post-extraction series detection
const potentialSeries = await db.query(`
  SELECT title, location_id, array_agg(id ORDER BY event_start_time) as event_ids
  FROM events
  WHERE series_id IS NULL
    AND event_start_time > NOW()
  GROUP BY title, location_id
  HAVING COUNT(*) > 1
`);

for (const series of potentialSeries) {
  const seriesId = uuid();
  await db.query(`
    UPDATE events 
    SET series_id = $1, is_series_parent = (id = $2)
    WHERE id = ANY($3)
  `, [seriesId, series.event_ids[0], series.event_ids]);
}
```

---

## Implementation Order

### Phase 1: Fix Multi-Day Events (High Priority)
1. Update extraction agent to detect and properly handle multi-day events
2. Create cleanup script to merge existing split exhibitions
3. Run cleanup on production data

### Phase 2: Recurring Event Series (Medium Priority)  
1. Apply schema migration (add `series_id`, `is_series_parent`)
2. Create post-extraction series linker
3. Update UI to show collapsed series view
4. Backfill existing recurring events into series

---

## Part 2: Image Backfill Script Audit

### Current Script Analysis (`agents/backfill-images.ts`)

**✅ What's Good:**
- Handles og:image, twitter:image, itemprop extraction
- Detects listing page URLs and searches for specific event URLs
- Uses headless browser for JS-heavy sites (ra.co, dice.fm, etc.)
- Uploads to Supabase Storage
- Rate limiting built in

**⚠️ Issues Found:**

1. **Query filter**: Uses `cover_image_url = ''` which is correct (empty string, not null)

2. **Missing event URLs**: Many events have listing page URLs that can't be resolved:
   - `enjoysicilia.it/it/feste-sagre-eventi-zona-di-palermo` (listing page)
   - `teatrobiondo.it/spettacoli/` (listing page)
   
   The script tries to find specific URLs via Brave Search, but success rate is low for local Italian events.

3. **Dependencies to verify**:
   - `./db/client` — needs to exist and work
   - `./tools/brave-search` — needs BRAVE_API_KEY
   - `./tools/headless` — needs Playwright/Puppeteer
   - `./tools/image-storage` — needs Supabase storage bucket

### Verification Checklist

```bash
# Check all dependencies exist
ls -la agents/db/client.ts
ls -la agents/tools/brave-search.ts
ls -la agents/tools/headless.ts
ls -la agents/tools/image-storage.ts

# Check env vars
grep -E "BRAVE_API_KEY|SUPABASE" .env

# Check storage bucket exists
# (via Supabase dashboard or API)
```

### Recommended Improvements

1. **Add fallback image sources**:
   - If og:image fails, try Google Image Search for event title
   - Use a default category-based placeholder as last resort

2. **Better URL resolution**:
   - For `enjoysicilia.it` events, scrape the listing page and match by title
   - Add more site-specific scrapers

3. **Dry-run mode**:
   - Add `--dry-run` flag to preview what would be updated

4. **Progress tracking**:
   - Save progress to file so interrupted runs can resume
   - Track which events were attempted to avoid re-processing failures

---

## Implementation Order

### Phase 1: Image Backfill (Quick Win)
1. ✅ Verify script dependencies work
2. ✅ Run backfill on future events first (most visible)
3. ⏳ Add dry-run mode
4. ⏳ Add progress tracking

### Phase 2: Event Series (UX Improvement)
1. Design and apply migration
2. Create post-extraction linking script
3. Update UI to show collapsed series view
4. Backfill existing events into series

---

## Next Steps

- [ ] Matt to review this plan
- [ ] Decide on Option A vs B for recurring events
- [ ] Run dependency verification for image script
- [ ] Do a dry-run of image backfill to see success rate
