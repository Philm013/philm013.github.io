# KnowledgeMapper - Research Assistant Overhaul & Bug Fixes

## Objective
Thoroughly review and enhance KnowledgeMapper as a research assistant tool. Fix the bug where Google Search results are not displayed in chat, and ensure all research processes (sources, outlines, notes) are accessible throughout the user journey. Complete the modular refactoring to ensure all features are functional.

## Key Files & Context
- `index.html`: Main UI structure. Needs new tabs for Sources and Outline.
- `js/main.js`: Main logic. Currently refers to non-existent UI elements.
- `js/api.js`: AI tool integration. Needs fix for `google_search` result rendering.
- `js/ui.js`: UI management. Needs references to new elements.
- `style.css`: Application styling. Needs styles for new components.

## Implementation Steps

### 1. Fix Google Search Result Rendering
- **Problem:** `google_search` tool returns `suggestionsHtml` (grounding chips), but the chat UI never renders it.
- **Change (js/api.js):**
    - Update `sendChatMessage` to accumulate `suggestionsHtml` from all tool responses in a turn.
    - Append this HTML to the model's final text response when calling `addMessageToChatHistory`.
- **Change (js/ui.js):**
    - Update `addMessageToChatHistory` to support an optional `metadata` or `extraHtml` field.
    - Ensure `suggestionsHtml` is rendered inside the chat bubble but styled appropriately (e.g., as Google Search chips).

### 2. Complete Modular Refactoring (UI Consistency)
- **Problem:** `main.js` refers to `ui.sourcesList`, `ui.outlineTree`, etc., which are missing from `index.html` and `ui.js`.
- **Change (index.html):**
    - Add a "Workspace Tab" system to the side panels.
    - Create containers for `Sources View` (Bibliography) and `Outline View`.
    - Add necessary IDs (`sources-list`, `outline-tree`, `notecard-source-select`, etc.).
- **Change (js/ui.js):**
    - Add all missing element references to the `ui` object.
- **Change (style.css):**
    - Add styling for the Tab system and the new Research Views.

### 3. Enhance Research Accessibility
- **Goal:** Make research findings persistent and accessible.
- **Change (js/main.js):**
    - Ensure `window.projectSources` is correctly initialized and persisted in the map data.
    - Add logic to allow AI-found links to be "Saved to Sources" with one click.
- **Change (js/api.js):**
    - Update `_internal_researchTopicForDetails` to better structure its output for the new Notecard format (Quote, Paraphrase, Thoughts).

### 4. Improve Research Coach (Socratic Integration)
- **Goal:** Better integration between the Coach and the Map.
- **Change (js/api.js):**
    - Refine the `SYSTEM_PROMPT` to encourage the coach to suggest adding specific nodes to the map or checking the bibliography.

## Verification & Testing
- **Chat Test:** Ask the AI a current events question. Verify that the "Search on Google" chips appear at the bottom of the model's response.
- **Research Test:** Generate a new map with AI. Verify that each node has researched details.
- **Accessibility Test:** Toggle between Map, Sources, and Outline views. Verify that adding a source updates the notecard dropdown.
- **Persistence Test:** Save a map, reload it, and verify that the bibliography and chat history are restored.
- **Linter:** Run `npm run lint` from the project root.
