---
name: vibe-finder
description: Use this for show discovery, recipe discovery, or short story generation that should learn the user's taste over time. It stores preferences locally and can open a companion setup UI for provider configuration.
---

# Vibe Finder

Use the `vibe_finder_chat` tool when the user wants:

- show recommendations
- recipe ideas or recipe discovery
- short original stories
- preference capture like `No mushrooms ever` or `Less teen`

Use `vibe_finder_status` first when you need to know whether setup is complete or which providers are enabled.

Use `vibe_finder_open_setup_ui` when:

- the user wants to configure TMDB or Watchmode
- the user wants the guided setup wizard
- you need to point them at the local setup interface

Use `vibe_finder_reset_profile` only when the user explicitly asks to reset or forget everything.

The tool is local-first:

- preferences are stored locally
- provider keys stay local
- if providers are not configured, the tool falls back to web search

Example prompts:

- `Find me a show tonight`
- `I like Gilmore Girls and Virgin River`
- `I have chicken, rice, and broccoli`
- `Write a cozy romantic story`
- `No mushrooms ever`
