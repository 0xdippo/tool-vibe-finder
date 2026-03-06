import { validateTmdbToken, validateWatchmodeKey } from "./providerValidation.js";
import type { VibeProfile, WizardAnswerInput, WizardStep, WizardStepId } from "../types.js";

interface WizardStateView {
  completed: boolean;
  step: WizardStep | null;
}

interface WizardAnswerResult extends WizardStateView {
  profile: VibeProfile;
  message?: string;
  error?: string;
}

const allSteps: WizardStepId[] = [
  "feature_shows",
  "feature_recipes",
  "feature_stories",
  "tmdb_enabled",
  "tmdb_token",
  "tmdb_language",
  "watchmode_enabled",
  "watchmode_key",
  "recipe_web_search",
  "recipe_sites",
  "story_length",
  "story_tone",
  "feedback_mode",
];

function buildStep(id: WizardStepId, progress: number): WizardStep {
  switch (id) {
    case "feature_shows":
      return {
        id,
        title: "Shows",
        question: "Do you want to enable shows?",
        kind: "boolean",
        allowSkip: true,
        progress,
      };
    case "feature_recipes":
      return {
        id,
        title: "Recipes",
        question: "Do you want to enable recipes?",
        kind: "boolean",
        allowSkip: true,
        progress,
      };
    case "feature_stories":
      return {
        id,
        title: "Stories",
        question: "Do you want to enable stories?",
        kind: "boolean",
        allowSkip: true,
        progress,
      };
    case "tmdb_enabled":
      return {
        id,
        title: "TMDB",
        question: "Do you want to use TMDB for finding shows?",
        kind: "boolean",
        allowSkip: true,
        helperText: "If you need a key, create a TMDB account and generate a read access token in API settings.",
        progress,
      };
    case "tmdb_token":
      return {
        id,
        title: "TMDB Token",
        question: "Paste your TMDB read access token.",
        kind: "text",
        allowSkip: true,
        placeholder: "TMDB read access token",
        helperText: "You can skip this and use web search fallback instead.",
        progress,
      };
    case "tmdb_language":
      return {
        id,
        title: "TMDB Language",
        question: "Preferred TMDB metadata language?",
        kind: "choice",
        allowSkip: true,
        options: [
          { label: "English (US)", value: "en-US" },
          { label: "English (UK)", value: "en-GB" },
          { label: "Spanish", value: "es-ES" },
          { label: "French", value: "fr-FR" },
        ],
        progress,
      };
    case "watchmode_enabled":
      return {
        id,
        title: "Watchmode",
        question: "Do you want to use Watchmode for streaming availability?",
        kind: "boolean",
        allowSkip: true,
        helperText: "If skipped, show recommendations will omit where-to-watch details.",
        progress,
      };
    case "watchmode_key":
      return {
        id,
        title: "Watchmode Key",
        question: "Paste your Watchmode API key.",
        kind: "text",
        allowSkip: true,
        placeholder: "Watchmode API key",
        helperText: "You can request a key from Watchmode and add it later.",
        progress,
      };
    case "recipe_web_search":
      return {
        id,
        title: "Recipe Search",
        question: "Use web search by default for recipes?",
        kind: "boolean",
        allowSkip: true,
        progress,
      };
    case "recipe_sites":
      return {
        id,
        title: "Recipe Sites",
        question: "Preferred recipe sites?",
        kind: "list",
        allowSkip: true,
        placeholder: "allrecipes.com, foodnetwork.com, budgetbytes.com",
        helperText: "Comma-separated domains. Skip to use general web search.",
        progress,
      };
    case "story_length":
      return {
        id,
        title: "Story Length",
        question: "Default story length?",
        kind: "choice",
        allowSkip: true,
        options: [
          { label: "~1200 words", value: "1200" },
          { label: "~800 words", value: "800" },
          { label: "~1600 words", value: "1600" },
        ],
        progress,
      };
    case "story_tone":
      return {
        id,
        title: "Story Tone",
        question: "Brand tone preset?",
        kind: "choice",
        allowSkip: true,
        options: [
          { label: "Warm / Calm", value: "warm, calm, lightly personal, not cutesy" },
          { label: "Romantic / Gentle", value: "romantic, warm, gentle, grounded" },
          { label: "Moody / Dramatic", value: "dramatic, vivid, emotional, still tasteful" },
        ],
        progress,
      };
    case "feedback_mode":
      return {
        id,
        title: "Feedback",
        question: "How should feedback work?",
        kind: "choice",
        allowSkip: true,
        options: [
          { label: "Both", value: "both" },
          { label: "Free text only", value: "free_text" },
          { label: "Chips only", value: "chips" },
        ],
        progress,
      };
  }
}

function hasAnswered(profile: VibeProfile, stepId: WizardStepId): boolean {
  return profile.wizard.history.some((entry) => entry.stepId === stepId);
}

function stepApplies(profile: VibeProfile, stepId: WizardStepId): boolean {
  switch (stepId) {
    case "tmdb_enabled":
    case "watchmode_enabled":
      return profile.global_preferences.enabled_features.shows;
    case "tmdb_token":
    case "tmdb_language":
      return profile.global_preferences.enabled_features.shows && profile.global_preferences.providers.tmdb.enabled;
    case "watchmode_key":
      return profile.global_preferences.enabled_features.shows && profile.global_preferences.providers.watchmode.enabled;
    case "recipe_web_search":
    case "recipe_sites":
      return profile.global_preferences.enabled_features.recipes;
    case "story_length":
    case "story_tone":
      return profile.global_preferences.enabled_features.stories;
    default:
      return true;
  }
}

function nextStep(profile: VibeProfile): WizardStep | null {
  for (const [index, stepId] of allSteps.entries()) {
    if (!stepApplies(profile, stepId)) {
      continue;
    }

    if (!hasAnswered(profile, stepId)) {
      return buildStep(stepId, index + 1);
    }
  }

  return null;
}

function recordAnswer(profile: VibeProfile, input: WizardAnswerInput): void {
  const storedValue =
    input.stepId === "tmdb_token" || input.stepId === "watchmode_key"
      ? input.value
        ? "[redacted]"
        : ""
      : (input.value ?? "");

  profile.wizard.history = profile.wizard.history.filter((entry) => entry.stepId !== input.stepId);
  profile.wizard.history.push({
    stepId: input.stepId,
    value: storedValue,
    skipped: input.skipped,
    at: new Date().toISOString(),
  });
}

export function getWizardState(profile: VibeProfile): WizardStateView {
  const step = nextStep(profile);
  profile.wizard.completed = step === null;
  return {
    completed: profile.wizard.completed,
    step,
  };
}

export async function applyWizardAnswer(profile: VibeProfile, input: WizardAnswerInput): Promise<WizardAnswerResult> {
  if (input.skipped) {
    recordAnswer(profile, input);
    return {
      profile,
      ...getWizardState(profile),
      message: "Skipped. You can come back to provider setup later by editing the profile file.",
    };
  }

  switch (input.stepId) {
    case "feature_shows":
      profile.global_preferences.enabled_features.shows = Boolean(input.value);
      break;
    case "feature_recipes":
      profile.global_preferences.enabled_features.recipes = Boolean(input.value);
      break;
    case "feature_stories":
      profile.global_preferences.enabled_features.stories = Boolean(input.value);
      break;
    case "tmdb_enabled":
      profile.global_preferences.providers.tmdb.enabled = Boolean(input.value);
      profile.global_preferences.enabled_providers.tmdb = Boolean(input.value);
      break;
    case "tmdb_token": {
      const token = String(input.value ?? "").trim();
      if (!token) {
        return {
          profile,
          ...getWizardState(profile),
          error: "Paste a TMDB token or skip this step.",
        };
      }
      const validation = await validateTmdbToken(token);
      if (!validation.valid) {
        return {
          profile,
          ...getWizardState(profile),
          error: validation.message,
        };
      }
      profile.global_preferences.providers.tmdb.token = token;
      profile.global_preferences.providers.tmdb.lastValidatedAt = new Date().toISOString();
      break;
    }
    case "tmdb_language":
      profile.global_preferences.providers.tmdb.metadataLanguage = String(input.value ?? "en-US");
      profile.shows.metadata_language = profile.global_preferences.providers.tmdb.metadataLanguage;
      break;
    case "watchmode_enabled":
      profile.global_preferences.providers.watchmode.enabled = Boolean(input.value);
      profile.global_preferences.enabled_providers.watchmode = Boolean(input.value);
      break;
    case "watchmode_key": {
      const apiKey = String(input.value ?? "").trim();
      if (!apiKey) {
        return {
          profile,
          ...getWizardState(profile),
          error: "Paste a Watchmode key or skip this step.",
        };
      }
      const validation = await validateWatchmodeKey(apiKey);
      if (!validation.valid) {
        return {
          profile,
          ...getWizardState(profile),
          error: validation.message,
        };
      }
      profile.global_preferences.providers.watchmode.apiKey = apiKey;
      profile.global_preferences.providers.watchmode.lastValidatedAt = new Date().toISOString();
      break;
    }
    case "recipe_web_search":
      profile.global_preferences.providers.recipes.webSearch = Boolean(input.value);
      profile.global_preferences.enabled_providers.webSearch = Boolean(input.value);
      break;
    case "recipe_sites": {
      const sites = String(input.value ?? "")
        .split(/,|\n/)
        .map((value) => value.trim())
        .filter(Boolean);
      profile.global_preferences.providers.recipes.preferredSites = sites;
      profile.recipes.preferred_sites = sites;
      break;
    }
    case "story_length":
      profile.stories.target_words = Number.parseInt(String(input.value ?? "1200"), 10) || 1200;
      break;
    case "story_tone":
      profile.stories.tone = String(input.value ?? "warm, calm, lightly personal, not cutesy")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      break;
    case "feedback_mode":
      profile.global_preferences.feedback_mode = (String(input.value ?? "both") as VibeProfile["global_preferences"]["feedback_mode"]);
      break;
  }

  recordAnswer(profile, input);
  const state = getWizardState(profile);

  return {
    profile,
    ...state,
    message: state.completed ? "Setup complete. You can start chatting now." : "Saved.",
  };
}
