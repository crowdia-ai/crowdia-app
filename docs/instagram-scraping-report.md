# Instagram Scraping Integration Report

**Date:** January 23, 2026
**Purpose:** Evaluate and test Instagram scraping services for extracting event information from organization posts

---

## Executive Summary

We evaluated multiple Instagram scraping services and selected **Apify** as the best fit for our use case. A successful test scrape was conducted on `@popshock_`, demonstrating the ability to extract structured event data from post captions.

**Key Findings:**
- Apify works reliably with direct URL input format
- Cost: ~$0.0027 per post scraped
- Rich data returned including captions, timestamps, images, mentions
- Event details (date, time, venue, tickets) are embedded in Italian captions and require parsing

---

## Organizations to Scrape

| Organization | Instagram Handle | Contact |
|--------------|------------------|---------|
| PopShock | @popshock_ | info@popshock.it |
| Exit Drinks | @exitdrinks | info@exitdrinks.com |
| Unlocked | @unlocked_music_festival | info@face.events |
| Panorama | @panoramafestival_ | hello@panoramafestival.it |
| Sensazione Stupenda | @sensazione_stupenda | - |
| Level Up | @levelup.pmo | - |
| Electrolab | @electrolab.event | electrolab.event@gmail.com |
| Locura | @locura.events | - |
| Essentials | @essentials.events | - |
| Quimeera | @quimeera | ra.co/promoters/quimeera |
| Tnos | @tnos_eventi | tnos.it |
| Atmosfera | @atmosferaevent | - |
| TheWeekend | @theweekendpalermo_official | - |
| FTA (FestaTraAmici) | @ftamici | - |
| Music Connecting People | @musiconnectingpeople_ | - |
| Sonora | @sonora.experience | - |

**Total: 16 organizations**

---

## Service Comparison

### 1. Apify (Selected)

| Aspect | Details |
|--------|---------|
| **Pricing Model** | Pay-per-result: $0.0027 per post |
| **Free Tier** | $5/month credit (~1,850 posts free) |
| **Success Rate** | High for moderate volumes |
| **Data Extracted** | Caption, hashtags, mentions, timestamp, likes, images, location |
| **Ease of Use** | No-code web UI + full API (Python, JS, curl) |
| **Documentation** | Excellent |
| **Output Formats** | JSON, CSV, Excel, XML, RSS |
| **Integrations** | Zapier, Make, webhooks, API |

**Pros:**
- Pay only for what you use
- Free tier sufficient for testing and low-volume production
- Structured JSON output ready for parsing
- Multiple specialized scrapers (Posts, Profiles, Hashtags, Reels)

**Cons:**
- Can get expensive at high scale
- Instagram changes may require Actor updates
- Slower than pure API-based solutions (~20 seconds per run)

### 2. Bright Data

| Aspect | Details |
|--------|---------|
| **Pricing** | $0.001/record minimum, **$499/month minimum** |
| **Features** | Enterprise-grade, multiple Instagram endpoints |

**Verdict:** Overkill for our scale. The $499/month minimum is impractical for 16 organizations.

### 3. PhantomBuster

| Aspect | Details |
|--------|---------|
| **Pricing** | $69-$439/month (time-based) |
| **Features** | Profile scraper, hashtag search, follower collector |
| **Reliability** | Users report issues with Instagram reliability |

**Verdict:** Better for engagement automation than data extraction. Monthly subscription less favorable for periodic scraping.

### 4. ScrapingBee

| Aspect | Details |
|--------|---------|
| **Pricing** | $2.24/1K requests |
| **Success Rate** | 99.65% (highest in benchmarks) |
| **Response Time** | 4.54s (fast) |

**Verdict:** Most reliable but more expensive. Consider as fallback if Apify proves unreliable.

### 5. Decodo (formerly Smartproxy)

| Aspect | Details |
|--------|---------|
| **Pricing** | $0.88/1K requests (cheapest) |
| **Success Rate** | 87.62% (lowest) |
| **Response Time** | 24.14s (slowest) |

**Verdict:** Cheapest but lower reliability. Not recommended.

---

## Test Scrape Results

### Configuration

```json
{
  "directUrls": ["https://www.instagram.com/popshock_/"],
  "resultsLimit": 5,
  "resultsType": "posts"
}
```

### API Endpoint

```
POST https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token={API_TOKEN}
```

### Results

| Metric | Value |
|--------|-------|
| **Run Duration** | 21.2 seconds |
| **Posts Retrieved** | 5 |
| **Total Cost** | $0.0135 |
| **Cost per Post** | $0.0027 |
| **Status** | SUCCEEDED |

### Sample Data Structure

```json
{
  "id": "3816405000814180812",
  "type": "Sidecar",
  "shortCode": "DT2mCDIjbnM",
  "caption": "PopShock / 2016 vs 2026 The Golden Age of Pop Sabato 24 Gennaio 2026 ⏰ Start 22:00 📍 @icandelai – Via dei Candelai 65, Palermo 🎟️ Biglietti su dice.fm...",
  "hashtags": [],
  "mentions": ["icandelai", "alessio.librizzi", "marcobash", "sergiofundaro"],
  "url": "https://www.instagram.com/p/DT2mCDIjbnM/",
  "commentsCount": 0,
  "likesCount": 199,
  "timestamp": "2026-01-23T12:22:30.000Z",
  "displayUrl": "https://scontent-hou1-1.cdninstagram.com/...",
  "images": ["https://scontent-hou1-1.cdninstagram.com/..."],
  "alt": "Photo by PopShock on January 23, 2026...",
  "dimensionsHeight": 1350,
  "dimensionsWidth": 1080,
  "childPosts": [...]
}
```

### Event Data Extracted from Caption

| Field | Extracted Value |
|-------|-----------------|
| **Event Name** | PopShock / 2016 vs 2026 The Golden Age of Pop |
| **Date** | Sabato 24 Gennaio 2026 |
| **Time** | Start 22:00 |
| **Venue** | @icandelai – Via dei Candelai 65, Palermo |
| **Tickets (VIP)** | 20€ saltafila via dice.fm |
| **Tickets (Regular)** | 15€ at door |
| **DJs** | @alessio.librizzi, @marcobash, @sergiofundaro |

---

## Image Handling

### CDN URL Characteristics

Instagram returns CDN URLs for images in the `images` and `displayUrl` fields:

```
https://scontent-hou1-1.cdninstagram.com/v/t51.2885-15/621664392_...jpg?...&oh=XXX&oe=69798756
```

### URL Testing Results

| Test | Result |
|------|--------|
| **Server-side download** | Works |
| **Direct hotlink in browser** | Blocked by CORS |
| **URL lifespan** | ~5 days (expires based on `oe` parameter) |
| **Image quality** | 1080x1350 JPEG, ~145KB |

### Technical Details

```
HTTP/2 200
content-type: image/jpeg
cache-control: max-age=1209600 (14 days)
cross-origin-resource-policy: same-origin  <-- Blocks browser cross-origin requests
```

The `oe` parameter is a hex-encoded Unix timestamp for expiry:
- Example: `oe=69798756` = Jan 28, 2026 (5 days from scrape)

### Recommendation: Download and Re-host

**Do NOT hotlink Instagram CDN URLs** because:
1. URLs expire in ~5 days
2. CORS policy blocks browser requests from other domains
3. Instagram may change URL structure at any time

**Instead, download images server-side and upload to your own storage:**

```typescript
// Workflow for each scraped post
async function processPostImages(post: InstagramPost): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (const imageUrl of post.images) {
    // 1. Download from Instagram CDN (server-side)
    const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());

    // 2. Upload to your storage (Supabase, S3, Cloudinary)
    const filename = `events/${post.shortCode}/${uuid()}.jpg`;
    const permanentUrl = await storage.upload(filename, imageBuffer);

    uploadedUrls.push(permanentUrl);
  }

  return uploadedUrls;
}
```

### Storage Options

| Service | Pros | Cons |
|---------|------|------|
| **Supabase Storage** | Already in stack, simple API | 1GB free tier |
| **Cloudinary** | Image optimization, transformations | 25GB free |
| **AWS S3** | Scalable, cheap | More setup |
| **Cloudflare R2** | No egress fees | Newer service |

### Cost Estimate (Image Storage)

Assuming ~145KB average per image, 5 images per post:

| Scenario | Posts/Month | Images | Storage/Month | Cumulative (1yr) |
|----------|-------------|--------|---------------|------------------|
| Light | 160 | 800 | ~116MB | ~1.4GB |
| Medium | 480 | 2,400 | ~348MB | ~4.2GB |
| Heavy | 800 | 4,000 | ~580MB | ~7GB |

All scenarios fit within free tiers of most storage providers.

---

## Cost Projections

### Monthly Scraping (16 organizations)

| Scenario | Posts/Org | Total Posts | Monthly Cost |
|----------|-----------|-------------|--------------|
| Light (recent only) | 10 | 160 | $0.43 |
| Medium | 30 | 480 | $1.30 |
| Full history | 50 | 800 | $2.16 |

**Note:** Free tier ($5/month) covers all scenarios above.

### Annual Cost Estimate

| Usage Level | Annual Cost |
|-------------|-------------|
| Light | ~$5 (covered by free tier) |
| Medium | ~$16 |
| Heavy | ~$26 |

---

## Legal Considerations

### Instagram Terms of Service

Instagram's ToS explicitly prohibits scraping:
> "You must not crawl, scrape, or otherwise cache any content from Instagram including but not limited to user profiles and photos."

**Risks:**
- Account bans
- IP blocks
- Cease-and-desist letters
- Potential legal action (Meta has sued scraping services)

### Legal Precedent

- **HiQ Labs v. LinkedIn** case supports scraping publicly available data
- Courts have ruled accessing public data isn't unauthorized, even if ToS prohibits it

### GDPR Compliance

- Must handle personal data responsibly
- Event information (dates, venues) is lower risk than personal user data
- Document legitimate purpose (event aggregation)
- Have a privacy policy explaining data use

### Recommendations

1. Only scrape **public** posts
2. Don't store personal user data beyond what's needed
3. Implement rate limiting to avoid aggressive crawling
4. Consider consulting legal counsel for commercial use
5. Use data only for event aggregation, not user profiling

---

## Technical Implementation Plan

### 1. Apify Service Module

```typescript
// services/apify.ts
interface ApifyConfig {
  apiToken: string;
  actorId: string; // 'apify~instagram-scraper'
}

interface ScrapeInput {
  directUrls: string[];
  resultsLimit: number;
  resultsType: 'posts' | 'comments' | 'details';
}

interface InstagramPost {
  id: string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  url: string;
  timestamp: string;
  likesCount: number;
  images: string[];
  displayUrl: string;
}

class ApifyService {
  async startRun(input: ScrapeInput): Promise<string>; // returns runId
  async waitForCompletion(runId: string): Promise<void>;
  async getResults(datasetId: string): Promise<InstagramPost[]>;
  async scrapeOrganization(handle: string, limit?: number): Promise<InstagramPost[]>;
}
```

### 2. Image Service Module

```typescript
// services/images.ts
interface ImageService {
  // Download image from URL and return buffer
  download(url: string): Promise<Buffer>;

  // Upload buffer to storage and return permanent URL
  upload(buffer: Buffer, path: string): Promise<string>;

  // Download from Instagram and re-host in one step
  rehost(instagramUrl: string, destPath: string): Promise<string>;
}

class SupabaseImageService implements ImageService {
  constructor(private supabase: SupabaseClient, private bucket: string) {}

  async download(url: string): Promise<Buffer> {
    const response = await fetch(url);
    return Buffer.from(await response.arrayBuffer());
  }

  async upload(buffer: Buffer, path: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, buffer, { contentType: 'image/jpeg' });

    if (error) throw error;

    const { data: { publicUrl } } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    return publicUrl;
  }

  async rehost(instagramUrl: string, destPath: string): Promise<string> {
    const buffer = await this.download(instagramUrl);
    return this.upload(buffer, destPath);
  }
}
```

### 3. Event Parser

Use LLM to extract structured event data from Italian captions:

```typescript
interface ParsedEvent {
  name: string;
  date: Date;
  time: string;
  venue: {
    name: string;
    address: string;
    city: string;
  };
  tickets: {
    price: number;
    currency: string;
    url?: string;
    type: string;
  }[];
  artists: string[];
  description: string;
  imageUrl: string;
  sourceUrl: string;
  organizationHandle: string;
}
```

### 4. Scraping Workflow

1. **Trigger:** Scheduled (daily/weekly) or manual
2. **For each organization:**
   - Call Apify with `directUrls: ["https://instagram.com/{handle}/"]`
   - Set `resultsLimit` based on scrape frequency
   - Poll for completion
   - Fetch results from dataset
3. **For each post:**
   - Check if already processed (by shortCode)
   - **Download images from Instagram CDN** (must happen quickly, URLs expire)
   - **Upload images to permanent storage** (Supabase Storage)
   - Parse caption with LLM to extract event details
   - Validate extracted data
   - Store in database with permanent image URLs
4. **Deduplication:** Match events across organizations by date/venue

**Important:** Process images immediately after scraping. Instagram CDN URLs expire in ~5 days, but it's best to download them right away to avoid any issues.

---

## API Reference

### Start a Scrape Run

```bash
curl -X POST "https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token={TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "directUrls": ["https://www.instagram.com/popshock_/"],
    "resultsLimit": 20,
    "resultsType": "posts"
  }'
```

**Response:**
```json
{
  "data": {
    "id": "CwcWu8Pvcz8kfF0n1",
    "status": "READY",
    "defaultDatasetId": "Mt7Kc8lvWevpxY7Je"
  }
}
```

### Check Run Status

```bash
curl "https://api.apify.com/v2/actor-runs/{runId}?token={TOKEN}"
```

**Response (when complete):**
```json
{
  "data": {
    "status": "SUCCEEDED",
    "finishedAt": "2026-01-23T15:54:34.672Z",
    "usageTotalUsd": 0.0135
  }
}
```

### Fetch Results

```bash
curl "https://api.apify.com/v2/datasets/{datasetId}/items?token={TOKEN}"
```

---

## Implementation Progress

### Completed

- [x] **Apify service module** - `agents/tools/apify.ts`
  - `scrapeInstagramProfile(handle, limit)` - Scrapes posts from Instagram
  - `isApifyConfigured()` - Checks if API token is set
- [x] **Caption parser** - `agents/tools/openrouter.ts`
  - `extractEventsFromInstagramPosts()` - LLM extracts events from Italian captions
  - Handles date parsing, venue extraction, categorization
- [x] **Source integration** - `agents/db/sources.ts`
  - Added `"instagram"` source type
  - Organizers with `instagram_handle` are automatically included
- [x] **Extraction agent integration** - `agents/extraction.ts`
  - Handles Instagram sources differently from web sources
  - Uses Apify + LLM extraction pipeline
- [x] **Config update** - `agents/config.ts`
  - Added `apifyApiToken` configuration
- [x] **All 16 organizations in database** with Instagram handles

### Test Results (Jan 24, 2026)

| Account | Posts | Events | Status |
|---------|-------|--------|--------|
| @popshock_ | 10 | 5 | Working |
| @levelup.pmo | 5 | - | Working |
| @electrolab.event | 5 | - | Working |
| @locura.events | 5 | - | Working |
| @exitdrinks | 0 | 0 | Private/Issue |
| @unlocked_music_festival | 0 | 0 | Private/Issue |
| @sensazione_stupenda | 0 | 0 | Private/Issue |
| @quimeera | 0 | 0 | Private/Issue |

### Remaining Work

- [ ] **Fix source ordering** - Instagram sources are processed last; if agent hits 300 event limit, they get skipped
- [ ] **Investigate failing accounts** - Some accounts return 0 posts (may be private)
- [ ] **Image re-hosting** - Download Instagram images and upload to Supabase (URLs expire in ~5 days)
- [ ] **Deduplication** - Same event from multiple posts creates duplicates
- [ ] **Scheduler** - Set up periodic scraping (cron job or queue)

---

## Appendix: Input Format Notes

### What Works

```json
{
  "directUrls": ["https://www.instagram.com/popshock_/"]
}
```

### What Doesn't Work

```json
{
  "usernames": ["popshock_"]
}
```

The `usernames` parameter returned "Empty or private data" error. Use `directUrls` with full Instagram profile URLs.
