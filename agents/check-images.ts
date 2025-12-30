import "dotenv/config";
import { validateConfig } from "./config";
import { getSupabase } from "./db/client";

async function checkImages(): Promise<void> {
  validateConfig();
  const supabase = getSupabase();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, cover_image_url, event_url, source")
    .order("event_start_time", { ascending: true });

  if (error) {
    console.error("Failed to fetch events:", error.message);
    return;
  }

  const withImages = events?.filter(e => e.cover_image_url && e.cover_image_url.length > 0) || [];
  const withoutImages = events?.filter(e => !e.cover_image_url || e.cover_image_url.length === 0) || [];

  console.log(`Total events: ${events?.length || 0}`);
  console.log(`With images: ${withImages.length} (${Math.round(withImages.length / (events?.length || 1) * 100)}%)`);
  console.log(`Without images: ${withoutImages.length}\n`);

  if (withoutImages.length > 0) {
    console.log("Events without images:");
    for (const event of withoutImages) {
      console.log(`  - ${event.title.substring(0, 50)}...`);
      console.log(`    ID: ${event.id}`);
      console.log(`    URL: ${event.event_url || "(none)"}`);
      console.log(`    Source: ${event.source || "(unknown)"}`);
      console.log("");
    }
  }
}

checkImages().catch(console.error);
