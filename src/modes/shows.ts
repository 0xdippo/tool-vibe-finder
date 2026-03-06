import { HttpError } from "../lib/http.js";
import { parseListInput } from "../lib/text.js";
import { getTmdbShowCandidates } from "../providers/shows/tmdb.js";
import { getWebShowCandidates } from "../providers/shows/webFallback.js";
import { enrichWithWatchmode } from "../providers/shows/watchmode.js";
import { rankShows } from "../ranking/rankShows.js";
import type { ChatResponse, ResultCard, ShowCandidate, VibeProfile } from "../types.js";

function buildShowQuery(message: string, profile: VibeProfile): string {
  const cleaned = message
    .replace(/find me|recommend|show me|something|tonight|to watch|a show|show|series|tv|movie|watch/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const recentLikes = profile.shows.likes.slice(-2);
  if (/i\s+(?:like|love|enjoy|prefer)/i.test(message) && recentLikes.length > 0) {
    return `shows like ${recentLikes.join(" and ")}`;
  }

  if (cleaned && cleaned.split(" ").length > 1) {
    return cleaned;
  }

  if (recentLikes.length > 0) {
    return `shows like ${recentLikes.join(" and ")}`;
  }

  if (profile.shows.soft_signals.length > 0) {
    return `${profile.shows.soft_signals.slice(-3).join(" ")} series`;
  }

  return "feel good romantic drama";
}

function asCards(candidates: ShowCandidate[]): ResultCard[] {
  return candidates.slice(0, 3).map((candidate) => ({
    title: candidate.title,
    subtitle: candidate.description,
    url: candidate.url,
    caption:
      candidate.availability && candidate.availability.length > 0
        ? `Where to watch: ${candidate.availability.slice(0, 3).join(", ")}`
        : candidate.source === "tmdb"
          ? "Source: TMDB"
          : "Source: web search",
  }));
}

function formatReply(candidates: ShowCandidate[]): string {
  const top = candidates[0];
  const others = candidates.slice(1, 3);

  if (!top) {
    return "I couldn’t find a confident show match right now. Try adding a vibe like cozy, romantic, lighter, or mystery.";
  }

  return [
    "Top pick:",
    top.title,
    "",
    "Why it fits:",
    top.reason ?? "It matches your saved taste.",
    "",
    "Also try:",
    ...others.map((candidate) => candidate.title),
  ].join("\n");
}

export async function runShowsMode(message: string, profile: VibeProfile): Promise<ChatResponse> {
  if (!profile.global_preferences.enabled_features.shows) {
    return {
      mode: "system",
      reply: "Shows are disabled in your local profile. Re-run the setup wizard or reset your vibe to turn them back on.",
      chips: [],
      cards: [],
    };
  }

  const query = buildShowQuery(message, profile);
  const providers = profile.global_preferences.providers;
  let candidates: ShowCandidate[] = [];

  try {
    if (providers.tmdb.enabled && providers.tmdb.token) {
      candidates = await getTmdbShowCandidates(query, providers.tmdb.token, providers.tmdb.metadataLanguage);
    }
  } catch (error) {
    if (error instanceof HttpError && error.isRateLimited) {
      return {
        mode: "shows",
        reply: "TMDB is rate limiting requests right now. I can still try web fallback if you want, or you can wait a minute and retry.",
        chips: ["try web fallback", "lighter", "more romantic"],
        cards: [],
        rateLimited: true,
      };
    }
  }

  if (candidates.length < 5) {
    const seedTitles = parseListInput(message).slice(0, 2);
    const fallbackQuery = seedTitles.length > 0 ? `shows like ${seedTitles.join(" and ")}` : query;
    const fallbackCandidates = await getWebShowCandidates(fallbackQuery);
    candidates = [...candidates, ...fallbackCandidates];
  }

  let ranked = rankShows(candidates, profile, query);
  if (providers.watchmode.enabled && providers.watchmode.apiKey && ranked.length > 0) {
    ranked = await enrichWithWatchmode(ranked, providers.watchmode.apiKey);
  }

  return {
    mode: "shows",
    reply: formatReply(ranked),
    chips: ["more like this", "lighter", "more romantic", "less teen"],
    cards: asCards(ranked),
  };
}
