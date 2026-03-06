import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(currentDir, "../..");
export const SRC_DIR = path.join(ROOT_DIR, "src");
export const UI_DIR = path.join(SRC_DIR, "ui", "web-chat");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const CONFIG_DIR = path.join(ROOT_DIR, "config");
export const APP_CONFIG_PATH = path.join(ROOT_DIR, "app.json");
export const PROFILE_PATH = path.join(DATA_DIR, "vibe-profile.json");
export const PROVIDER_SECRETS_PATH = path.join(DATA_DIR, "provider-secrets.json");
export const RECOMMENDATION_LOG_PATH = path.join(DATA_DIR, "recommendation-log.jsonl");
export const STORY_LOG_PATH = path.join(DATA_DIR, "story-log.jsonl");
export const FEEDBACK_LOG_PATH = path.join(DATA_DIR, "feedback-log.jsonl");
