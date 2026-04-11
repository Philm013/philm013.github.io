---
name: restaurant-roulette
description: ONLY for random restaurant selection via an interactive spin-the-wheel game. NOT for listing, recommending, or searching restaurants.
metadata:
  require-secret: true
  require-secret-description: you can get api key from https://ai.google.dev/gemini-api/docs/api-key
  homepage: https://github.com/google-ai-edge/gallery/tree/main/skills/featured/restaurant-roulette
---

# Restaurant Roulette

This skill shows an interactive roulette spin-wheel to randomly pick one restaurant from up to 10 options matching a cuisine and location.

## When to Use

ONLY use this tool when the user explicitly wants a **random selection** or **roulette/spin-wheel game** for picking a restaurant. Trigger phrases include:
* "Spin a wheel for restaurants in..."
* "Pick a random restaurant in..."
* "Show a restaurant roulette for..."
* "Suggest Mexican food in San Jose." (implies wanting a random pick)
* "Where should I eat today?" (implies wanting a random decision)

## When NOT to Use

Do NOT use this tool when the user wants to:
* **List** or **show all** restaurants in a location (e.g., "Show me all restaurants in Saint Augustine")
* **Search** for specific restaurants (e.g., "Find the best Italian restaurant in Miami")
* **Get information** about a specific restaurant (e.g., "What are the hours for Joe's Crab Shack?")
* **Get recommendations** with details (e.g., "What are good restaurants near downtown?")

For these queries, answer directly from your knowledge or use the `web_search` tool if available.

## Examples

* "Suggest Mexican food in San Jose."
* "Find a random Italian restaurant near Sunnyvale."
* "Where should I get Sushi in San Francisco today?"
* "Show a restaurant roulette for Indian food in Palo Alto."

## Instructions

Call the `restaurant_roulette` tool with the following parameters:
- `location`: String. **Required.** The target city or location (e.g., "San Jose", "Sunnyvale", "San Francisco"). You MUST extract this from the user's message. Do NOT call this tool if no location can be determined — ask the user for a location first.
- `cuisine`: String. **Optional.** The style of food or cuisine desired (e.g., "Mexican", "Italian", "Indian", "Sushi").

IMPORTANT: When the wheel is generated, DO NOT pick a winner for the user or make up a restaurant. Simply return the requested webview and tell the user to tap the preview card to spin the wheel themselves.