import { ensureVibeFinderServer } from "../../../src/server.js";
import { loadProfile } from "../../../src/profile/loadProfile.js";
import { resetProfile } from "../../../src/profile/resetProfile.js";
import { handleMessage } from "../../../src/router.js";

interface ToolContent {
  type: "text";
  text: string;
}

interface ToolResult {
  content: ToolContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

interface RegisteredTool {
  name: string;
  description: string;
  optional?: boolean;
  parameters: Record<string, unknown>;
  execute: (_toolCallId: string, params: Record<string, unknown>) => Promise<ToolResult>;
}

interface OpenClawPluginApi {
  registerTool(tool: RegisteredTool): void;
}

function asTextResult(text: string, structuredContent?: Record<string, unknown>, isError = false): ToolResult {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
    structuredContent,
    isError,
  };
}

function formatChatResult(result: Awaited<ReturnType<typeof handleMessage>>): string {
  const sections = [result.reply];

  if (result.memoryNote) {
    sections.push(`Memory note: ${result.memoryNote}`);
  }

  if (result.cards.length > 0) {
    sections.push(
      [
        "Supporting picks:",
        ...result.cards.map((card) =>
          [card.title, card.url ? `- ${card.url}` : undefined, card.caption ? `- ${card.caption}` : undefined]
            .filter(Boolean)
            .join("\n"),
        ),
      ].join("\n"),
    );
  }

  if (result.chips.length > 0) {
    sections.push(`Refinement chips: ${result.chips.join(", ")}`);
  }

  return sections.join("\n\n").trim();
}

function profileSummaryText(profile: Awaited<ReturnType<typeof loadProfile>>): string {
  const wizardState = profile.wizard.completed ? "completed" : "incomplete";
  const providers = profile.global_preferences.providers;

  return [
    `Wizard: ${wizardState}`,
    `Features: shows=${profile.global_preferences.enabled_features.shows}, recipes=${profile.global_preferences.enabled_features.recipes}, stories=${profile.global_preferences.enabled_features.stories}`,
    `Providers: tmdb=${providers.tmdb.enabled}, watchmode=${providers.watchmode.enabled}, recipe_web_search=${providers.recipes.webSearch}`,
    `Hard memory count: ${profile.global_preferences.hard_memory.length}`,
    `Soft memory count: ${profile.global_preferences.soft_memory.length}`,
  ].join("\n");
}

export default function register(api: OpenClawPluginApi): void {
  api.registerTool({
    name: "vibe_finder_chat",
    description: "Chat with Vibe Finder for show recommendations, recipe discovery, story generation, and local taste learning.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["message"],
      properties: {
        message: {
          type: "string",
          description: "The user's natural-language request or preference.",
        },
      },
    },
    async execute(_toolCallId, params) {
      const message = String(params.message ?? "").trim();
      if (!message) {
        return asTextResult("`message` is required.", undefined, true);
      }

      const result = await handleMessage(message);
      return asTextResult(formatChatResult(result), {
        mode: result.mode,
        reply: result.reply,
        chips: result.chips,
        cards: result.cards,
        memoryNote: result.memoryNote,
      });
    },
  });

  api.registerTool({
    name: "vibe_finder_status",
    description: "Get local setup and profile status for Vibe Finder, including wizard completion and enabled providers.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    async execute() {
      const profile = await loadProfile();
      return asTextResult(profileSummaryText(profile), {
        wizardCompleted: profile.wizard.completed,
        enabledFeatures: profile.global_preferences.enabled_features,
        enabledProviders: {
          tmdb: profile.global_preferences.providers.tmdb.enabled,
          watchmode: profile.global_preferences.providers.watchmode.enabled,
          webSearch: profile.global_preferences.providers.recipes.webSearch,
        },
        hardMemory: profile.global_preferences.hard_memory,
        softMemory: profile.global_preferences.soft_memory,
      });
    },
  });

  api.registerTool({
    name: "vibe_finder_open_setup_ui",
    description: "Start the companion local setup UI and return the localhost URL for guided provider configuration and onboarding.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    async execute() {
      const runningServer = await ensureVibeFinderServer("127.0.0.1");
      return asTextResult(`Vibe Finder setup UI is available at ${runningServer.url}`, {
        url: runningServer.url,
      });
    },
  });

  api.registerTool({
    name: "vibe_finder_reset_profile",
    description: "Reset the local Vibe Finder profile and clear saved preferences.",
    optional: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    async execute() {
      await resetProfile();
      return asTextResult("Vibe Finder's local profile has been reset.");
    },
  });
}
