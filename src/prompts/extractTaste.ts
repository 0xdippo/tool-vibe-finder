import type { DomainMode, VibeProfile } from "../types.js";

export function buildTasteExtractionSystemPrompt(): string {
  return [
    "You extract user taste preferences for a local single-user assistant.",
    "Return JSON only.",
    'Schema: {"mode":"shows"|"recipes"|"stories"|null,"hardMemory":[],"softMemory":[],"likes":[],"dislikes":[],"ingredientBans":[],"dietaryConstraints":[]}.',
    "Use hardMemory only for durable constraints or explicit bans.",
    "Use softMemory for vibe, tone, length, or refinement preferences.",
    "Do not invent details.",
  ].join(" ");
}

export function buildTasteExtractionUserPrompt(message: string, profile: VibeProfile, mode?: DomainMode): string {
  return JSON.stringify(
    {
      instruction: "Extract preference signals from the user message.",
      modeHint: mode ?? null,
      message,
      profileSnapshot: {
        hardMemory: profile.global_preferences.hard_memory,
        softMemory: profile.global_preferences.soft_memory,
        shows: {
          likes: profile.shows.likes,
          dislikes: profile.shows.dislikes,
          softSignals: profile.shows.soft_signals,
        },
        recipes: {
          ingredientBans: profile.recipes.ingredient_bans,
          dietaryConstraints: profile.recipes.dietary_constraints,
          preferredSites: profile.recipes.preferred_sites,
        },
        stories: {
          tone: profile.stories.tone,
          targetWords: profile.stories.target_words,
        },
      },
    },
    null,
    2,
  );
}
