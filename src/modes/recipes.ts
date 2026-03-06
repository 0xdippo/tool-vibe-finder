import { parseListInput } from "../lib/text.js";
import { getRecipeCandidates } from "../providers/recipes/webSearch.js";
import { rankRecipes } from "../ranking/rankRecipes.js";
import type { ChatResponse, RecipeCandidate, ResultCard, VibeProfile } from "../types.js";

function extractIngredients(message: string): string[] {
  const explicit = message.match(/^i have\s+(.+)/i)?.[1];
  if (explicit) {
    return parseListInput(explicit);
  }

  return parseListInput(message).filter((item) => item.split(" ").length <= 3);
}

function buildRecipeQuery(message: string, profile: VibeProfile): string {
  const ingredients = extractIngredients(message);
  if (ingredients.length > 0) {
    return `${ingredients.join(" ")} ${profile.recipes.soft_signals.slice(-1).join(" ")}`.trim();
  }

  const cleaned = message
    .replace(/find me|recommend|recipe|dinner|lunch|breakfast|cook/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned) {
    return cleaned;
  }

  if (profile.recipes.soft_signals.length > 0) {
    return profile.recipes.soft_signals.slice(-2).join(" ");
  }

  return "easy comfort food dinner";
}

function buildFallbackRecipeIdeas(query: string, ingredients: string[], profile: VibeProfile): RecipeCandidate[] {
  const focus = ingredients.length > 0 ? ingredients.join(", ") : query || "pantry staples";
  const familyFriendly = profile.recipes.dietary_constraints.includes("family-friendly") ? "family-friendly " : "";

  return [
    {
      id: "generated:1",
      title: `${familyFriendly}Skillet Supper`,
      description: `Generated meal idea built around ${focus}.`,
      source: "generated",
      ingredientsHint: ingredients,
      reason: "Generated because live recipe retrieval came back thin.",
    },
    {
      id: "generated:2",
      title: `Cozy Bowl with ${ingredients[0] ?? "Rice"}`,
      description: `Generated meal idea with a softer comfort-food angle and practical cleanup.`,
      source: "generated",
      ingredientsHint: ingredients,
      reason: "Generated because live recipe retrieval came back thin.",
    },
    {
      id: "generated:3",
      title: `Weeknight Bake`,
      description: `Generated meal idea tuned for a manageable weeknight path.`,
      source: "generated",
      ingredientsHint: ingredients,
      reason: "Generated because live recipe retrieval came back thin.",
    },
  ];
}

function asCards(candidates: RecipeCandidate[]): ResultCard[] {
  return candidates.slice(0, 3).map((candidate) => ({
    title: candidate.title,
    subtitle: candidate.description,
    url: candidate.url,
    caption:
      candidate.source === "generated"
        ? "Generated fallback idea"
        : `Source: ${candidate.site ?? "web search"}`,
  }));
}

function formatReply(candidates: RecipeCandidate[]): string {
  const top = candidates[0];
  const others = candidates.slice(1, 3);

  if (!top) {
    return "I couldn’t find a solid recipe candidate right now. Try giving me ingredients or a vibe like healthier, comfort food, or family-friendly.";
  }

  return [
    "Top pick:",
    top.title,
    "",
    "Why it fits:",
    top.reason ?? "It matches your saved recipe preferences.",
    "",
    "Also try:",
    ...others.map((candidate) => candidate.title),
  ].join("\n");
}

export async function runRecipesMode(message: string, profile: VibeProfile): Promise<ChatResponse> {
  if (!profile.global_preferences.enabled_features.recipes) {
    return {
      mode: "system",
      reply: "Recipes are disabled in your local profile. Re-run the setup wizard or reset your vibe to turn them back on.",
      chips: [],
      cards: [],
    };
  }

  const ingredients = extractIngredients(message);
  const query = buildRecipeQuery(message, profile);
  let candidates: RecipeCandidate[] = [];

  if (profile.global_preferences.providers.recipes.webSearch) {
    candidates = await getRecipeCandidates(query, profile.recipes.preferred_sites);
  }

  if (candidates.length === 0) {
    candidates = buildFallbackRecipeIdeas(query, ingredients, profile);
  }

  const ranked = rankRecipes(candidates, profile, query);

  return {
    mode: "recipes",
    reply: formatReply(ranked),
    chips: ["easier", "healthier", "family-friendly", "comfort food", "use what I have"],
    cards: asCards(ranked),
  };
}
