# Agent Improvements Plan

Based on extraction agent test runs (2024-12-30).

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

---

## Low Priority (Later)

### 8. Admin Review UI
Simple web interface to:
- View unpublished events
- Approve/reject
- Edit before publishing

### 9. Event Cancellation Detection
If an event disappears from source, flag it for review rather than leaving stale.

### 10. Image Downloading
Download cover images to Supabase Storage instead of hotlinking external URLs.

---

## Source Status (Updated 2024-12-30)

| Source | Events | Status |
|--------|--------|--------|
| PalermoToday | 39 | ✅ Best source |
| Teatro.it | 36 | ✅ Fixed with headless |
| Palermoviva | 31 | ✅ Fixed with headless |
| Ticketone | 25 | ✅ Major concerts |
| Canzoni | 14 | ✅ Concert listings |
| Terradamare | 13 | ✅ Local tours |
| Rockol | 12 | ✅ Fixed with headless |
| Eventbrite | 11 | ✅ Mixed events |
| Comune Palermo | 9 | ✅ City events |
| Itinerarinellarte | 6 | ✅ Art events |
| Palermoculture | 3 | ✅ Cultural events |
| Balarm | 2 | ✅ Local events |
| Xceed | 1 | ✅ Minimal |
| RA.co | 0-22 | ⚠️ Inconsistent (sometimes blocked) |
| Feverup | 0-33 | ⚠️ Sometimes JSON parse error |
| Dice | 0 | ❌ May need different selector |
| TicketSMS | 0 | ❌ Page may be empty |
| Virgilio | 0 | ❌ No events extracted |

**Total: ~200 events from 18 sources (13-15 consistently working)**

---

## Latest Run Stats (2024-12-30)

```
Sources processed: 18
Events found: 202
Events created: 1
Events updated: 122
Duplicates: 13 (5 exact, 8 fuzzy)
Past events skipped: 66
Failed: 0
```
