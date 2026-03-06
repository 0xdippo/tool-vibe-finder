---
name: vibe-finder
description: Local-first taste assistant starter tool with a web chat UI for shows, recipes, and stories. Use this when the user wants a single-process local demo with persistent JSON preference memory and optional TMDB or Watchmode setup.
---

# Vibe Finder

This skill starter runs as a local Node app with:

- a chat UI on `http://localhost:3434`
- one-question-at-a-time setup wizard
- persistent memory in `data/vibe-profile.json`
- optional TMDB and Watchmode providers
- web fallback for shows and recipes
- story generation through an OpenAI-compatible or Ollama-style model setup when available

## Run

```bash
npm install
npm run dev
```

## Demo prompts

- `I like Gilmore Girls and Virgin River`
- `Write a cozy romantic story`
- `I have chicken, rice, and broccoli`

## Local files

- `data/vibe-profile.json`
- `data/recommendation-log.jsonl`
- `data/story-log.jsonl`
- `data/feedback-log.jsonl`
