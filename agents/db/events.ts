import { getSupabase } from "./client";
import type { EventInsert } from "../../types/database";

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalize title for comparison (lowercase, remove punctuation, trim)
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ") // normalize whitespace
    .trim();
}

/**
 * Check if two titles are similar using fuzzy matching
 */
function titlesAreSimilar(title1: string, title2: string, maxDistance: number = 5): boolean {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // If one title contains the other (common with variations like "Event Name - Location")
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Levenshtein distance check (scale threshold by title length)
  const minLen = Math.min(norm1.length, norm2.length);
  const threshold = Math.min(maxDistance, Math.floor(minLen * 0.2)); // max 20% difference

  return levenshteinDistance(norm1, norm2) <= threshold;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingId: string | null;
  matchType: "exact" | "fuzzy" | null;
}

export async function findEventByTitleAndDate(
  title: string,
  startTime: string
): Promise<string | null> {
  const result = await findDuplicateEvent(title, startTime);
  return result.existingId;
}

/**
 * Find duplicate events using both exact and fuzzy matching
 */
export async function findDuplicateEvent(
  title: string,
  startTime: string
): Promise<DuplicateCheckResult> {
  const startDate = startTime.split("T")[0];

  // First try exact match (fast)
  const { data: exactMatch } = await getSupabase()
    .from("events")
    .select("id, title")
    .ilike("title", title)
    .gte("event_start_time", `${startDate}T00:00:00`)
    .lte("event_start_time", `${startDate}T23:59:59`)
    .single();

  if (exactMatch) {
    return { isDuplicate: true, existingId: exactMatch.id, matchType: "exact" };
  }

  // Fuzzy match: get all events for that date and check similarity
  const { data: sameDay } = await getSupabase()
    .from("events")
    .select("id, title")
    .gte("event_start_time", `${startDate}T00:00:00`)
    .lte("event_start_time", `${startDate}T23:59:59`);

  if (sameDay && sameDay.length > 0) {
    for (const event of sameDay) {
      if (titlesAreSimilar(title, event.title)) {
        return { isDuplicate: true, existingId: event.id, matchType: "fuzzy" };
      }
    }
  }

  return { isDuplicate: false, existingId: null, matchType: null };
}

export async function createEvent(event: EventInsert): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("events")
    .insert(event)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create event:", error.message);
    return null;
  }

  return data.id;
}

/**
 * Update an existing event with new data
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<EventInsert>
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("events")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) {
    console.error("Failed to update event:", error.message);
    return false;
  }

  return true;
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string) {
  const { data, error } = await getSupabase()
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    return null;
  }

  return data;
}
