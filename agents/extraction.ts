import { config } from "./config";
import {
  getEventSources,
  findDuplicateEvent,
  createEvent,
  updateEvent,
  getEventById,
  findOrCreateLocation,
  findOrCreateOrganizer,
  findOrCreateCategory,
  type EventSource,
} from "./db";
import {
  fetchPageWithFallback,
  extractEventsFromContent,
  sendAgentReport,
  alertError,
  closeBrowser,
  type ExtractedEvent,
  type AgentReport,
} from "./tools";
import type { EventInsert } from "../types/database";

interface ExtractionStats {
  sourcesProcessed: number;
  eventsFound: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDuplicateExact: number;
  eventsDuplicateFuzzy: number;
  eventsSkippedPast: number;
  eventsFailed: number;
  locationsCreated: number;
  organizersCreated: number;
}

interface ProcessedEvent {
  extracted: ExtractedEvent;
  source: EventSource;
}

/**
 * Calculate confidence score for an extracted event (0-100)
 */
function calculateConfidence(event: ExtractedEvent): number {
  let score = 0;

  // Has image URL? (+20)
  if (event.image_url && event.image_url.length > 10) {
    score += 20;
  }

  // Has description > 50 chars? (+20)
  if (event.description && event.description.length > 50) {
    score += 20;
  }

  // Has ticket URL? (+15)
  if (event.ticket_url && event.ticket_url.length > 10) {
    score += 15;
  }

  // Has end_time different from start_time? (+10)
  if (event.end_time && event.end_time !== event.start_time) {
    score += 10;
  }

  // Has organizer name? (+15)
  if (event.organizer_name && event.organizer_name.length > 2) {
    score += 15;
  }

  // Has location address? (+20)
  if (event.location_address && event.location_address.length > 10) {
    score += 20;
  }

  return score;
}

export async function runExtractionAgent(): Promise<ExtractionStats> {
  const startTime = Date.now();
  const errors: string[] = [];

  const stats: ExtractionStats = {
    sourcesProcessed: 0,
    eventsFound: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDuplicateExact: 0,
    eventsDuplicateFuzzy: 0,
    eventsSkippedPast: 0,
    eventsFailed: 0,
    locationsCreated: 0,
    organizersCreated: 0,
  };

  try {
    console.log("Starting Extraction Agent...");
    console.log(`Target metro: ${config.targetMetro}`);
    console.log(`Max events per run: ${config.maxEventsPerRun}`);

    // Get event sources from database
    const sources = await getEventSources();
    console.log(`Found ${sources.length} event sources`);

    if (sources.length === 0) {
      console.log("No event sources configured. Add aggregators, locations, or organizers with event URLs.");
      return stats;
    }

    // Collect all events from all sources
    const allEvents: ProcessedEvent[] = [];

    for (const source of sources) {
      if (stats.eventsFound >= config.maxEventsPerRun) {
        console.log(`Reached max events limit (${config.maxEventsPerRun})`);
        break;
      }

      try {
        console.log(`\nProcessing source: ${source.name} (${source.type})`);
        console.log(`URL: ${source.url}`);

        // Fetch page content
        const content = await fetchPageWithFallback(source.url);
        console.log(`Fetched ${content.length} chars`);

        // Extract events using LLM
        const events = await extractEventsFromContent(content, source.name, source.url);
        console.log(`Extracted ${events.length} events from ${source.name}`);

        stats.sourcesProcessed++;

        // Add to collection
        for (const event of events) {
          if (allEvents.length < config.maxEventsPerRun) {
            allEvents.push({ extracted: event, source });
            stats.eventsFound++;
          }
        }

        // Rate limiting between sources
        await sleep(config.rateLimitMs);
      } catch (error) {
        const errorMsg = `Failed to process ${source.name}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`\nTotal events collected: ${allEvents.length}`);

    // Process collected events
    for (const { extracted, source } of allEvents) {
      try {
        // Skip events in the past
        const eventDate = new Date(extracted.start_time);
        if (eventDate < new Date()) {
          console.log(`Skipping past event: ${extracted.title} (${extracted.start_time})`);
          stats.eventsSkippedPast++;
          continue;
        }

        // Check for duplicate (exact and fuzzy)
        const duplicateCheck = await findDuplicateEvent(extracted.title, extracted.start_time);

        if (duplicateCheck.isDuplicate && duplicateCheck.existingId) {
          if (duplicateCheck.matchType === "exact") {
            // Exact match - check if we should update
            const existing = await getEventById(duplicateCheck.existingId);
            const newConfidence = calculateConfidence(extracted);

            // Update if new data has higher confidence
            if (existing && newConfidence > (existing.confidence_score || 0)) {
              const updated = await updateEvent(duplicateCheck.existingId, {
                description: extracted.description || existing.description,
                cover_image_url: extracted.image_url || existing.cover_image_url,
                external_ticket_url: extracted.ticket_url || existing.external_ticket_url,
                confidence_score: newConfidence,
              });
              if (updated) {
                console.log(`Updated: ${extracted.title} (confidence ${existing.confidence_score} → ${newConfidence})`);
                stats.eventsUpdated++;
              }
            } else {
              console.log(`Duplicate: ${extracted.title}`);
              stats.eventsDuplicateExact++;
            }
            continue;
          } else {
            // Fuzzy match
            console.log(`Fuzzy duplicate: ${extracted.title}`);
            stats.eventsDuplicateFuzzy++;
            continue;
          }
        }

        // Find or create location
        const locationName = extracted.location_name || source.name;
        const { location, created: locationCreated } = await findOrCreateLocation(
          locationName,
          extracted.location_address
        );

        if (!location) {
          console.error(`Could not find/create location for: ${extracted.title}`);
          stats.eventsFailed++;
          continue;
        }

        if (locationCreated) {
          stats.locationsCreated++;
        }

        // Find or create organizer
        const organizerName = extracted.organizer_name || source.name;
        const { organizer, created: organizerCreated } = await findOrCreateOrganizer(organizerName);

        if (!organizer) {
          console.error(`Could not find/create organizer for: ${extracted.title}`);
          stats.eventsFailed++;
          continue;
        }

        if (organizerCreated) {
          stats.organizersCreated++;
        }

        // Find or create category
        const categoryId = extracted.category ? await findOrCreateCategory(extracted.category) : null;

        // Calculate confidence score
        const confidenceScore = calculateConfidence(extracted);

        // Create the event
        const eventData: EventInsert = {
          organizer_id: organizer.id,
          location_id: location.id,
          title: extracted.title,
          description: extracted.description || "",
          cover_image_url: extracted.image_url || "",
          event_start_time: extracted.start_time,
          event_end_time: extracted.end_time || extracted.start_time,
          external_ticket_url: extracted.ticket_url,
          category_id: categoryId,
          event_url: extracted.detail_url,
          source: source.type,
          is_published: true,
          confidence_score: confidenceScore,
        };

        const eventId = await createEvent(eventData);

        if (eventId) {
          console.log(`Created: ${extracted.title}`);
          stats.eventsCreated++;
        } else {
          stats.eventsFailed++;
        }
      } catch (error) {
        const errorMsg = `Failed to process event "${extracted.title}": ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        stats.eventsFailed++;
      }
    }

    // Send report
    const duration = Date.now() - startTime;
    const totalDuplicates = stats.eventsDuplicateExact + stats.eventsDuplicateFuzzy;
    const report: AgentReport = {
      agentName: "Extraction Agent",
      status: errors.length === 0 ? "success" : errors.length < 3 ? "partial" : "failed",
      duration,
      stats: {
        "Sources Processed": stats.sourcesProcessed,
        "Events Found": stats.eventsFound,
        "Events Created": stats.eventsCreated,
        "Events Updated": stats.eventsUpdated,
        "Duplicates (Exact)": stats.eventsDuplicateExact,
        "Duplicates (Fuzzy)": stats.eventsDuplicateFuzzy,
        "Past Events Skipped": stats.eventsSkippedPast,
        "Events Failed": stats.eventsFailed,
        "Locations Created": stats.locationsCreated,
        "Organizers Created": stats.organizersCreated,
      },
      errors,
    };

    await sendAgentReport(report);

    console.log("\n--- Extraction Complete ---");
    console.log(`Sources processed: ${stats.sourcesProcessed}`);
    console.log(`Events found: ${stats.eventsFound}`);
    console.log(`Events created: ${stats.eventsCreated}`);
    console.log(`Events updated: ${stats.eventsUpdated}`);
    console.log(`Duplicates: ${totalDuplicates} (${stats.eventsDuplicateExact} exact, ${stats.eventsDuplicateFuzzy} fuzzy)`);
    console.log(`Past events skipped: ${stats.eventsSkippedPast}`);
    console.log(`Failed: ${stats.eventsFailed}`);

    return stats;
  } catch (error) {
    await alertError(error instanceof Error ? error : new Error(String(error)), "Extraction Agent");
    throw error;
  } finally {
    // Clean up headless browser if it was used
    await closeBrowser();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
