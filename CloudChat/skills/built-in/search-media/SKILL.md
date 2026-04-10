---
name: search-media
description: Search for images and videos using Unsplash and Pexels. Use when the user asks for photos, pictures, images, videos, wallpapers, or visual content on any topic.
metadata:
  category: built-in
  requires-embedding: false
  requires-web: true
  requires-secret: true
  requires-secret-description: "Enter your Unsplash Access Key or Pexels API key. Get keys at https://unsplash.com/developers or https://www.pexels.com/api/"
  homepage: https://philm013.github.io/CloudChat/skills/built-in/search-media
---

# Search Media

This skill searches for images and videos using the Unsplash and Pexels APIs.

## Examples

* "Find me some pictures of mountains"
* "Search for videos of ocean waves"
* "Show me photos of golden retrievers"
* "Find nature wallpapers"
* "Search for cooking videos"

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: `index.html`
- data: A JSON string with the following fields:
  - query: String. **Required.** The search query describing the desired images or videos.
  - provider: String. **Optional.** One of `"unsplash"` or `"pexels"`. Defaults to whichever has a configured API key.
  - type: String. **Optional.** One of `"image"` or `"video"`. Defaults to `"image"`. Note: Unsplash only supports images. Video searches automatically use Pexels.
  - count: Number. **Optional.** Number of results to return (1-10). Defaults to 4.
  - orientation: String. **Optional.** One of `"landscape"`, `"portrait"`, or `"squarish"`. Defaults to unfiltered.

The secret passed to this skill is a JSON string with `unsplashKey` and/or `pexelsKey` fields.

### Rules
- Formulate a concise, descriptive query — use specific keywords for better results.
- After receiving results, present images in a visually appealing way with attribution.
- Always credit the photographer and link back to the source (required by Unsplash and Pexels terms).
- If results are empty, suggest alternative search terms.
- For video requests, use Pexels as the provider (Unsplash does not support video).
