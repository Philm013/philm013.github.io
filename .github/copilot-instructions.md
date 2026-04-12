# Copilot Instructions for PhilM013 Monorepo

## Build, test, and lint commands

### Repository root
- `npm run lint` - runs all configured linters from the repo root.
- `npm run lint:js` - ESLint for `**/*.{html,js}`; this includes inline `<script>` blocks in HTML files.
- `npm run lint:css` - Stylelint for `**/*.{html,css}`; this includes inline `<style>` blocks in HTML files.
- `npm run lint:html` - HTMLHint for the root `index.html` only.
- `npm run lint:fix` - auto-fixes JS and CSS lint issues where possible.
- `npm test` is a placeholder that exits with an error; there is no repo-wide automated test suite and no supported single-test command.

Lint scripts use direct `node_modules` paths because this repo is commonly worked on in Termux/Android, where symlink-based shims are unreliable.

### Notable app-specific commands
- `cd MarkedUp && npm start` - starts the local Express host used by the app's `/proxy` and Playwright capture endpoints. `npm run dev` does the same thing.
- `cd KnowledgeMapper/server && npm start` - starts the Node backend for Gemini and tool execution.
- `cd GoOutside && npm start` - serves the Capacitor web app from `www/`.
- `cd GoOutside && npm run build` - copies web assets for Capacitor; this project does not have a bundler build step.
- `cd GoOutside && npm run sync` - syncs web changes into the native Capacitor projects.
- `cd GoOutside && npm run open:android` / `npm run open:ios` - opens the native project in the platform IDE.

## High-level architecture

- The repository root is a portfolio/launcher site (`index.html`) that links to many sibling apps. The repo is a monorepo of mostly independent projects rather than a single integrated application.
- Most project folders are local-first browser apps built with vanilla HTML/CSS/JavaScript. Many are single-file SPAs in `index.html`; others use a small set of ES module files. In the common case there is no build step and the app is meant to run directly in the browser.
- Persistence is intentionally browser-native: heavier app data usually lives in IndexedDB, while API keys, UI preferences, and lightweight session state usually live in `localStorage`.
- Collaboration features are generally peer-to-peer rather than server-backed. Projects such as SnapMeet and WorkPlanner use PeerJS/WebRTC and keep network/state-sync logic separate from UI modules.
- AI-enabled apps are still mostly client-side. Repository-wide Gemini behavior is centralized in `js/ai-helper.js`, which handles API-key discovery across old and new storage keys, dynamic model listing, key rotation, and a 10-minute cooldown after rate limiting.
- The main architectural exceptions are:
  - `MarkedUp/`: modular frontend plus a required local Node server for static hosting, proxying, and Playwright capture.
  - `KnowledgeMapper/`: split client/server application; AI and tool execution live in `server/`.
  - `GoOutside/`: Capacitor project with browser assets in `www/` and native Android/iOS wrappers.
- Repository automation also includes Gemini-driven GitHub workflows under `.github/workflows/` and matching prompts in `.github/commands/`.

## Key conventions

- Prefer vanilla JS and browser-native platform APIs over frameworks or bundlers. New code should fit the existing lightweight, direct-to-browser style unless the target project already uses a server/runtime layer.
- Tailwind is normally loaded from a CDN and is the default styling approach. Prefer utility classes over new custom CSS, except for animation-heavy or canvas-heavy UI.
- Follow the shared library guide in `References/JS_LIBRARIES_DOCUMENTATION.md` when adding dependencies or new features. Established defaults include Chart.js for charts, XLSX for spreadsheet import/export, PDF.js plus html2canvas/jsPDF for PDF and capture workflows, Leaflet for maps, PeerJS for P2P sync, Iconify for icons, and DOMPurify when rendering user- or AI-generated HTML.
- For Gemini work, reuse the repo helper and documented pattern instead of inventing a new one. `js/ai-helper.js` expects centralized keys in `localStorage["gemini_api_keys"]`, still reads legacy keys for compatibility, rotates across available keys, and applies a 10-minute cooldown on rate-limited keys. UI flows should expose a model selector populated from `listModels()` instead of hardcoding a stale model list.
- Heavy persisted data should go through an app-level `DB`/storage module and IndexedDB when practical; lightweight UI state belongs in `localStorage`.
- Keep library-specific lifecycle code isolated from UI orchestration. The shared guide explicitly expects cleanup paths for event-listener-heavy or instance-heavy libraries such as PeerJS, Chart.js, Sortable, and similar browser-managed objects.
- Before editing a project, read the local `README.md` in that project directory. Some projects also carry project-specific AI guidance in a local `GEMINI.md`; those local instructions should take precedence over this repo-wide file for that project.
