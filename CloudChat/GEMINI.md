# CloudChat (LocalMind)

## Project Overview
**LocalMind** is a private, local-first AI chatbot designed to run entirely in the browser. It leverages **WebGPU** and the **MediaPipe GenAI Web API** to execute Google's **Gemma** models locally, providing a high-performance AI experience without the need for servers, API keys (for inference), or data transmission to external clouds.

### Key Technologies
- **Inference Engine:** MediaPipe LLM Inference Web API.
- **Models:** Gemma 4 E2B (MediaPipe .task format).
- **Storage:** IndexedDB (for long-term vector memory/RAG) and LocalStorage (for settings).
- **Security:** AES-256-GCM for encrypted conversation sharing; all inference is local.
- **UI/UX:** Vanilla HTML/CSS/JS with mobile-first responsive design (using `dvh` units).

## Architecture & Features
- **Inference Backend:** Pure MediaPipe GenAI for high-performance .task models.
- **Agentic Capabilities:** Features a `TOOL_REGISTRY` for autonomous tasks including:
  - `calculate`: Math expression evaluation.
  - `get_current_time`: Timezone-aware date/time retrieval.
  - `web_search` & `fetch_page`: Integration with Brave, Tavily, or SearXNG for real-time information retrieval (requires provider API keys).
  - `store_memory` / `search_memory`: Semantic long-term memory using vector embeddings.
- **Batch Processing:** Support for sequential or chained prompt execution with `{{previous}}` substitution.
- **Encrypted Sharing:** Generates secure links that encrypt conversation history using a passphrase-derived key (PBKDF2).

## Building and Running
As a single-file vanilla JavaScript application, no traditional build step is required.

### Key Operations
- **To Run:** Open `LocalChatExampleComprehensive.html` in a WebGPU-compatible browser (e.g., Chrome 113+, Edge 113+, Firefox 130+).
- **Model Files:** The application requires the `gemma-4-E2B-it-web.task` model file to be present in the directory.
- **Linting:** Follow the monorepo standard for linting:
  - `npm run lint:html` (Root) to validate the structure.
  - `npm run lint:js` (Root) to validate the internal scripts.

## Development Conventions
- **Single-File Pattern:** Maintain the modular structure within the `<script type="module">` tag of the main HTML file.
- **MediaPipe Exclusive:** All inference logic is restricted to the MediaPipe GenAI API.
- **Local-First Priority:** All new features should prioritize client-side execution and data privacy.
- **WebGPU Compliance:** Always include hardware capability checks before initializing heavy AI tasks.
- **UI Consistency:** Use the established CSS custom properties (variables) for theming and ensure full-screen layouts use `dvh` units to handle mobile browser UI shifts.
- **Agentic Logic:** When adding tools, follow the JSON Schema parameter definition pattern in `TOOL_REGISTRY` to ensure compatibility with model system prompts.
