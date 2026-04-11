---
name: fetch-page
description: Fetch and extract the readable text content from a URL. Use when the user provides a link and asks to read, summarize, or analyze it.
metadata:
  category: built-in
  requires-embedding: false
  requires-web: true
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/built-in/fetch-page
---

# Fetch Page

This skill retrieves and extracts the readable text from a web page URL.

## Examples

* "Summarize this article: https://example.com/article"
* "What does this page say? [URL]"
* "Read this link for me: https://..."
* "Extract the main content from https://..."

## Instructions

Call the `fetch_page` tool with the following parameter:
- `url`: String. **Required.** The full URL to fetch (must start with `https://` or `http://`).

### Rules
- Only pass URLs that the user explicitly provides — never fabricate URLs.
- After receiving the extracted text, provide the user with a clear summary or answer based on the content.
- If the page cannot be fetched, inform the user and suggest they copy-paste the content manually.
- The returned content is truncated to ~3500 characters for context efficiency.
