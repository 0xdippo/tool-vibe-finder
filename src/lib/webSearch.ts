import { requestText } from "./http.js";
import type { SearchResult } from "../types.js";

const SEARCH_CACHE = new Map<string, { expiresAt: number; results: SearchResult[] }>();
const CACHE_TTL_MS = 1000 * 60 * 15;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function unwrapDuckDuckGoUrl(rawUrl: string): string {
  const decoded = decodeHtml(rawUrl);

  try {
    const url = new URL(decoded, "https://duckduckgo.com");
    const redirected = url.searchParams.get("uddg");
    return redirected ? decodeURIComponent(redirected) : url.toString();
  } catch {
    return decoded;
  }
}

function parseDuckDuckGoResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const pattern = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const url = unwrapDuckDuckGoUrl(match[1] ?? "");
    const title = cleanHtml(match[2] ?? "");
    const nearby = html.slice(match.index, match.index + 1200);
    const snippetMatch =
      nearby.match(/class="result__snippet"[^>]*>(.*?)<\/a>/) ??
      nearby.match(/class="result__snippet"[^>]*>(.*?)<\/div>/) ??
      nearby.match(/class="result__extras__url"[^>]*>(.*?)<\/span>/);
    const snippet = cleanHtml(snippetMatch?.[1] ?? "");

    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      results.push({
        title,
        url,
        snippet,
        source: hostname,
      });
    } catch {
      continue;
    }
  }

  return results;
}

export async function searchWeb(query: string, preferredDomains: string[] = []): Promise<SearchResult[]> {
  const domainFilter =
    preferredDomains.length > 0
      ? ` (${preferredDomains.map((domain) => `site:${domain}`).join(" OR ")})`
      : "";
  const fullQuery = `${query}${domainFilter}`.trim();
  const cached = SEARCH_CACHE.get(fullQuery);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", fullQuery);

  const html = await requestText(url.toString(), {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; VibeFinder/0.1; +https://localhost)",
    },
  });

  const results = parseDuckDuckGoResults(html).slice(0, 8);
  SEARCH_CACHE.set(fullQuery, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    results,
  });

  return results;
}
