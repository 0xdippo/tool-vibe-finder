import { readJsonFile, writeJsonFile } from "../lib/files.js";
import { PROFILE_PATH, PROVIDER_SECRETS_PATH } from "../lib/paths.js";
import { hashText, redactText } from "../lib/privacy.js";
import type { VibeProfile, WizardHistoryEntry } from "../types.js";

interface ProviderSecrets {
  tmdb: {
    token?: string;
  };
  watchmode: {
    apiKey?: string;
  };
}

const defaultProviderSecrets: ProviderSecrets = {
  tmdb: {},
  watchmode: {},
};

function cloneProfile(profile: VibeProfile): VibeProfile {
  return JSON.parse(JSON.stringify(profile)) as VibeProfile;
}

function sanitizeWizardEntry(entry: WizardHistoryEntry): WizardHistoryEntry {
  if (entry.stepId === "tmdb_token" || entry.stepId === "watchmode_key") {
    return {
      ...entry,
      value: typeof entry.value === "string" && entry.value ? "[redacted]" : "",
    };
  }

  return entry;
}

function sanitizeFeedbackValue(value: string): string {
  if (!value) {
    return value;
  }

  return value.startsWith("sha256:") ? value : redactText(value);
}

export function extractProviderSecrets(profile: VibeProfile): ProviderSecrets {
  return {
    tmdb: {
      token: profile.global_preferences.providers.tmdb.token,
    },
    watchmode: {
      apiKey: profile.global_preferences.providers.watchmode.apiKey,
    },
  };
}

export function stripSensitiveProfileState(profile: VibeProfile): VibeProfile {
  const sanitized = cloneProfile(profile);
  delete sanitized.global_preferences.providers.tmdb.token;
  delete sanitized.global_preferences.providers.watchmode.apiKey;
  sanitized.wizard.history = sanitized.wizard.history.map(sanitizeWizardEntry);
  sanitized.feedback_history = sanitized.feedback_history.map((entry) => ({
    ...entry,
    feedback: sanitizeFeedbackValue(entry.feedback),
  }));
  sanitized.session_context = {};
  return sanitized;
}

export function applyProviderSecrets(profile: VibeProfile, secrets: ProviderSecrets): VibeProfile {
  const hydrated = cloneProfile(profile);
  if (secrets.tmdb.token) {
    hydrated.global_preferences.providers.tmdb.token = secrets.tmdb.token;
  }
  if (secrets.watchmode.apiKey) {
    hydrated.global_preferences.providers.watchmode.apiKey = secrets.watchmode.apiKey;
  }
  return hydrated;
}

export async function loadProviderSecrets(): Promise<ProviderSecrets> {
  return readJsonFile<ProviderSecrets>(PROVIDER_SECRETS_PATH, defaultProviderSecrets);
}

export async function saveProviderSecrets(secrets: ProviderSecrets): Promise<void> {
  await writeJsonFile(PROVIDER_SECRETS_PATH, {
    tmdb: secrets.tmdb.token ? { token: secrets.tmdb.token } : {},
    watchmode: secrets.watchmode.apiKey ? { apiKey: secrets.watchmode.apiKey } : {},
  });
}

export async function clearProviderSecrets(): Promise<void> {
  await writeJsonFile(PROVIDER_SECRETS_PATH, defaultProviderSecrets);
}

export async function migrateEmbeddedSensitiveState(profile: VibeProfile): Promise<VibeProfile> {
  const sanitized = stripSensitiveProfileState(profile);
  const embeddedSecrets = extractProviderSecrets(profile);
  const hasEmbeddedSecrets = Boolean(embeddedSecrets.tmdb.token || embeddedSecrets.watchmode.apiKey);
  const hasProfileChanges = hashText(JSON.stringify(profile)) !== hashText(JSON.stringify(sanitized));

  if (hasEmbeddedSecrets) {
    const existingSecrets = await loadProviderSecrets();
    await saveProviderSecrets({
      tmdb: {
        token: embeddedSecrets.tmdb.token ?? existingSecrets.tmdb.token,
      },
      watchmode: {
        apiKey: embeddedSecrets.watchmode.apiKey ?? existingSecrets.watchmode.apiKey,
      },
    });
  }

  if (hasProfileChanges) {
    await writeJsonFile(PROFILE_PATH, sanitized);
  }

  return sanitized;
}
