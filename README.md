# Vibe Finder

Vibe Finder is a local-first starter tool with a web chat UI for:

- discovering shows
- finding recipes
- generating short stories

It runs in one local Node process, stores preference memory in JSON files, and supports optional TMDB and Watchmode provider setup through a linear first-run wizard. When providers are not configured, it falls back to lightweight web search.

## What it includes

- messaging-style local web UI
- one-question-at-a-time setup wizard
- persistent taste memory in `data/vibe-profile.json`
- optional TMDB and Watchmode integration
- web fallback for shows and recipes
- story generation through an OpenAI-compatible or Ollama-style model config, with a local story fallback if no LLM is available
- redacted JSONL logs for recommendations, feedback, and stories

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the local app:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3434](http://localhost:3434)

4. Run the setup wizard. You can skip any provider step.

## Optional provider setup

### TMDB

- Enable TMDB in the wizard.
- Paste a TMDB read access token.
- The wizard validates the token against the TMDB API.

Required attribution:

> This product uses the TMDB API but is not endorsed or certified by TMDB.

### Watchmode

- Enable Watchmode in the wizard.
- Paste a Watchmode API key.
- The wizard validates the key against the Watchmode API.

### Stories / LLM

The app tries these sources in order:

1. `VIBE_FINDER_LLM_MODEL` + `VIBE_FINDER_LLM_BASE_URL`
2. `OPENAI_MODEL` + `OPENAI_BASE_URL` / `OPENAI_API_KEY`
3. `OLLAMA_MODEL` + optional `OLLAMA_HOST`
4. a best-effort parse of `~/.openclaw/config.json`

Examples:

```bash
export OPENAI_MODEL=gpt-4.1-mini
export OPENAI_BASE_URL=https://api.openai.com/v1
export OPENAI_API_KEY=...
```

Or:

```bash
export OLLAMA_MODEL=llama3.2
export OLLAMA_HOST=http://127.0.0.1:11434
```

If no compatible LLM is configured, story mode still works with a clearly labeled local fallback story.

## Project layout

```text
vibe-finder/
  skill.json
  README.md
  src/
    index.ts
    router.ts
    profile/
    intents/
    modes/
    providers/
    ranking/
    prompts/
    wizard/
    ui/web-chat/
  data/
  config/
```

## Storage

These files are created locally on first run and are gitignored:

- `data/vibe-profile.json`: persistent taste profile without provider secrets
- `data/provider-secrets.json`: local-only TMDB and Watchmode credentials
- `data/recommendation-log.jsonl`: redacted recommendation events
- `data/story-log.jsonl`: redacted story events
- `data/feedback-log.jsonl`: redacted feedback events

## Scripts

- `npm run dev`: run the local server with hot reload
- `npm run build`: compile TypeScript to `dist/`
- `npm run check`: run a TypeScript-only check
- `npm run start`: run the compiled server

## Notes

- No auth, accounts, cloud sync, analytics, or databases are included.
- The server binds to `127.0.0.1` only.
- The app serves static UI files from `src/ui/web-chat`.
- Web fallback uses lightweight search-result inspection only. It does not scrape full recipe pages.
