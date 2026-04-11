---
name: set-reminder
description: Set a timed reminder that shows a browser notification after a specified delay. Use when the user asks to be reminded about something in N minutes or at a specific time.
metadata:
  category: built-in
  requires-embedding: false
  requires-web: false
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/built-in/set-reminder
---

# Set Reminder

This skill schedules a browser notification reminder after a specified number of minutes.

## Examples

* "Remind me to take my medication in 30 minutes"
* "Set a reminder: stand up and stretch in 45 minutes"
* "Alert me about the meeting in 10 minutes"
* "Ping me in 1 hour to check the oven"

## Instructions

Call the `set_reminder` tool with the following parameters:
- `message`: String. **Required.** The reminder text to display in the notification.
- `delayMinutes`: Number. **Required.** How many minutes from now until the notification fires.

### Rules
- Convert relative time expressions to minutes:
  - "in 30 minutes" → `delayMinutes: 30`
  - "in 1 hour" → `delayMinutes: 60`
  - "in 1.5 hours" → `delayMinutes: 90`
- Keep the message concise (under 100 characters).
- After setting the reminder, confirm to the user: the message and when it will fire.
- Warn the user that the page must remain open for the notification to appear.
- Note: The browser may ask for notification permission the first time.
