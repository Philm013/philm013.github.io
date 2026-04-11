---
name: delete-memory
description: Delete stored memories matching a keyword query. Use when the user wants to forget or remove something that was previously stored.
metadata:
  category: built-in
  requires-embedding: false
  requires-web: false
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/built-in/delete-memory
---

# Delete Memory

This skill removes stored memories that match the given search query.

## Examples

* "Forget what I told you about my old job"
* "Delete the note about my sister's birthday"
* "Remove all memories about my diet preferences"
* "Clear everything you know about my project"
* "Wipe all my stored memories"

## Instructions

Call the `delete_memory` tool with the following parameter:
- `query`: String. **Required.** Keywords identifying which memories to delete. Pass `"*"` to wipe ALL memories.

### Rules
- Before deleting, identify from the user's message what they want removed.
- If the user asks to delete ALL memories, pass `query: "*"`.
- After deletion, confirm how many memories were removed.
- If 0 memories matched, inform the user nothing was found to delete.
- Be cautious: deletions are permanent and cannot be undone.
