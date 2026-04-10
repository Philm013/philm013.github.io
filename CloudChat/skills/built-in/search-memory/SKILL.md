---
name: search-memory
description: Search through stored memories and notes using a keyword query. Use when the user asks to recall, find, or retrieve something that may have been stored previously.
metadata:
  category: built-in
  requires-embedding: false
  requires-web: false
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/built-in/search-memory
---

# Search Memory

This skill searches through locally stored memories using keyword matching.

## Examples

* "Do you remember my sister's birthday?"
* "What do you know about my food allergies?"
* "Recall what I told you about my project"
* "Find everything about my preferences"
* "What did I store about Python?"

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: `index.html`
- data: A JSON string with the following fields:
  - query: String. **Required.** Keywords to search for in stored memories.
  - limit: Number. **Optional.** Maximum number of results to return (default: 5, max: 20).
  - category: String. **Optional.** Filter by category (e.g., `"preference"`, `"fact"`, `"event"`).

### Rules
- Extract the key search terms from the user's question and pass them as the query.
- If no results are found, inform the user that nothing matching that query is stored.
- Present results clearly, showing the stored content and its category.
- If results are found, integrate them naturally into your response rather than just dumping the raw data.
