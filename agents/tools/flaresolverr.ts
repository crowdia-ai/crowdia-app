/**
 * FlareSolverr integration for bypassing Cloudflare protection
 *
 * To use, run FlareSolverr via Docker:
 * docker run -d --name=flaresolverr -p 8191:8191 -e LOG_LEVEL=info ghcr.io/flaresolverr/flaresolverr:latest
 */

const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL || "http://localhost:8191/v1";

interface FlareSolverResponse {
  status: string;
  message: string;
  solution?: {
    url: string;
    status: number;
    headers: Record<string, string>;
    response: string;
    cookies: Array<{ name: string; value: string }>;
    userAgent: string;
  };
}

/**
 * Check if FlareSolverr is available
 */
export async function isFlareSolverrAvailable(): Promise<boolean> {
  try {
    const response = await fetch(FLARESOLVERR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "sessions.list" }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch a page using FlareSolverr to bypass Cloudflare
 */
export async function fetchWithFlareSolverr(
  url: string,
  options: { maxTimeout?: number } = {}
): Promise<string> {
  const { maxTimeout = 60000 } = options;

  console.log(`  Using FlareSolverr for: ${url}`);

  const response = await fetch(FLARESOLVERR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: "request.get",
      url,
      maxTimeout,
    }),
  });

  if (!response.ok) {
    throw new Error(`FlareSolverr request failed: ${response.status}`);
  }

  const data: FlareSolverResponse = await response.json();

  if (data.status !== "ok" || !data.solution) {
    throw new Error(`FlareSolverr failed: ${data.message}`);
  }

  return data.solution.response;
}

/**
 * Extract text content from HTML (similar to headless.ts)
 */
export function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
