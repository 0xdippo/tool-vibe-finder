import { requestJson } from "../../lib/http.js";
import type { ShowCandidate } from "../../types.js";

interface TmdbGenreResponse {
  genres: Array<{
    id: number;
    name: string;
  }>;
}

interface TmdbListResponse {
  results: Array<{
    id: number;
    name: string;
    overview: string;
    genre_ids: number[];
    first_air_date?: string;
    original_language?: string;
  }>;
}

const resultsCache = new Map<string, ShowCandidate[]>();
let genreCache: Map<number, string> | null = null;

async function loadGenres(token: string, language: string): Promise<Map<number, string>> {
  if (genreCache) {
    return genreCache;
  }

  const response = await requestJson<TmdbGenreResponse>("https://api.themoviedb.org/3/genre/tv/list?language=" + encodeURIComponent(language), {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  });

  genreCache = new Map(response.genres.map((genre) => [genre.id, genre.name]));
  return genreCache;
}

function normalizeTmdbResult(result: TmdbListResponse["results"][number], genres: Map<number, string>): ShowCandidate {
  const year = result.first_air_date ? Number.parseInt(result.first_air_date.slice(0, 4), 10) : undefined;
  return {
    id: `tmdb:${result.id}`,
    title: result.name,
    description: result.overview || "No description available.",
    genres: result.genre_ids.map((id) => genres.get(id)).filter((value): value is string => Boolean(value)),
    year: Number.isNaN(year) ? undefined : year,
    language: result.original_language,
    source: "tmdb",
    url: `https://www.themoviedb.org/tv/${result.id}`,
  };
}

export async function getTmdbShowCandidates(query: string, token: string, language: string): Promise<ShowCandidate[]> {
  const cacheKey = `${language}:${query}`;
  const cached = resultsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const genres = await loadGenres(token, language);
  const url = new URL(query ? "https://api.themoviedb.org/3/search/tv" : "https://api.themoviedb.org/3/discover/tv");
  url.searchParams.set("language", language);
  url.searchParams.set("include_adult", "false");

  if (query) {
    url.searchParams.set("query", query);
  } else {
    url.searchParams.set("sort_by", "popularity.desc");
    url.searchParams.set("vote_count.gte", "60");
  }

  const response = await requestJson<TmdbListResponse>(url.toString(), {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  });

  const candidates = response.results.slice(0, 12).map((item) => normalizeTmdbResult(item, genres));
  resultsCache.set(cacheKey, candidates);
  return candidates;
}
