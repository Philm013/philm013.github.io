---
name: list-memories
description: List all memories and notes stored by the user. Shows total count by category and the most recent entries. Use when the user asks to see, review, or browse their saved memories.
metadata:
  category: built-in
  requires-embedding: false
  requires-web: false
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/built-in/list-memories
---

# List Memories

This skill retrieves and displays all memories stored by the user.

## Examples

* "Show me my memories"
* "What have I stored?"
* "List everything you remember about me"
* "How many notes do I have saved?"
* "What's in my memory bank?"

## Instructions

Call the `run_js` tool with the `search-memory` skill's `index.html` script using an empty or broad query to retrieve all stored memories:
- script name: `../search-memory/scripts/index.html`
- data: A JSON string with:
  - query: `""`  (empty string to list all)
  - limit: 50

After receiving the result, present the memories in a clear, organized format:
1. Group memories by category (e.g., "fact", "preference", "document").
2. Show each memory's text and when it was stored.
3. Report the total count at the top (e.g., "You have 12 stored memories").
4. If no memories exist, tell the user their memory bank is empty and offer to help them store something.

### Rules
- Present memories in a readable list format, not raw JSON.
- If there are many memories, summarize by category first, then show individual items.
