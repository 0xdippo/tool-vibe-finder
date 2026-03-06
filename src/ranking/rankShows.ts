import { tokenize } from "../lib/text.js";
import type { ShowCandidate, VibeProfile } from "../types.js";

function overlapScore(text: string, terms: string[]): number {
  const haystack = tokenize(text);
  let score = 0;

  for (const term of terms) {
    const tokens = tokenize(term);
    if (tokens.length === 0) {
      continue;
    }

    const matched = tokens.filter((token) => haystack.includes(token)).length;
    if (matched > 0) {
      score += matched;
    }
  }

  return score;
}

function buildReason(candidate: ShowCandidate, profile: VibeProfile, query: string): string {
  const positiveSignals = [...profile.shows.soft_signals, ...profile.global_preferences.soft_memory];
  const match = positiveSignals.find((signal) =>
    tokenize(`${candidate.title} ${candidate.description} ${candidate.genres.join(" ")}`).some((token) =>
      tokenize(signal).includes(token),
    ),
  );

  if (match) {
    return `It matches your ${match} preference without drifting away from your saved vibe.`;
  }

  if (query) {
    return `It tracks closely with your request for ${query.toLowerCase()}.`;
  }

  if (candidate.availability && candidate.availability.length > 0) {
    return `It fits your saved taste and already has streaming availability attached.`;
  }

  return `It lines up with the tone and comfort level saved in your profile.`;
}

export function rankShows(candidates: ShowCandidate[], profile: VibeProfile, query: string): ShowCandidate[] {
  const positiveSignals = [...profile.shows.likes, ...profile.shows.soft_signals, ...profile.global_preferences.soft_memory];
  const negativeSignals = [...profile.shows.dislikes];
  const queryText = query.trim();
  const likedTitles = new Set(profile.shows.likes.map((item) => item.toLowerCase()));

  return candidates
    .filter((candidate) => !likedTitles.has(candidate.title.toLowerCase()))
    .map((candidate) => {
      const text = `${candidate.title} ${candidate.description} ${candidate.genres.join(" ")}`;
      const score =
        overlapScore(text, positiveSignals) * 3 +
        overlapScore(text, [queryText]) * 2 -
        overlapScore(text, negativeSignals) * 4 +
        (candidate.availability?.length ?? 0);

      return {
        ...candidate,
        score,
        reason: buildReason(candidate, profile, queryText),
      };
    })
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
}
