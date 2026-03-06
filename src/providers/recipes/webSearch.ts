import { searchWeb } from "../../lib/webSearch.js";
import type { RecipeCandidate } from "../../types.js";

function recipeTitle(title: string): string {
  return title
    .replace(/\s*[|:-]\s*(Allrecipes|Food Network|Budget Bytes|Delish|Epicurious|BBC Good Food).*/i, "")
    .trim();
}

export async function getRecipeCandidates(query: string, preferredSites: string[]): Promise<RecipeCandidate[]> {
  const searchQuery = `${query} recipe`;
  const results = await searchWeb(searchQuery, preferredSites);

  return results.map((result, index) => ({
    id: `recipe:${index}:${result.url}`,
    title: recipeTitle(result.title),
    description: result.snippet || "Recipe result",
    source: "web",
    url: result.url,
    site: result.source,
    ingredientsHint: [],
  }));
}
