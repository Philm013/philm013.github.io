---
name: mood-tracker
description: A simple mood tracking skill that stores your daily mood and comments. Use this when the user wants to log their mood, track how they feel, or see their mood history.
---

# Mood Tracker

## Instructions

The `mood-tracker` skill helps you keep track of your daily emotional well-being.

Call the `mood_tracker` tool with the following parameters:
- `action`: String. **Required.** One of:
  - `"log"` — Log a mood entry.
  - `"history"` — Retrieve mood history.
- `score`: Number. **Optional.** Mood score from 1 to 10 (used with `"log"` action).
- `comment`: String. **Optional.** A short comment about how you're feeling (used with `"log"` action).

### Sample Commands

- **Logging Mood:**
  - "Log my mood as 8 today, feeling great!"
  - "I'm feeling like a 5 today, a bit tired."
  - "Record a mood of 9 for me."

- **Viewing History:**
  - "Show me my mood history."
  - "How have I been feeling lately?"
  - "Open the mood dashboard."

- **Analyzing Trends:**
  - "Analyze my mood for the last 30 days — are there any patterns?"
  - "Am I generally feeling better or worse over time?"

### Rules
- **Privacy**: All data is stored locally on your device.
- **No Entry**: If no mood entry exists for a specific date requested, explicitly inform the user that no entry was found for that date.
- **Updates**: Logging a mood for a date that already has an entry will update that entry.
- **Dashboard**: The dashboard is only shown when you explicitly ask to see your history or the dashboard itself.
