import {
  DATA_DIR,
  FEEDBACK_LOG_PATH,
  PROFILE_PATH,
  RECOMMENDATION_LOG_PATH,
  STORY_LOG_PATH,
} from "../lib/paths.js";
import { ensureDirectory, ensureTextFile, fileExists, readJsonFile, writeJsonFile } from "../lib/files.js";
import { migrateLegacyLogs } from "./logMigration.js";
import { applyProviderSecrets, loadProviderSecrets, migrateEmbeddedSensitiveState } from "./providerSecrets.js";
import { loadSessionContext, saveSessionContext } from "./sessionContext.js";
import type { VibeProfile } from "../types.js";

export const defaultProfile: VibeProfile = {
  global_preferences: {
    language_preference: "en-US",
    enabled_features: {
      shows: true,
      recipes: true,
      stories: true,
    },
    enabled_providers: {
      tmdb: false,
      watchmode: false,
      webSearch: true,
    },
    feedback_mode: "both",
    hard_memory: [],
    soft_memory: [],
    providers: {
      tmdb: {
        enabled: false,
        metadataLanguage: "en-US",
      },
      watchmode: {
        enabled: false,
      },
      recipes: {
        webSearch: true,
        preferredSites: [],
      },
    },
  },
  shows: {
    likes: [],
    dislikes: [],
    soft_signals: [],
    recent_feedback: [],
    metadata_language: "en-US",
  },
  stories: {
    likes: [],
    dislikes: [],
    soft_signals: [],
    recent_feedback: [],
    tone: ["warm", "calm", "lightly personal", "not cutesy"],
    target_words: 1200,
  },
  recipes: {
    likes: [],
    dislikes: [],
    soft_signals: [],
    recent_feedback: [],
    ingredient_bans: [],
    dietary_constraints: [],
    preferred_sites: [],
  },
  feedback_history: [],
  wizard: {
    completed: false,
    history: [],
  },
  session_context: {},
};

export async function ensureDataFiles(): Promise<void> {
  await ensureDirectory(DATA_DIR);
  await ensureTextFile(RECOMMENDATION_LOG_PATH);
  await ensureTextFile(STORY_LOG_PATH);
  await ensureTextFile(FEEDBACK_LOG_PATH);
  await migrateLegacyLogs();

  if (!(await fileExists(PROFILE_PATH))) {
    await writeJsonFile(PROFILE_PATH, defaultProfile);
  }
}

export async function loadProfile(): Promise<VibeProfile> {
  await ensureDataFiles();
  const storedProfile = await readJsonFile<VibeProfile>(PROFILE_PATH, defaultProfile);

  if (storedProfile.session_context.last_query || storedProfile.session_context.last_mode || storedProfile.session_context.last_recommendations) {
    saveSessionContext(storedProfile.session_context);
  }

  const sanitizedProfile = await migrateEmbeddedSensitiveState(storedProfile);
  const secrets = await loadProviderSecrets();
  const profile = applyProviderSecrets(sanitizedProfile, secrets);
  profile.session_context = loadSessionContext();
  return profile;
}
