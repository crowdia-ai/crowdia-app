import "dotenv/config";
import { validateConfig } from "./config";
import { getSupabase } from "./db/client";

/**
 * Find duplicate events by shared cover_image_url
 */
async function findImageDuplicates(): Promise<void> {
  validateConfig();
  console.log("Finding events with duplicate images...\n");

  const supabase = getSupabase();

  // Get all events with images
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, event_start_time, cover_image_url, confidence_score, created_at")
    .not("cover_image_url", "is", null)
    .neq("cover_image_url", "")
    .order("cover_image_url");

  if (error) {
    console.error("Failed to fetch events:", error.message);
    return;
  }

  if (!events || events.length === 0) {
    console.log("No events with images found.");
    return;
  }

  console.log(`Found ${events.length} events with images\n`);

  // Group by image URL
  const byImage = new Map<string, typeof events>();
  for (const event of events) {
    const url = event.cover_image_url;
    if (!byImage.has(url)) {
      byImage.set(url, []);
    }
    byImage.get(url)!.push(event);
  }

  // Find duplicates (same image used by multiple events)
  const duplicates: Array<{ image: string; events: typeof events }> = [];
  for (const [image, eventGroup] of byImage) {
    if (eventGroup.length > 1) {
      duplicates.push({ image, events: eventGroup });
    }
  }

  if (duplicates.length === 0) {
    console.log("No duplicate images found!");
    return;
  }

  console.log(`Found ${duplicates.length} images shared by multiple events:\n`);

  for (const dup of duplicates) {
    console.log(`Image: ${dup.image.substring(0, 80)}...`);
    for (const event of dup.events) {
      const date = event.event_start_time.split("T")[0];
      console.log(`  - [${date}] ${event.title.substring(0, 60)}`);
      console.log(`    ID: ${event.id}`);
    }
    console.log("");
  }
}

findImageDuplicates().catch(console.error);
