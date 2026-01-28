import { config } from "../config";

// Types for Apify Instagram scraper responses
export interface InstagramPost {
  id: string;
  shortCode: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  url: string;
  timestamp: string;
  likesCount: number;
  commentsCount: number;
  images: string[];
  displayUrl: string;
  type: "Image" | "Video" | "Sidecar";
  alt?: string;
  childPosts?: InstagramPost[];
}

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
    finishedAt: string | null;
    usageTotalUsd: number;
  };
}

interface ApifyRunStatus {
  data: {
    id: string;
    status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT";
    finishedAt: string | null;
    usageTotalUsd: number;
    statusMessage?: string;
  };
}

const APIFY_BASE_URL = "https://api.apify.com/v2";
const INSTAGRAM_SCRAPER_ACTOR = "apify~instagram-scraper";

/**
 * Start an Instagram scrape run for a profile
 */
async function startInstagramScrape(
  instagramHandle: string,
  resultsLimit: number = 10
): Promise<{ runId: string; datasetId: string }> {
  const token = config.apifyApiToken;
  if (!token) {
    throw new Error("APIFY_API_TOKEN not configured");
  }

  // Remove @ if present
  const handle = instagramHandle.replace(/^@/, "");
  const profileUrl = `https://www.instagram.com/${handle}/`;

  const response = await fetch(
    `${APIFY_BASE_URL}/acts/${INSTAGRAM_SCRAPER_ACTOR}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: [profileUrl],
        resultsLimit,
        resultsType: "posts",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apify API error: ${response.status} - ${error}`);
  }

  const data: ApifyRunResponse = await response.json();
  return {
    runId: data.data.id,
    datasetId: data.data.defaultDatasetId,
  };
}

/**
 * Wait for an Apify run to complete
 */
async function waitForCompletion(
  runId: string,
  maxWaitMs: number = 120000,
  pollIntervalMs: number = 5000
): Promise<ApifyRunStatus["data"]> {
  const token = config.apifyApiToken;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
    );

    if (!response.ok) {
      throw new Error(`Failed to check run status: ${response.status}`);
    }

    const status: ApifyRunStatus = await response.json();

    if (status.data.status === "SUCCEEDED") {
      return status.data;
    }

    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status.data.status)) {
      throw new Error(
        `Apify run ${status.data.status}: ${status.data.statusMessage || "Unknown error"}`
      );
    }

    // Still running, wait and poll again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Apify run timed out after ${maxWaitMs}ms`);
}

/**
 * Fetch results from an Apify dataset
 */
async function fetchDatasetItems(datasetId: string): Promise<InstagramPost[]> {
  const token = config.apifyApiToken;

  const response = await fetch(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.status}`);
  }

  const items = await response.json();

  // Filter out error responses
  return items.filter(
    (item: any) => !item.error && item.caption !== undefined
  ) as InstagramPost[];
}

/**
 * Scrape Instagram posts from a profile
 * Returns structured post data including captions and image URLs
 */
export async function scrapeInstagramProfile(
  instagramHandle: string,
  resultsLimit: number = 10
): Promise<InstagramPost[]> {
  console.log(`Starting Instagram scrape for @${instagramHandle.replace(/^@/, "")} (limit: ${resultsLimit})`);

  // Start the scrape
  const { runId, datasetId } = await startInstagramScrape(
    instagramHandle,
    resultsLimit
  );
  console.log(`Apify run started: ${runId}`);

  // Wait for completion
  const runStatus = await waitForCompletion(runId);
  console.log(
    `Apify run completed. Cost: $${runStatus.usageTotalUsd.toFixed(4)}`
  );

  // Fetch results
  const posts = await fetchDatasetItems(datasetId);
  console.log(`Retrieved ${posts.length} posts from @${instagramHandle}`);

  return posts;
}

/**
 * Check if Apify is configured
 */
export function isApifyConfigured(): boolean {
  return !!config.apifyApiToken;
}
