# CloudChat External API Skills Development Plan

## Overview
This plan outlines the implementation of six new Agent Skills for **CloudChat (LocalMind)**, leveraging external APIs for weather, marine data, trivia, and general knowledge. All skills will follow the **JavaScript (JS) Skill** architecture, executing logic in a sandboxed hidden webview via `run_js`.

## 1. Technical Architecture
Each skill will consist of:
- `SKILL.md`: LLM instructions, JSON schema for tool calls, and metadata.
- `scripts/index.html`: The core runner that handles `fetch` requests, CORS management, and data formatting.
- **CORS Fallback**: Use `https://api.allorigins.win/raw?url=` for APIs that do not support cross-origin requests from browser environments.

---

## 2. Skill Specifications

### A. Weather Forecast (`weather-forecast`)
- **API**: Open-Meteo Forecast API
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Helper API**: Open-Meteo Geocoding (`https://geocoding-api.open-meteo.com/v1/search`) to convert city names to coordinates.
- **Inputs**: `location` (string)
- **Logic**: 
    1. Geocode location to lat/long.
    2. Fetch 7-day forecast (temp, wind, precipitation).
    3. Return a structured summary for the LLM.

### B. Historical Weather (`historical-weather`)
- **API**: Open-Meteo Historical Weather
- **Endpoint**: `https://archive-api.open-meteo.com/v1/archive`
- **Inputs**: `location` (string), `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD)
- **Logic**: Fetch historical data for the requested period and return temperature/precipitation extremes.

### C. Marine Weather (`marine-weather`)
- **API**: Open-Meteo Marine Weather
- **Endpoint**: `https://marine-api.open-meteo.com/v1/marine`
- **Inputs**: `location` (string - coast/sea coordinates)
- **Logic**: Fetch wave height, wave period, and wave direction.

### D. Public API Explorer (`api-explorer`)
- **API**: Dave Machado's Public API (via `https://api.publicapis.org/entries`)
- **Note**: If the primary endpoint is unstable, use the GitHub JSON source or a community mirror.
- **Inputs**: `category` (string), `keyword` (string)
- **Logic**: Search the database for relevant APIs and return their name, description, and link.

### E. Useless Facts (`useless-facts`)
- **API**: Useless Facts API
- **Endpoint**: `https://uselessfacts.jsph.pl/random.json?language=en`
- **Inputs**: `random` (boolean)
- **Logic**: Fetch a random "useless" fact and return it directly.

### F. Trivia Challenge (`trivia-quest`)
- **API**: Open Trivia DB
- **Endpoint**: `https://opentdb.com/api.php?amount=1`
- **Inputs**: `category` (integer), `difficulty` (string - easy/medium/hard)
- **Logic**: Fetch a question, provide multiple choices, and handle optional "Interactive View" (webview) for the user to play.

---

## 3. Implementation Workflow

### Phase 1: Directory Setup
Create the following folders under `CloudChat/skills/featured/`:
- `weather-forecast/`
- `historical-weather/`
- `marine-weather/`
- `api-explorer/`
- `useless-facts/`
- `trivia-quest/`

### Phase 2: Core JavaScript Logic
Develop the `scripts/index.html` for each skill.
- **Standard Template**:
```html
<script>
  window['ai_edge_gallery_get_result'] = async (data) => {
    try {
      const params = JSON.parse(data);
      // API Logic here...
      const response = await fetch(url);
      const result = await response.json();
      return JSON.stringify({ result });
    } catch (e) {
      return JSON.stringify({ error: e.message });
    }
  };
</script>
```

### Phase 3: Metadata & Instructions
Draft the `SKILL.md` for each.
- Define `name` and `description`.
- Provide specific examples for the LLM.
- Define the exact JSON parameters for `run_js`.

### Phase 4: Interactive Webviews (Optional)
For **Weather** and **Trivia**, create `assets/webview.html` files to provide rich UI (charts for weather, multiple-choice buttons for trivia).

---

## 4. Implementation Schedule

1. **Day 1**: Open-Meteo integration (Forecast, Historical, Marine).
2. **Day 2**: Public API and Useless Facts integration.
3. **Day 3**: Trivia Challenge and Interactive UI components.
4. **Day 4**: System-wide testing and prompt refinement.

## 5. Security & Privacy
- **No API Keys**: Most of these APIs are key-less, maximizing privacy.
- **Local Execution**: All fetching and parsing happens on-device in the hidden webview.
- **Minimal Context**: Results will be truncated or summarized to stay within the LLM's context window.
