import { readJsonFile } from "./files.js";
import { SKILL_CONFIG_PATH } from "./paths.js";
import type { AppConfig } from "../types.js";

const defaultConfig: AppConfig = {
  name: "vibe-finder",
  displayName: "Vibe Finder",
  description: "Local-first taste assistant with a web chat UI.",
  version: "0.1.0",
  port: 3434,
  ui: {
    path: "src/ui/web-chat",
    entry: "index.html",
  },
  storage: {
    profile: "data/vibe-profile.json",
    recommendations: "data/recommendation-log.jsonl",
    stories: "data/story-log.jsonl",
    feedback: "data/feedback-log.jsonl",
  },
  features: ["shows", "recipes", "stories"],
  providers: {
    shows: ["tmdb", "watchmode", "webFallback"],
    recipes: ["webSearch"],
  },
};

export async function loadAppConfig(): Promise<AppConfig> {
  return readJsonFile<AppConfig>(SKILL_CONFIG_PATH, defaultConfig);
}
