import type { VibeProfile } from "../types.js";

export function buildStorySystemPrompt(): string {
  return [
    "You write polished short fiction for a local taste assistant.",
    "Output plain text with this structure:",
    "Title: <title>",
    "",
    "<story body>",
    "",
    "Keep it original, coherent, emotionally warm, and suitable for a general audience unless the user explicitly asks otherwise.",
    "Aim for the requested length without padding.",
  ].join("\n");
}

export function buildStoryUserPrompt(message: string, profile: VibeProfile): string {
  return [
    `User request: ${message}`,
    `Preferred tones: ${profile.stories.tone.join(", ") || "warm, calm, lightly personal, not cutesy"}`,
    `Preferred story length: about ${profile.stories.target_words} words`,
    `Story likes: ${profile.stories.likes.join(", ") || "none recorded"}`,
    `Story dislikes: ${profile.stories.dislikes.join(", ") || "none recorded"}`,
    `Global soft memory: ${profile.global_preferences.soft_memory.join(", ") || "none recorded"}`,
    "Write one complete story only.",
  ].join("\n");
}
