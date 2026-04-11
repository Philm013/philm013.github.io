---
name: store-memory
description: Save a fact, preference, or piece of information to persistent local memory. Use when the user wants to remember something for later or asks you to note/remember something.
metadata:
  category: built-in
  requires-embedding: false
  requires-web: false
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/built-in/store-memory
---

# Store Memory

This skill saves information to persistent local storage so it can be retrieved in future sessions.

## Examples

* "Remember that I prefer dark mode"
* "Note that my sister's birthday is June 12"
* "Store this for later: I'm allergic to peanuts"
* "Keep in mind I like concise answers"

## Instructions

Call the `store_memory` tool with the following parameters:
- `content`: String. **Required.** The text to store (the fact, preference, or note).
- `category`: String. **Optional.** Category tag for the memory. Use one of:
  - `"fact"` — general facts about the world or topics
  - `"preference"` — user preferences and settings
  - `"person"` — information about a person
  - `"event"` — calendar events, birthdays, deadlines
  - `"note"` — general notes and reminders
  - `"document"` — content extracted from documents
  - Defaults to `"fact"` if not provided.

### Rules
- Extract the exact information to store from the user's message — do not store the whole message verbatim if it contains conversational filler.
- Confirm to the user what was stored and under which category.
- If the user says "remember that I prefer X", store: `"User prefers X"` with category `"preference"`.
