import { generateJson } from "../lib/llm.js";
import { parseListInput, uniqueStrings } from "../lib/text.js";
import { buildTasteExtractionSystemPrompt, buildTasteExtractionUserPrompt } from "../prompts/extractTaste.js";
import type { ClassifiedIntent, DomainMode, TasteUpdate, VibeProfile } from "../types.js";

interface ExtractionFallback {
  mode: DomainMode | null;
  hardMemory: string[];
  softMemory: string[];
  likes: string[];
  dislikes: string[];
  ingredientBans: string[];
  dietaryConstraints: string[];
}

function pushLimited(list: string[], values: string[], limit = 12): string[] {
  const next = uniqueStrings([...list, ...values]);
  return next.slice(Math.max(0, next.length - limit));
}

function inferModeFromMessage(message: string, fallbackMode?: DomainMode): DomainMode | undefined {
  if (/story|fiction|bedtime|romance|scene/i.test(message)) {
    return "stories";
  }

  if (/recipe|dinner|cook|meal|ingredient|chicken|rice|broccoli|mushroom|seafood/i.test(message)) {
    return "recipes";
  }

  if (/show|watch|movie|series|tv|gilmore girls|virgin river/i.test(message)) {
    return "shows";
  }

  return fallbackMode;
}

function removeMostRecentPreference(profile: VibeProfile): string | undefined {
  const lastFeedback = profile.feedback_history.pop();
  const hardMemory = profile.global_preferences.hard_memory;
  const softMemory = profile.global_preferences.soft_memory;

  if (softMemory.length > 0) {
    return softMemory.pop();
  }

  if (hardMemory.length > 0) {
    return hardMemory.pop();
  }

  return lastFeedback?.feedback;
}

function applyModeSignals(profile: VibeProfile, mode: DomainMode | undefined, likes: string[], dislikes: string[], soft: string[]): void {
  if (!mode) {
    profile.global_preferences.soft_memory = pushLimited(profile.global_preferences.soft_memory, soft);
    return;
  }

  const bucket = profile[mode];
  bucket.likes = pushLimited(bucket.likes, likes);
  bucket.dislikes = pushLimited(bucket.dislikes, dislikes);
  bucket.soft_signals = pushLimited(bucket.soft_signals, soft);
  bucket.recent_feedback = pushLimited(bucket.recent_feedback, [...soft, ...likes, ...dislikes], 8);
}

function collectExplicitItems(message: string): string[] {
  const pattern = /(?:i\s+(?:like|love|enjoy|prefer)|more|less)\s+(.+)/i;
  const match = message.match(pattern);
  if (!match?.[1]) {
    return [];
  }
  return parseListInput(match[1].replace(/\bfor now\b/gi, ""));
}

function collectIngredientBan(message: string): string[] {
  const fullBan = message.match(/^(?:no|without)\s+(.+?)(?:\s+ever)?[.!]?$/i);
  if (fullBan?.[1]) {
    return parseListInput(fullBan[1]);
  }
  return [];
}

function collectDietaryConstraints(message: string): string[] {
  const matches = [
    "vegetarian",
    "vegan",
    "gluten-free",
    "dairy-free",
    "halal",
    "kosher",
    "keto",
    "nut-free",
    "family-friendly",
  ].filter((value) => new RegExp(`\\b${value}\\b`, "i").test(message));

  return uniqueStrings(matches);
}

async function extractFallbackSignals(
  profile: VibeProfile,
  message: string,
  mode?: DomainMode,
): Promise<ExtractionFallback | null> {
  return generateJson<ExtractionFallback>({
    systemPrompt: buildTasteExtractionSystemPrompt(),
    userPrompt: buildTasteExtractionUserPrompt(message, profile, mode),
    temperature: 0.1,
    maxTokens: 400,
  });
}

export async function updateProfile(profile: VibeProfile, message: string, intent: ClassifiedIntent): Promise<TasteUpdate> {
  const mode = intent.mode ?? inferModeFromMessage(message, profile.session_context.last_mode);
  const noteParts: string[] = [];

  if (/forget that preference/i.test(message)) {
    const removed = removeMostRecentPreference(profile);
    return {
      mode,
      memoryNote: removed
        ? `Removed the most recent saved preference: ${removed}.`
        : "There was no saved preference to remove.",
    };
  }

  const ingredientBans = collectIngredientBan(message);
  const dietaryConstraints = collectDietaryConstraints(message);
  const likes = /i\s+(?:like|love|enjoy|prefer)/i.test(message) ? collectExplicitItems(message) : [];
  const dislikes = /\btoo\b\s+|\bless\b\s+|don'?t\s+want|avoid/i.test(message) ? collectExplicitItems(message) : [];
  const refinements = [
    ...(/\bmore\b\s+(.+)/i.test(message) ? collectExplicitItems(message) : []),
    ...(/\bless\b\s+(.+)/i.test(message) ? collectExplicitItems(message) : []),
  ];

  if (ingredientBans.length > 0) {
    profile.recipes.ingredient_bans = pushLimited(profile.recipes.ingredient_bans, ingredientBans);
    profile.global_preferences.hard_memory = pushLimited(profile.global_preferences.hard_memory, ingredientBans);
    noteParts.push(`Saved ingredient bans: ${ingredientBans.join(", ")}.`);
  }

  if (dietaryConstraints.length > 0) {
    profile.recipes.dietary_constraints = pushLimited(profile.recipes.dietary_constraints, dietaryConstraints);
    profile.global_preferences.hard_memory = pushLimited(profile.global_preferences.hard_memory, dietaryConstraints);
    noteParts.push(`Saved dietary preferences: ${dietaryConstraints.join(", ")}.`);
  }

  applyModeSignals(profile, mode, likes, dislikes, refinements);

  if (likes.length > 0) {
    profile.global_preferences.soft_memory = pushLimited(profile.global_preferences.soft_memory, likes);
    noteParts.push(`Saved likes for ${mode ?? "your vibe"}: ${likes.join(", ")}.`);
  }

  if (dislikes.length > 0) {
    profile.global_preferences.soft_memory = pushLimited(profile.global_preferences.soft_memory, dislikes);
    noteParts.push(`Saved dislikes for ${mode ?? "your vibe"}: ${dislikes.join(", ")}.`);
  }

  if (refinements.length > 0) {
    profile.global_preferences.soft_memory = pushLimited(profile.global_preferences.soft_memory, refinements);
    noteParts.push(`Saved refinements: ${refinements.join(", ")}.`);
  }

  if (noteParts.length === 0 && intent.intent === "preference_input") {
    const extracted = await extractFallbackSignals(profile, message, mode);

    if (extracted) {
      profile.global_preferences.hard_memory = pushLimited(profile.global_preferences.hard_memory, extracted.hardMemory ?? []);
      profile.global_preferences.soft_memory = pushLimited(profile.global_preferences.soft_memory, extracted.softMemory ?? []);

      if (extracted.ingredientBans?.length) {
        profile.recipes.ingredient_bans = pushLimited(profile.recipes.ingredient_bans, extracted.ingredientBans);
      }

      if (extracted.dietaryConstraints?.length) {
        profile.recipes.dietary_constraints = pushLimited(profile.recipes.dietary_constraints, extracted.dietaryConstraints);
      }

      applyModeSignals(profile, extracted.mode ?? mode, extracted.likes ?? [], extracted.dislikes ?? [], extracted.softMemory ?? []);

      if (extracted.hardMemory?.length || extracted.softMemory?.length || extracted.likes?.length || extracted.dislikes?.length) {
        noteParts.push("Saved that preference to your local vibe profile.");
      }
    }
  }

  if (noteParts.length === 0 && intent.intent.startsWith("feedback_")) {
    noteParts.push("Saved that feedback for the next round.");
  }

  return {
    mode,
    memoryNote: noteParts.join(" "),
  };
}
