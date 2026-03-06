import { generateJson } from "../lib/llm.js";
import { looksLikeNegativeFeedback, looksLikePositiveFeedback, normalizeText, parseListInput } from "../lib/text.js";
import type { ClassifiedIntent, DomainMode, IntentType } from "../types.js";

interface LlmIntentGuess {
  intent: IntentType;
  mode?: DomainMode;
  query?: string;
  extractedItems?: string[];
}

const SHOW_KEYWORDS = ["show", "watch", "movie", "tv", "series", "tonight"];
const RECIPE_KEYWORDS = ["recipe", "dinner", "cook", "meal", "ingredients", "breakfast", "lunch"];
const STORY_KEYWORDS = ["story", "write", "bedtime", "fiction", "romantic", "romance"];

function includesKeyword(message: string, keywords: string[]): boolean {
  return keywords.some((keyword) => message.includes(keyword));
}

function inferModeByKeywords(message: string, fallbackMode?: DomainMode): DomainMode | undefined {
  if (includesKeyword(message, SHOW_KEYWORDS)) {
    return "shows";
  }
  if (includesKeyword(message, RECIPE_KEYWORDS) || /i have\s+.+/i.test(message)) {
    return "recipes";
  }
  if (includesKeyword(message, STORY_KEYWORDS)) {
    return "stories";
  }
  return fallbackMode;
}

function titleLikeItems(rawMessage: string): string[] {
  return parseListInput(
    rawMessage
      .replace(/^.*?(?:like|love|prefer)\s+/i, "")
      .replace(/[.!?]$/, ""),
  ).filter((item) => /[A-Z]/.test(item));
}

async function classifyWithLlm(message: string, lastMode?: DomainMode): Promise<LlmIntentGuess | null> {
  return generateJson<LlmIntentGuess>({
    systemPrompt: [
      "Classify a user message for a local taste assistant.",
      "Return JSON only.",
      'Schema: {"intent":"preference_input"|"show_recommendation"|"recipe_recommendation"|"ingredient_recipe"|"story_generation"|"feedback_positive"|"feedback_negative"|"feedback_refinement"|"reset_profile"|"unsupported","mode":"shows"|"recipes"|"stories"|null,"query":"","extractedItems":[]}.',
      "Use the mode only when reasonably clear.",
    ].join(" "),
    userPrompt: JSON.stringify({
      message,
      lastMode: lastMode ?? null,
    }),
    temperature: 0.1,
    maxTokens: 220,
  });
}

export async function classifyIntent(rawMessage: string, lastMode?: DomainMode): Promise<ClassifiedIntent> {
  const query = rawMessage.trim();
  const message = normalizeText(query);
  const reasons: string[] = [];
  const extractedItems = parseListInput(query);
  const inferredMode = inferModeByKeywords(message, lastMode);

  if (!query) {
    return {
      intent: "unsupported",
      confidence: 1,
      query,
      extractedItems: [],
      reasons: ["empty message"],
    };
  }

  if (/reset my vibe|reset profile|start over/i.test(query)) {
    return {
      intent: "reset_profile",
      mode: lastMode,
      confidence: 0.99,
      query,
      extractedItems: [],
      reasons: ["matched reset command"],
    };
  }

  if (/forget that preference/i.test(query)) {
    return {
      intent: "preference_input",
      mode: inferredMode,
      confidence: 0.95,
      query,
      extractedItems: [],
      reasons: ["matched forget preference command"],
    };
  }

  if (/^i have\s+/i.test(query) || /use what i have/i.test(query)) {
    return {
      intent: "ingredient_recipe",
      mode: "recipes",
      confidence: 0.99,
      query,
      extractedItems,
      reasons: ["matched ingredient recipe pattern"],
    };
  }

  if (includesKeyword(message, STORY_KEYWORDS)) {
    return {
      intent: "story_generation",
      mode: "stories",
      confidence: 0.95,
      query,
      extractedItems,
      reasons: ["matched story keywords"],
    };
  }

  if (includesKeyword(message, RECIPE_KEYWORDS)) {
    return {
      intent: "recipe_recommendation",
      mode: "recipes",
      confidence: 0.95,
      query,
      extractedItems,
      reasons: ["matched recipe keywords"],
    };
  }

  if (includesKeyword(message, SHOW_KEYWORDS)) {
    return {
      intent: "show_recommendation",
      mode: "shows",
      confidence: 0.95,
      query,
      extractedItems,
      reasons: ["matched show keywords"],
    };
  }

  if (/^(?:no|without)\s+.+/i.test(query) || /i\s+(?:like|love|enjoy|prefer)/i.test(query)) {
    const likelyShowItems = titleLikeItems(query);
    return {
      intent: "preference_input",
      mode: likelyShowItems.length > 0 ? "shows" : inferredMode,
      confidence: 0.88,
      query,
      extractedItems: likelyShowItems.length > 0 ? likelyShowItems : extractedItems,
      reasons: ["matched preference phrase"],
    };
  }

  if (/more like this|another one|lighter|more romantic|less teen|easier|healthier|shorter|sweeter|more dramatic/i.test(query)) {
    return {
      intent: "feedback_refinement",
      mode: inferredMode,
      confidence: 0.9,
      query,
      extractedItems,
      reasons: ["matched refinement phrase"],
    };
  }

  if (looksLikePositiveFeedback(query)) {
    return {
      intent: "feedback_positive",
      mode: inferredMode,
      confidence: 0.82,
      query,
      extractedItems,
      reasons: ["matched positive feedback"],
    };
  }

  if (looksLikeNegativeFeedback(query)) {
    return {
      intent: "feedback_negative",
      mode: inferredMode,
      confidence: 0.82,
      query,
      extractedItems,
      reasons: ["matched negative feedback"],
    };
  }

  const llmGuess = await classifyWithLlm(query, lastMode);
  if (llmGuess?.intent) {
    return {
      intent: llmGuess.intent,
      mode: llmGuess.mode ?? inferredMode,
      confidence: 0.65,
      query: llmGuess.query?.trim() || query,
      extractedItems: llmGuess.extractedItems ?? extractedItems,
      reasons: ["llm fallback"],
    };
  }

  return {
    intent: "unsupported",
    mode: inferredMode,
    confidence: 0.4,
    query,
    extractedItems,
    reasons: ["no deterministic or llm match"],
  };
}
