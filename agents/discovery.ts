import { config } from "./config";
import { getSupabase, cleanupStuckRuns } from "./db";
import {
  searchEventSources,
  sendAgentReport,
  alertError,
  type SearchResult,
  type AgentReport,
} from "./tools";
import { AgentLogger } from "./logger";

interface DiscoveryStats {
  searchesPerformed: number;
  resultsFound: number;
  newSourcesAdded: number;
  duplicatesSkipped: number;
  blockedSkipped: number;
}

// Known event aggregator patterns - prioritized by extraction success rate
const AGGREGATOR_PATTERNS = [
  // High priority - Italian sources that work well
  { pattern: /feverup\.com/i, name: "Feverup", priority: 75 },
  { pattern: /ticketone\.it/i, name: "Ticketone", priority: 80 },
  { pattern: /ticketsms\.it/i, name: "TicketSMS", priority: 80 },
  { pattern: /teatro\.it/i, name: "Teatro.it", priority: 70 },
  { pattern: /palermotoday\.it/i, name: "PalermoToday", priority: 85 },
  { pattern: /palermoviva\.it/i, name: "Palermoviva", priority: 60 },
  { pattern: /balarm\.it/i, name: "Balarm", priority: 75 },
  { pattern: /terradamare\.org/i, name: "Terradamare", priority: 40 },
  { pattern: /itinerarinellarte\.it/i, name: "Itinerarinellarte", priority: 35 },
  // International platforms
  { pattern: /eventbrite\.(com|it)/i, name: "Eventbrite", priority: 70 },
  { pattern: /ra\.co/i, name: "Resident Advisor", priority: 100 },
  { pattern: /dice\.fm/i, name: "Dice", priority: 60 },
  // Lower priority - may have limited Italian coverage
  { pattern: /xceed\.me/i, name: "Xceed", priority: 50 },
  { pattern: /songkick\.com/i, name: "Songkick", priority: 40 },
  { pattern: /bandsintown\.com/i, name: "Bandsintown", priority: 40 },
  // Note: Facebook Events removed - requires authentication
];

// Patterns that likely indicate an event page
const EVENT_PAGE_PATTERNS = [
  /eventi/i,
  /events/i,
  /concerti/i,
  /concerts/i,
  /nightlife/i,
  /clubbing/i,
  /discoteca/i,
  /calendario/i,
  /programma/i,
  /spettacoli/i,
  /teatro/i,
  /mostre/i,
  /appuntamenti/i,
  /cosa-fare/i,
  /agenda/i,
  /biglietti/i,
  /tickets/i,
];

// Domains that should never be added (require auth, not event sources, etc.)
const BLOCKED_DOMAINS = new Set([
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "youtube.com",
  "tiktok.com",
  "linkedin.com",
  "pinterest.com",
  "tripadvisor.it",
  "tripadvisor.com",
  "yelp.com",
  "yelp.it",
  "booking.com",
  "airbnb.com",
  "expedia.com",
  "google.com",
  "maps.google.com",
  "wikipedia.org",
  "amazon.com",
  "amazon.it",
]);

// URL patterns that indicate static/guide content, not event listings
const BLOCKED_URL_PATTERNS = [
  /\/magazine\//i,           // Magazine articles
  /\/blog\//i,               // Blog posts
  /\/article\//i,            // Articles
  /\/news\//i,               // News articles
  /\/guide\//i,              // Guides
  /\/guida\//i,              // Italian guides
  /\/comments\//i,           // Comment threads (Reddit)
  /\/search\?/i,             // Search result pages
  /\/find_desc=/i,           // Yelp search
  /\/Attractions-/i,         // TripAdvisor attractions
  /prontopro\.it/i,          // Service marketplace
  /area-stampa/i,            // Press releases
  /\/groups\//i,             // Facebook groups
  /nightlife-pubs-and-fun/i, // Static guide articles
  /palermos-nightlife\/?$/i, // Nightlife guides (not event listings)
  /nightlife-in-palermo-events\/?$/i, // Static guides
  /palermo-welcome-nightlife/i, // Static venue directory
  /palermo-welcome-news/i,      // News page, not events
];

function isBlockedSource(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    // Check blocked domains
    if (BLOCKED_DOMAINS.has(hostname)) {
      return true;
    }

    // Check if domain ends with a blocked domain (subdomains)
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname.endsWith(`.${blocked}`)) {
        return true;
      }
    }

    // Check blocked URL patterns
    for (const pattern of BLOCKED_URL_PATTERNS) {
      if (pattern.test(url)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export async function runDiscoveryAgent(): Promise<DiscoveryStats> {
  const startTime = Date.now();
  const errors: string[] = [];
  const logger = new AgentLogger('discovery');

  const stats: DiscoveryStats = {
    searchesPerformed: 0,
    resultsFound: 0,
    newSourcesAdded: 0,
    duplicatesSkipped: 0,
    blockedSkipped: 0,
  };

  try {
    // Clean up any stuck runs from previous executions
    const cleanedUp = await cleanupStuckRuns();
    if (cleanedUp > 0) {
      console.log(`Cleaned up ${cleanedUp} stuck agent runs`);
    }

    // Start the agent run in the database
    await logger.startRun();

    await logger.info("Starting Discovery Agent...");
    await logger.info(`Target metro: ${config.targetMetro}`);

    // Search for event sources
    const searchResults = await searchEventSources(config.targetMetro);
    stats.searchesPerformed = 14; // We run 14 different queries
    stats.resultsFound = searchResults.length;

    await logger.info(`Found ${searchResults.length} search results`);

    // Get existing aggregator URLs
    const { data: existingAggregators } = await getSupabase()
      .from("event_aggregators")
      .select("base_url, events_url");

    const existingUrls = new Set<string>();
    existingAggregators?.forEach((a) => {
      if (a.base_url) existingUrls.add(normalizeUrl(a.base_url));
      if (a.events_url) existingUrls.add(normalizeUrl(a.events_url));
    });

    // Process search results
    for (const result of searchResults) {
      try {
        const normalizedUrl = normalizeUrl(result.url);

        // Skip blocked sources (social media, travel sites, etc.)
        if (isBlockedSource(result.url)) {
          stats.blockedSkipped++;
          continue;
        }

        // Skip if already tracked
        if (existingUrls.has(normalizedUrl)) {
          stats.duplicatesSkipped++;
          continue;
        }

        // Check if it matches known aggregator patterns
        const aggregatorMatch = AGGREGATOR_PATTERNS.find((p) => p.pattern.test(result.url));

        // Check if URL/title suggests event content
        const looksLikeEventPage =
          EVENT_PAGE_PATTERNS.some((p) => p.test(result.url) || p.test(result.title));

        if (aggregatorMatch || looksLikeEventPage) {
          // Add as new aggregator
          const slug = extractSiteName(result.url).toLowerCase().replace(/[^a-z0-9]+/g, "-");

          const { error } = await getSupabase().from("event_aggregators").insert({
            name: aggregatorMatch?.name || extractSiteName(result.url),
            slug,
            base_url: getBaseUrl(result.url),
            events_url: result.url,
            is_active: false, // Require manual review
            scrape_priority: aggregatorMatch?.priority || 30, // Use pattern priority or default
            metro_area: config.targetMetro, // Set metro area for filtering
          });

          if (error) {
            if (error.code === "23505") {
              // Unique constraint violation
              stats.duplicatesSkipped++;
            } else {
              await logger.error(`Failed to add aggregator: ${error.message}`);
              errors.push(`Failed to add ${result.url}: ${error.message}`);
            }
          } else {
            await logger.success(`Added new source: ${result.url}`);
            existingUrls.add(normalizedUrl);
            stats.newSourcesAdded++;
          }
        }
      } catch (error) {
        const errorMsg = `Error processing ${result.url}: ${error instanceof Error ? error.message : String(error)}`;
        await logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Send report
    const duration = Date.now() - startTime;
    const report: AgentReport = {
      agentName: "Discovery Agent",
      status: errors.length === 0 ? "success" : errors.length < 3 ? "partial" : "failed",
      duration,
      stats: {
        "Searches Performed": stats.searchesPerformed,
        "Results Found": stats.resultsFound,
        "New Sources Added": stats.newSourcesAdded,
        "Duplicates Skipped": stats.duplicatesSkipped,
        "Blocked Skipped": stats.blockedSkipped,
      },
      errors,
    };

    await sendAgentReport(report);

    // Complete the agent run in the database
    const summary = `Found ${stats.resultsFound} results, added ${stats.newSourcesAdded} new sources`;
    await logger.completeRun(
      errors.length === 0 ? 'completed' : 'failed',
      stats,
      summary,
      errors.length > 0 ? errors.join('; ') : undefined
    );

    await logger.success("--- Discovery Complete ---");
    await logger.info(`Results found: ${stats.resultsFound}`);
    await logger.info(`New sources added: ${stats.newSourcesAdded}`);
    await logger.info(`Duplicates skipped: ${stats.duplicatesSkipped}`);
    await logger.info(`Blocked skipped: ${stats.blockedSkipped}`);

    return stats;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger.error(`Fatal error in discovery agent: ${errorMessage}`);
    await logger.completeRun('failed', stats, 'Agent failed with fatal error', errorMessage);
    await alertError(error instanceof Error ? error : new Error(String(error)), "Discovery Agent");
    throw error;
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/$/, "");
  } catch {
    return url.toLowerCase();
  }
}

function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return url;
  }
}

function extractSiteName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname
      .split(".")[0]
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } catch {
    return "Unknown Source";
  }
}
