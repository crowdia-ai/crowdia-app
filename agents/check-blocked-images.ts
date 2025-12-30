import "dotenv/config";
import { validateConfig } from "./config";
import { getSupabase } from "./db/client";

async function checkBlockedImages(): Promise<void> {
  validateConfig();
  const supabase = getSupabase();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, cover_image_url, event_url")
    .order("event_start_time", { ascending: true });

  if (error) {
    console.error("Failed to fetch events:", error.message);
    return;
  }

  // Check for problematic image patterns
  const problematicPatterns = [
    /palermotoday\.it.*\.jpg$/i,
    /palermotoday\.it.*\.jpeg$/i,
    /palermotoday\.it.*\.png$/i,
    /citynews.*\.jpg$/i,  // PalermoToday uses citynews CDN
    /citynews.*\.jpeg$/i,
    /citynews.*\.png$/i,
  ];

  console.log("Checking for potentially blocked images...\n");

  const problematic: typeof events = [];

  for (const event of events || []) {
    if (!event.cover_image_url) continue;

    for (const pattern of problematicPatterns) {
      if (pattern.test(event.cover_image_url)) {
        problematic.push(event);
        break;
      }
    }
  }

  console.log(`Found ${problematic.length} events with potentially blocked images:\n`);

  for (const event of problematic) {
    console.log(`"${event.title.substring(0, 50)}..."`);
    console.log(`  ID: ${event.id}`);
    console.log(`  Image: ${event.cover_image_url?.substring(0, 80)}...`);
    console.log(`  Event URL: ${event.event_url || "(none)"}`);
    console.log("");
  }
}

checkBlockedImages().catch(console.error);
