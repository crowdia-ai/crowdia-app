# Agent Improvements Plan

Based on extraction agent test runs and ongoing development.

## Completed

### 1. Location Filtering ✅
Added strict Palermo location validation in LLM prompt to prevent non-local events.

### 2. Date Validation ✅
Skip events with start_time in the past.

### 3. Set is_published=true ✅
Events are published by default.

### 4. Headless Browser Support ✅
Added Puppeteer for JS-rendered pages. Fixed 4 sources:
- RA.co: 0 → 22 events
- Teatro.it: 0 → 36 events
- Palermoviva: 0 → 31 events
- Rockol: 0 → 12 events

### 5. Confidence Scoring ✅
Calculate confidence based on:
- Has image URL? (+20)
- Has description > 50 chars? (+20)
- Has ticket URL? (+15)
- Has end_time different from start_time? (+10)
- Has organizer name? (+15)
- Has location address? (+20)

Events with higher confidence get priority when updating duplicates.

### 6. Fuzzy Duplicate Detection ✅
- Exact match: case-insensitive title + same date
- Fuzzy match: Levenshtein distance ≤ 20% of title length
- Also catches substring matches (e.g., "Event Name - Location" matches "Event Name")

### 7. Event Update Detection ✅
When re-scraping, detect if event already exists:
- Exact match with higher confidence → update existing event
- Fuzzy match → skip (don't create duplicate)

### 8. FlareSolverr Integration ✅ (2024-12-30)
Added FlareSolverr as a service container in GitHub Actions for Cloudflare bypass:
- Configured in `.github/workflows/event-scout.yml`
- Integrated into `agents/tools/web-fetch.ts`
- Used for ra.co, dice.fm and other protected sites

### 9. In-Run Deduplication ✅ (2024-12-30)
Prevent duplicates when same event appears in multiple sources during single run:
- Unicode-aware title normalization (`/[^\p{L}\p{N}\s]/gu`)
- Fuzzy matching: exact, contains, or 30-char prefix match
- Tracks seen events in memory during extraction
- Added `eventsDuplicateInRun` stat

### 10. Database Duplicate Cleanup ✅ (2024-12-30)
Created `agents/cleanup-duplicates.ts` script:
- Fuzzy matching across all events by date
- Keeps event with highest confidence score
- Deleted 35 duplicate events

### 11. Listing Page URL Detection ✅
Skip events where `detail_url` is a listing page rather than specific event page:
- Detects patterns like `/events`, `/eventi`, `/eventi-a-palermo`
- Added `eventsSkippedListingUrl` stat

### 12. Pagination Bug Fix ✅ (2024-12-30)
Fixed infinite scroll showing duplicate events:
- Added stable `since` timestamp for consistent filtering across pages
- Added secondary sort by `id` to prevent ordering inconsistencies
- Prevents events from shifting between pages during pagination

---

## In Progress

### 13. Extraction Agent Issues (2026-01-02)

**Latest Run Stats:**
| Metric | Value |
|--------|-------|
| Sources processed | 37 |
| Total events collected | 282 |
| Events created | 46 |
| Events updated | 10 |
| Past events skipped | 88 |
| Listing URL skipped | 49 |
| In-run duplicates | ~188 |
| Run time | 19m32s (timeout) |

**Critical Issues:**

#### 13.1 PalermoToday Returns 0 Events (CRITICAL)
- Was returning 39 events, now returns 0
- Need to investigate: URL change, Cloudflare, headless issues

#### 13.2 LLM JSON Parsing Failures
- Teatro Golden: "Unterminated string in JSON at position 21046"
- Orchestra Sinfonica Siciliana: "Unterminated string in JSON at position 24732"
- **Fix:** Add `repairAndParseJSON()` function to handle malformed LLM responses

#### 13.3 RA.co Venue Duplicates (~188/run)
- Venue-specific URLs (Mob, PunkFunk, Reloj, Fabric) all return same events as area query
- RA.co GraphQL only supports area-based queries, not venue filtering
- **Fix:** Remove RA.co URLs from location event_sources

#### 13.4 Listing URLs Being Skipped (49 events)
- teatro.it, palermoviva.it events rejected because they use listing page URLs
- **Fix:** Add trusted source whitelist to accept listing URLs from known sources

**Sources Returning 0 Events - Investigation Needed:**
| Source | Type | Likely Cause |
|--------|------|--------------|
| PalermoToday Eventi | aggregator | Unknown regression |
| TicketSMS | aggregator | Empty/JS page |
| Eventbrite | aggregator | Structure change |
| Rockol | aggregator | Was working before |
| Virgilio | aggregator | Selector issues |
| Kalhesa | location | No events? |
| Miles Jazz Club | location | Instagram (no fix) |
| PunkFunk | location | RA.co venue (remove) |
| Country DiscoClub | location | Unknown |
| Shazam Club | location | Unknown |
| Hype Club | location | Unknown |
| Sealife | location | Instagram (no fix) |
| Mirage | location | Instagram (no fix) |

**Unreachable Domains:**
- dorianart.it: ERR_NAME_NOT_RESOLVED
- cinemateatrogolden.it: ERR_CONNECTION_RESET

---

### 14. Image Storage (High Priority)
**Problem:** PalermoToday images blocked by browser ORB (Origin Read Blocking)
- 38 events affected (all from palermotoday.it / citynews CDN)
- Images show placeholder gradient instead of actual image

**Solution Options:**
1. **Supabase Storage** - Download images during extraction, store in bucket
2. **Edge Function Proxy** - Create `/api/image-proxy` endpoint
3. **External CDN** - Use Cloudinary or similar with auto-fetch

**Recommendation:** Option 1 (Supabase Storage) is most reliable long-term

---

## Planned Improvements

### Agent & Extraction

#### 14. Image Download & Storage
- Download images during extraction
- Store in Supabase Storage bucket
- Update `cover_image_url` to point to stored image
- Add image quality validation (minimum size, not placeholder)

#### 15. Event Cancellation Detection
If an event disappears from source:
- Flag for review rather than leaving stale
- Send notification to admin
- Option to auto-unpublish after X days

#### 16. Price Information Extraction
- Extract ticket prices from event pages
- Store min/max price range
- Filter events by price in UI

#### 17. Improved Source Reliability
- Track success rate per source
- Auto-disable sources with repeated failures
- Alert when source structure changes (selector failures)

#### 18. Event Description Translation
- Detect language of description
- Auto-translate to English (or user's language)
- Store both original and translated versions

### App & UI

#### 19. Event Detail Page
- Full event information display
- Large cover image
- Map with venue location
- Buy tickets button
- Share functionality

#### 20. User Favorites & Bookmarks
- Save events to personal list
- Sync across devices
- Notification before saved event starts

#### 21. Location-Based Sorting
- Request user location permission
- Calculate distance to each venue
- "Nearby" sort option actually works

#### 22. Category Filtering
- Filter by event type (music, art, food, etc.)
- Multiple category selection
- Category-based discovery feed

#### 23. Search Improvements
- Autocomplete suggestions
- Recent searches
- Search by venue, organizer, or category
- Date range picker

#### 24. Push Notifications
- New events matching interests
- Reminders for saved events
- Weekly digest of upcoming events

#### 25. Calendar Integration
- Add event to device calendar
- iCal export
- Sync saved events to calendar app

#### 26. Social Features
- See who's interested/going
- Share events with friends
- Event comments/discussion

### Technical & Infrastructure

#### 27. Admin Review UI
Simple web interface to:
- View unpublished events
- Approve/reject
- Edit before publishing
- Merge duplicate events

#### 28. Analytics Dashboard
- Events per source over time
- Most popular events
- User engagement metrics
- Extraction success rates

#### 29. Offline Support / PWA
- Cache events for offline viewing
- Background sync when online
- Add to home screen

#### 30. Performance Optimizations
- Image lazy loading with blur placeholder
- Virtual list for large event counts
- API response caching
- Incremental static regeneration

#### 31. Accessibility
- Screen reader support
- High contrast mode
- Keyboard navigation
- Font size options

---

## Source Status (Updated 2026-01-02)

| Source | Events | Status | Notes |
|--------|--------|--------|-------|
| Feverup | 30 | ✅ Working | Candlelight events |
| Fever | 20 | ✅ Working | Same org as Feverup |
| Teatro Massimo | 15+ | ✅ Working | Some duplicates |
| RA.co | 14 | ✅ Working | Area query works |
| Terradamare | 12 | ✅ Working | Local tours |
| Ticketone | 10+ | ✅ Working | Major concerts |
| Teatro.it | 10+ | ✅ Working | Theater shows |
| Palermoviva | 10+ | ✅ Working | Local events |
| I Candelai | 10+ | ✅ Working | Nightlife |
| San Lorenzo Mercato | 7 | ✅ Working | Food/music |
| Comune Palermo | 5+ | ✅ Working | City events |
| Itinerarinellarte | 5+ | ✅ Working | Art events |
| Balarm | 2+ | ✅ Working | Local events |
| **PalermoToday** | **0** | **❌ BROKEN** | **Was 39, needs fix** |
| Eventbrite | 0 | ❌ Broken | Structure change? |
| Rockol | 0 | ❌ Broken | Was working |
| TicketSMS | 0 | ❌ Broken | Empty/JS page |
| Virgilio | 0 | ❌ Broken | Selector issues |

**Total: 282 events collected, 46 created, ~188 in-run duplicates**

---

## Database Stats (2024-12-30)

- Total events: 194 (after duplicate cleanup)
- Events with images: 194 (100%)
- Events with blocked images: 38 (PalermoToday CDN)
- Upcoming events: 160

---

## Priority Order

### Immediate (This Week)
1. ~~Fix pagination duplicates~~ ✅
2. ~~In-run deduplication~~ ✅
3. **Fix PalermoToday extraction** (was best source, now 0)
4. **Add JSON repair logic** (2 sources failing)
5. **Remove RA.co venue URLs** (~188 duplicates/run)
6. **Add trusted source whitelist** (49 listing URLs skipped)

### Short Term (Next 2 Weeks)
7. Image storage solution
8. Investigate other broken sources (Eventbrite, Rockol, etc.)
9. Event detail page

### Medium Term (Next Month)
10. User favorites
11. Admin review UI
12. Category filtering
13. Search improvements

### Long Term (Future)
14. Push notifications
15. Social features
16. Analytics dashboard
17. Calendar integration
