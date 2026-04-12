---
name: trivia-quest
description: Start an interactive trivia session from the Open Trivia Database. Renders a gamified quiz widget with score tracking, live reactions, streak counters, and celebratory effects. No API key required.
---

# Trivia Quest

## Instructions

Call the `trivia_question` tool with the following parameters:
- `category`: Number (optional). Category ID from Open Trivia DB (e.g. 9=General, 17=Science, 21=Sports, 23=History, 27=Animals). Omit for random category.
- `difficulty`: String (optional). One of: "easy", "medium", "hard". Omit for any difficulty.
- `amount`: Number (optional). Number of questions (1-15). Default is 5.

The tool renders an interactive trivia widget directly in the chat. Users click answer buttons to play. The widget includes:
- Progress bar and score tracking
- Streak counter for consecutive correct answers
- Live reaction messages after each answer
- Confetti celebration effects for correct answers
- Final scoreboard with accuracy stats and replay option
