import { ensureVibeFinderServer } from "./server.js";

async function start(): Promise<void> {
  const runningServer = await ensureVibeFinderServer("127.0.0.1");
  console.log(`Vibe Finder running at ${runningServer.url}`);
}

start().catch((error) => {
  console.error("Failed to start Vibe Finder", error);
  process.exitCode = 1;
});
