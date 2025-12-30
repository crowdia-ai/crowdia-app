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

### 13. Image Storage (High Priority)
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

## Source Status (Updated 2024-12-30)

| Source | Events | Status | Notes |
|--------|--------|--------|-------|
| PalermoToday | 39 | ✅ Best source | Images blocked by ORB |
| Teatro.it | 36 | ✅ Fixed with headless | |
| Palermoviva | 31 | ✅ Fixed with headless | |
| Ticketone | 25 | ✅ Major concerts | |
| Canzoni | 14 | ✅ Concert listings | |
| Terradamare | 13 | ✅ Local tours | Lazy-load images |
| Rockol | 12 | ✅ Fixed with headless | |
| Eventbrite | 11 | ✅ Mixed events | |
| Comune Palermo | 9 | ✅ City events | |
| Itinerarinellarte | 6 | ✅ Art events | |
| Palermoculture | 3 | ✅ Cultural events | |
| Balarm | 2 | ✅ Local events | |
| Xceed | 1 | ✅ Minimal | |
| RA.co | 0-22 | ⚠️ Cloudflare | FlareSolverr should help |
| Feverup | 0-33 | ⚠️ JSON parse error | Needs investigation |
| Dice | 0 | ❌ Cloudflare | FlareSolverr should help |
| TicketSMS | 0 | ❌ Empty page | May need different approach |
| Virgilio | 0 | ❌ No extraction | Selector issues |

**Total: ~194 unique events from 18 sources (13-15 consistently working)**

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
3. Image storage solution

### Short Term (Next 2 Weeks)
4. Event detail page
5. User favorites
6. Push notifications setup

### Medium Term (Next Month)
7. Admin review UI
8. Category filtering
9. Search improvements
10. Location-based sorting

### Long Term (Future)
11. Social features
12. Analytics dashboard
13. Calendar integration
14. Multi-language support
