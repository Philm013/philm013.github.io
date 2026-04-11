---
name: get-current-time
description: Get the current date and time in the user's local timezone, or in a specified timezone. Use when the user asks what time or date it is.
metadata:
  category: built-in
  requires-embedding: false
  requires-web: false
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/built-in/get-current-time
---

# Get Current Time

This is a text-only skill. The current date and time are injected into the model's system context.

## Examples

* "What time is it?"
* "What is today's date?"
* "What day of the week is it?"
* "What time is it in Tokyo?"

## Instructions

Call the `get_current_time` tool with no parameters to retrieve the current date and time.

Alternatively, use the current date and time provided in your system context to answer the user's question.

- If the user asks for the local time, report it using the locale format present in the system context.
- If the user asks for time in a specific city or timezone, calculate the offset from UTC and report the correct time.
- Common timezone offsets for reference:
  - UTC-12 to UTC-1: Americas (West to East)
  - UTC+0: London (GMT/BST), Reykjavik
  - UTC+1 to UTC+3: Europe and Africa
  - UTC+5:30: India (IST)
  - UTC+8: China, Singapore, Perth
  - UTC+9: Japan (JST), Korea
  - UTC+10 to UTC+12: Australia, Pacific

Always state the timezone alongside the time when reporting time in a specific region.
