# Refactoring Touch Handling and Gemini Models

## Objective
1. Fix the conflict between tapping (auto-detect) and dragging (manual draw) in the Canvas croppers for CardVault and CoinVault. The issue is likely that touch events are firing slightly off their initial start coordinates due to mobile screen sensitivity, causing the `Math.abs(dx) < 10` threshold to occasionally fail or manual boxes to draw prematurely.
2. Update the Gemini integration in `ai.js` (for both apps) to dynamically fetch and display available models, or at least align with the latest `google-genai` SDK or REST API patterns noted in my memory constraints, allowing users to select the best model.

## Implementation Steps
### 1. Touch Handling Fix (`capture.js`)
- Increase the movement threshold from `10px` to `20px` to account for "fat finger" jitter on touch screens.
- Ensure `this.moved` flag is only set to `true` if the movement exceeds the threshold. Currently, it's set to `true` on the very first pixel of movement, which means almost every tap registers as a drag on mobile.

### 2. Gemini Integration Enhancement (`ui.js` & `ai.js`)
- **Review Memory:** The global context states: "The API endpoint is `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`."
- **Model Fetching:** Add a function to `ai.js` to hit `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`.
- **UI Update:** Add a `<select>` dropdown in the Settings View (`index.html`) to let the user pick their preferred model (e.g., `gemini-1.5-flash`, `gemini-1.5-pro`).
- **Initialization:** Populate the model list dynamically once the user enters a valid API key.