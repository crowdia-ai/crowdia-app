import "dotenv/config";
import { validateConfig } from "./config";
import { getSupabase } from "./db/client";
import { fetchPageHtmlHeadless } from "./tools/headless";

interface EventToFix {
  id: string;
  title: string;
  cover_image_url: string | null;
  event_url: string | null;
}

/**
 * Extract og:image from HTML
 */
function extractOgImage(html: string): string | null {
  // Try og:image first
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogMatch) return ogMatch[1];

  // Try reverse order (content before property)
  const ogMatch2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogMatch2) return ogMatch2[1];

  // Try twitter:image
  const twitterMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
  if (twitterMatch) return twitterMatch[1];

  return null;
}

async function fixBlockedImages(dryRun: boolean = true): Promise<void> {
  validateConfig();
  console.log(`Fixing blocked images (${dryRun ? "DRY RUN" : "LIVE MODE"})...\n`);

  const supabase = getSupabase();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, cover_image_url, event_url")
    .order("event_start_time", { ascending: true });

  if (error) {
    console.error("Failed to fetch events:", error.message);
    return;
  }

  // Find events with potentially blocked images
  const problematicPatterns = [
    /palermotoday\.it/i,
    /citynews.*\.stgy\.ovh/i,
  ];

  const toFix: EventToFix[] = [];
  for (const event of events || []) {
    if (!event.cover_image_url || !event.event_url) continue;

    for (const pattern of problematicPatterns) {
      if (pattern.test(event.cover_image_url)) {
        toFix.push(event);
        break;
      }
    }
  }

  console.log(`Found ${toFix.length} events with potentially blocked images\n`);

  let fixed = 0;
  let failed = 0;

  for (const event of toFix) {
    console.log(`Processing: ${event.title.substring(0, 50)}...`);
    console.log(`  Current image: ${event.cover_image_url?.substring(0, 60)}...`);

    if (!event.event_url) {
      console.log(`  No event URL, skipping\n`);
      failed++;
      continue;
    }

    try {
      // Fetch the event page
      const html = await fetchPageHtmlHeadless(event.event_url, { waitTime: 2000 });

      // Extract og:image
      const ogImage = extractOgImage(html);

      if (!ogImage) {
        console.log(`  No og:image found\n`);
        failed++;
        continue;
      }

      // Check if it's a different URL
      if (ogImage === event.cover_image_url) {
        console.log(`  Same image URL, skipping\n`);
        continue;
      }

      // Check if the new URL is also problematic
      let isProblematic = false;
      for (const pattern of problematicPatterns) {
        if (pattern.test(ogImage)) {
          isProblematic = true;
          break;
        }
      }

      if (isProblematic) {
        console.log(`  New og:image is also from blocked domain: ${ogImage.substring(0, 60)}...\n`);
        failed++;
        continue;
      }

      console.log(`  Found new image: ${ogImage.substring(0, 60)}...`);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("events")
          .update({ cover_image_url: ogImage })
          .eq("id", event.id);

        if (updateError) {
          console.log(`  Failed to update: ${updateError.message}\n`);
          failed++;
        } else {
          console.log(`  Updated!\n`);
          fixed++;
        }
      } else {
        console.log(`  Would update (dry run)\n`);
        fixed++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.log(`  Error: ${err instanceof Error ? err.message : String(err)}\n`);
      failed++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Failed: ${failed}`);

  if (dryRun) {
    console.log(`\n[DRY RUN] No changes made. Run with --live to update.`);
  }
}

// Run
const args = process.argv.slice(2);
const dryRun = !args.includes("--live");
fixBlockedImages(dryRun)
  .catch(console.error)
  .finally(() => {
    // Close browser
    import("./tools/headless").then(m => m.closeBrowser());
  });
