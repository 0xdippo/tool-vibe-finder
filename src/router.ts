import { appendJsonLine } from "./lib/files.js";
import { FEEDBACK_LOG_PATH, RECOMMENDATION_LOG_PATH, STORY_LOG_PATH } from "./lib/paths.js";
import { extractStoryTitle, redactText, summarizeText } from "./lib/privacy.js";
import { classifyIntent } from "./intents/classifyIntent.js";
import { runRecipesMode } from "./modes/recipes.js";
import { runShowsMode } from "./modes/shows.js";
import { runStoriesMode } from "./modes/stories.js";
import { loadProfile } from "./profile/loadProfile.js";
import { resetProfile } from "./profile/resetProfile.js";
import { saveProfile } from "./profile/saveProfile.js";
import { updateProfile } from "./profile/updateProfile.js";
import type { ChatResponse, DomainMode } from "./types.js";

function capabilityReply(): ChatResponse {
  return {
    mode: "system",
    reply: [
      "I handle three things locally:",
      "- show recommendations",
      "- recipe discovery",
      "- short stories",
      "",
      "Try prompts like:",
      "Find me a show tonight",
      "I have chicken, rice, and broccoli",
      "Write a cozy romantic story",
    ].join("\n"),
    chips: ["Find me a show tonight", "I have chicken and rice", "Write a cozy romantic story"],
    cards: [],
  };
}

async function rerunLastMode(message: string, mode: DomainMode, profile: Awaited<ReturnType<typeof loadProfile>>): Promise<ChatResponse> {
  switch (mode) {
    case "shows":
      return runShowsMode(message || profile.session_context.last_query || "Find me a show tonight", profile);
    case "recipes":
      return runRecipesMode(message || profile.session_context.last_query || "I have chicken and rice", profile);
    case "stories":
      return runStoriesMode(message || profile.session_context.last_query || "Write a cozy romantic story", profile);
  }
}

function attachMemoryNote(response: ChatResponse, memoryNote?: string): ChatResponse {
  if (!memoryNote) {
    return response;
  }

  return {
    ...response,
    memoryNote,
  };
}

async function logDomainResponse(message: string, response: ChatResponse): Promise<void> {
  const inputSummary = summarizeText(message);
  const replySummary = summarizeText(response.reply);
  const payload = {
    createdAt: new Date().toISOString(),
    mode: response.mode,
    input: inputSummary,
    output: replySummary,
    titles: response.cards.map((card) => card.title),
  };

  if (response.mode === "stories") {
    await appendJsonLine(STORY_LOG_PATH, {
      ...payload,
      storyTitle: extractStoryTitle(response.reply) ?? "Untitled",
    });
    return;
  }

  if (response.mode === "shows" || response.mode === "recipes") {
    await appendJsonLine(RECOMMENDATION_LOG_PATH, payload);
  }
}

export async function handleMessage(message: string): Promise<ChatResponse> {
  const profile = await loadProfile();
  const intent = await classifyIntent(message, profile.session_context.last_mode);

  if (intent.intent === "reset_profile") {
    await resetProfile();
    return {
      mode: "system",
      reply: "Your vibe profile has been reset locally. Setup will run again on the next refresh.",
      chips: ["I like Gilmore Girls and Virgin River", "Write a cozy romantic story", "I have chicken, rice, and broccoli"],
      cards: [],
    };
  }

  if (
    intent.intent === "preference_input" ||
    intent.intent === "feedback_positive" ||
    intent.intent === "feedback_negative" ||
    intent.intent === "feedback_refinement"
  ) {
    const update = await updateProfile(profile, message, intent);

    if (intent.intent.startsWith("feedback_")) {
      profile.feedback_history.push({
        createdAt: new Date().toISOString(),
        mode: update.mode ?? profile.session_context.last_mode ?? "shows",
        feedback: redactText(message),
        sentiment:
          intent.intent === "feedback_positive"
            ? "positive"
            : intent.intent === "feedback_negative"
              ? "negative"
              : "refine",
      });

      await appendJsonLine(FEEDBACK_LOG_PATH, {
        createdAt: new Date().toISOString(),
        intent: intent.intent,
        feedback: summarizeText(message),
        mode: update.mode ?? profile.session_context.last_mode ?? null,
      });
    }

    let response: ChatResponse;
    const shouldRefresh =
      intent.intent === "feedback_refinement" ||
      (intent.intent === "feedback_negative" && Boolean(profile.session_context.last_mode));
    const shouldRecommendFromPreference =
      intent.intent === "preference_input" &&
      update.mode === "shows" &&
      /i\s+(?:like|love|enjoy|prefer)/i.test(message);

    if (shouldRefresh && profile.session_context.last_mode) {
      response = await rerunLastMode(profile.session_context.last_query ?? message, profile.session_context.last_mode, profile);
    } else if (shouldRecommendFromPreference) {
      response = await runShowsMode(message, profile);
    } else {
      response = {
        mode: "system",
        reply: update.memoryNote ?? "Saved that preference locally.",
        chips:
          update.mode === "recipes"
            ? ["I have chicken and rice", "healthier", "comfort food"]
            : update.mode === "stories"
              ? ["Write a cozy romantic story", "shorter", "another one"]
              : ["Find me a show tonight", "more romantic", "less teen"],
        cards: [],
      };
    }

    if (response.mode === "shows" || response.mode === "recipes" || response.mode === "stories") {
      profile.session_context.last_mode = response.mode;
      profile.session_context.last_query = message;
      profile.session_context.last_recommendations = response.cards.map((card) => card.title);
      await logDomainResponse(message, response);
    }

    await saveProfile(profile);
    return attachMemoryNote(response, update.memoryNote);
  }

  let response: ChatResponse;

  switch (intent.intent) {
    case "show_recommendation":
      response = await runShowsMode(intent.query, profile);
      break;
    case "recipe_recommendation":
    case "ingredient_recipe":
      response = await runRecipesMode(intent.query, profile);
      break;
    case "story_generation":
      response = await runStoriesMode(intent.query, profile);
      break;
    default:
      response = capabilityReply();
      break;
  }

  if (response.mode === "shows" || response.mode === "recipes" || response.mode === "stories") {
    profile.session_context.last_mode = response.mode;
    profile.session_context.last_query = message;
    profile.session_context.last_recommendations = response.cards.map((card) => card.title);
    await saveProfile(profile);
    await logDomainResponse(message, response);
  }

  return response;
}
