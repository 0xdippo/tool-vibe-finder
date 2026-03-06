import { tokenize } from "../lib/text.js";
import type { RecipeCandidate, VibeProfile } from "../types.js";

function overlapScore(text: string, terms: string[]): number {
  const haystack = tokenize(text);
  let score = 0;

  for (const term of terms) {
    const tokens = tokenize(term);
    const matches = tokens.filter((token) => haystack.includes(token)).length;
    score += matches;
  }

  return score;
}

function buildReason(candidate: RecipeCandidate, profile: VibeProfile, query: string): string {
  if (candidate.site && profile.recipes.preferred_sites.includes(candidate.site)) {
    return `It comes from one of your preferred recipe sites and fits the ingredients you gave me.`;
  }

  if (query) {
    return `It lines up with your request for ${query.toLowerCase()} without ignoring your saved constraints.`;
  }

  return `It fits your saved taste and keeps the recipe path practical.`;
}

export function rankRecipes(candidates: RecipeCandidate[], profile: VibeProfile, query: string): RecipeCandidate[] {
  const positiveSignals = [...profile.recipes.likes, ...profile.recipes.soft_signals, ...profile.global_preferences.soft_memory];
  const negativeSignals = [...profile.recipes.ingredient_bans, ...profile.recipes.dislikes];
  const siteBoost = new Set(profile.recipes.preferred_sites.map((site) => site.toLowerCase()));

  return candidates
    .map((candidate) => {
      const text = `${candidate.title} ${candidate.description} ${candidate.site ?? ""}`;
      let score =
        overlapScore(text, positiveSignals) * 2 +
        overlapScore(text, [query]) * 2 -
        overlapScore(text, negativeSignals) * 6;

      if (candidate.site && siteBoost.has(candidate.site.toLowerCase())) {
        score += 4;
      }

      return {
        ...candidate,
        score,
        reason: buildReason(candidate, profile, query),
      };
    })
    .filter((candidate) => {
      const text = `${candidate.title} ${candidate.description}`.toLowerCase();
      return !profile.recipes.ingredient_bans.some((ban) => text.includes(ban.toLowerCase()));
    })
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
}
