import { requestJson } from "../../lib/http.js";
import type { ShowCandidate } from "../../types.js";

interface WatchmodeSearchResponse {
  title_results?: Array<{
    id: number;
  }>;
}

interface WatchmodeSourceResponse extends Array<{
  name?: string;
}> {}

const availabilityCache = new Map<string, string[]>();

async function fetchAvailability(title: string, apiKey: string): Promise<string[]> {
  const cacheKey = `${apiKey}:${title.toLowerCase()}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const searchUrl = new URL("https://api.watchmode.com/v1/search/");
  searchUrl.searchParams.set("apiKey", apiKey);
  searchUrl.searchParams.set("search_field", "name");
  searchUrl.searchParams.set("search_value", title);
  searchUrl.searchParams.set("types", "tv_series");

  const searchResponse = await requestJson<WatchmodeSearchResponse>(searchUrl.toString());
  const firstTitle = searchResponse.title_results?.[0];

  if (!firstTitle) {
    availabilityCache.set(cacheKey, []);
    return [];
  }

  const sourcesUrl = new URL("https://api.watchmode.com/v1/title/" + firstTitle.id + "/sources/");
  sourcesUrl.searchParams.set("apiKey", apiKey);
  sourcesUrl.searchParams.set("regions", "US");

  const sources = await requestJson<WatchmodeSourceResponse>(sourcesUrl.toString());
  const names = [...new Set(sources.map((source) => source.name).filter((value): value is string => Boolean(value)))];
  availabilityCache.set(cacheKey, names);
  return names;
}

export async function enrichWithWatchmode(candidates: ShowCandidate[], apiKey: string): Promise<ShowCandidate[]> {
  const enriched = [...candidates];

  await Promise.all(
    enriched.slice(0, 3).map(async (candidate) => {
      try {
        const availability = await fetchAvailability(candidate.title, apiKey);
        candidate.availability = availability;
      } catch {
        candidate.availability = candidate.availability ?? [];
      }
    }),
  );

  return enriched;
}
