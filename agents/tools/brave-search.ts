import { config } from "../config";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export async function braveSearch(
  query: string,
  options: { count?: number; country?: string } = {}
): Promise<SearchResult[]> {
  const { count = 20, country = "IT" } = options;

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));
  url.searchParams.set("country", country);
  url.searchParams.set("search_lang", "it");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": config.braveKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave search failed (${response.status})`);
  }

  const data = await response.json();

  return (
    data.web?.results?.map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    })) ?? []
  );
}

export async function searchEventSources(metro: string): Promise<SearchResult[]> {
  const queries = [
    // General event searches
    `${metro} eventi questa settimana`,
    `${metro} eventi oggi`,
    `${metro} cosa fare stasera`,
    // Music & nightlife
    `${metro} concerti`,
    `${metro} discoteche club`,
    `${metro} nightlife events`,
    `${metro} serate dj`,
    // Culture & arts
    `${metro} eventi culturali`,
    `${metro} mostre musei`,
    `${metro} teatro spettacoli`,
    // Site-specific discovery
    `site:feverup.com ${metro}`,
    `site:eventbrite.it ${metro}`,
    // Venue discovery
    `${metro} locali eventi programmazione`,
    `${metro} venue eventi calendario`,
  ];

  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    try {
      const results = await braveSearch(query, { count: 10 });

      for (const result of results) {
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push(result);
        }
      }

      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Search failed for "${query}":`, error);
    }
  }

  return allResults;
}
