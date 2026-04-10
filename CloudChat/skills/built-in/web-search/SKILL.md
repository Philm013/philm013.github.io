---
name: web-search
description: Search the web for current information, news, facts, and data. Use when the user needs up-to-date information or asks about recent events that may not be in the model's training data.
metadata:
  category: built-in
  requires-embedding: false
  requires-web: true
  requires-secret: true
  require-secret-description: "Enter your search API key. Supported providers: Brave Search (https://brave.com/search/api/), Tavily (https://tavily.com), or a SearXNG instance URL."
  homepage: https://philm013.github.io/CloudChat/skills/built-in/web-search
---

# Web Search

This skill searches the web using Brave Search, Tavily, or a self-hosted SearXNG instance.

## Examples

* "Search for the latest news about AI"
* "What's the current price of Bitcoin?"
* "Find recent research on climate change 2025"
* "Look up the population of Tokyo"

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: `index.html`
- data: A JSON string with the following fields:
  - query: String. **Required.** The search query (3–8 focused keywords work best).
  - provider: String. **Optional.** One of `"brave"`, `"tavily"`, or `"searxng"`. Defaults to `"brave"`.
  - searxngUrl: String. **Conditional.** Required only when provider is `"searxng"`. The base URL of the SearXNG instance.

The secret passed to this skill is the API key for Brave or Tavily (not needed for SearXNG).

### Rules
- Formulate a concise, keyword-focused query — avoid full sentences.
- After receiving results, synthesize the information into a clear answer rather than dumping raw search results.
- Cite the sources (URLs) at the end of your response.
- If results are empty or an error occurs, inform the user and suggest alternative queries.
