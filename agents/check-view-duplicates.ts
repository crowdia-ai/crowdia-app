import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Check for duplicate IDs in the view
  const { data, error } = await supabase
    .from("events_with_stats")
    .select("id, title")
    .eq("is_published", true)
    .gte("event_start_time", new Date().toISOString())
    .order("event_start_time", { ascending: true });

  if (error) {
    console.error("Error:", error);
    return;
  }

  // Check for duplicates
  const seen = new Map<string, number>();
  for (const event of data || []) {
    seen.set(event.id, (seen.get(event.id) || 0) + 1);
  }

  const duplicates = [...seen.entries()].filter(([_, count]) => count > 1);

  console.log("Total rows:", data?.length);
  console.log("Unique IDs:", seen.size);
  console.log("Duplicate IDs:", duplicates.length);

  if (duplicates.length > 0) {
    console.log("\nDuplicates:");
    for (const [id, count] of duplicates) {
      const event = data?.find(e => e.id === id);
      console.log(`  ${id}: ${count}x - ${event?.title?.substring(0, 50)}`);
    }
  }
}

check();
