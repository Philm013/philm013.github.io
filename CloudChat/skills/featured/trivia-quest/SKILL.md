---
name: trivia-quest
description: Fetch a trivia question from the Open Trivia Database. Returns a question, multiple choice answers, and the correct answer. No API key required.
---

# Trivia Challenge

## Instructions

Call the `trivia_question` tool with the following parameters:
- `category`: Number (optional). Category ID from Open Trivia DB (e.g. 9=General, 17=Science, 21=Sports, 23=History, 27=Animals). Omit for random category.
- `difficulty`: String (optional). One of: "easy", "medium", "hard". Omit for any difficulty.
