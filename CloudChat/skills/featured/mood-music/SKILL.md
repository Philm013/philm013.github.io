---
name: mood-music
description: A skill to suggest or play music based on the user's mood, including analyzing images or audio, by querying available genres and generating music via the Loudly API.
metadata:
  require-secret: true
  require-secret-description: you can get api key from https://www.loudly.com/developers/apps after registering an account
  homepage: https://github.com/google-ai-edge/gallery/tree/main/skills/featured/mood-music
---

# Mood Music

## Instructions

Call the `mood_music` tool with the following parameters:
- `mood`: String. **Required.** The mood or vibe to generate music for (e.g., "relaxed", "energetic", "melancholic").
- `genre`: String. **Optional.** A preferred music genre (e.g., "lo-fi", "jazz", "electronic").

### Invocation Triggers
You should invoke this skill when the user:
- Asks for music for a specific mood.
- Asks for playlist ideas for a vibe.
- Uploads an image or audio clip and asks for music to match it.
