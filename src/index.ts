import express from "express";
import path from "node:path";
import { loadAppConfig } from "./lib/config.js";
import { resolveLlmConfig } from "./lib/llm.js";
import { UI_DIR } from "./lib/paths.js";
import { handleMessage } from "./router.js";
import { ensureDataFiles, loadProfile } from "./profile/loadProfile.js";
import { resetProfile } from "./profile/resetProfile.js";
import { saveProfile } from "./profile/saveProfile.js";
import { applyWizardAnswer, getWizardState } from "./wizard/runSetupWizard.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/bootstrap", async (_request, response) => {
  const [config, profile, llmConfig] = await Promise.all([loadAppConfig(), loadProfile(), resolveLlmConfig()]);
  const wizard = getWizardState(profile);

  response.json({
    app: config,
    examplePrompts: [
      "I like Gilmore Girls and Virgin River",
      "Write a cozy romantic story",
      "I have chicken, rice, and broccoli",
    ],
    llmConfigured: Boolean(llmConfig),
    wizard,
    profileSummary: {
      hardMemory: profile.global_preferences.hard_memory,
      softMemory: profile.global_preferences.soft_memory,
      providers: {
        tmdb: profile.global_preferences.providers.tmdb.enabled,
        watchmode: profile.global_preferences.providers.watchmode.enabled,
        webSearch: profile.global_preferences.providers.recipes.webSearch,
      },
      feedbackMode: profile.global_preferences.feedback_mode,
    },
    about: {
      title: "About / Credits",
      body: "Vibe Finder is a local-first starter tool for learning taste and recommending shows, recipes, and stories.",
      tmdbAttribution: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
    },
  });
});

app.post("/api/chat", async (request, response) => {
  const message = String(request.body?.message ?? "").trim();
  const result = await handleMessage(message);
  response.json(result);
});

app.post("/api/setup/answer", async (request, response) => {
  const profile = await loadProfile();
  const result = await applyWizardAnswer(profile, request.body ?? {});
  await saveProfile(result.profile);
  response.json({
    completed: result.completed,
    step: result.step,
    message: result.message,
    error: result.error,
  });
});

app.post("/api/profile/reset", async (_request, response) => {
  const profile = await resetProfile();
  response.json({
    ok: true,
    wizard: getWizardState(profile),
  });
});

app.use(express.static(UI_DIR));

app.get("*", (_request, response) => {
  response.sendFile(path.join(UI_DIR, "index.html"));
});

async function start(): Promise<void> {
  await ensureDataFiles();
  const config = await loadAppConfig();
  app.listen(config.port, "127.0.0.1", () => {
    console.log(`Vibe Finder running at http://127.0.0.1:${config.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start Vibe Finder", error);
  process.exitCode = 1;
});
