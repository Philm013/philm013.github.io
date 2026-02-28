# PhilM013 Monorepo

## Overview
This repository contains various scientific and engineering tools, editors, and experiments. Most applications are designed as high-performance, single-file (or modular) vanilla JS web apps.

## Global Development Conventions

### Linting & Code Quality
The project uses a centralized linting configuration at the root to handle JavaScript, CSS, and HTML (including internal scripts/styles).
- **Tooling:** ESLint, Stylelint, and HTMLHint.
- **Commands:**
  - `npm run lint`: Runs all linters project-wide.
  - `npm run lint:js`: Lints JS and script tags in HTML.
  - `npm run lint:css`: Lints CSS and style tags in HTML.
  - `npm run lint:html`: Lints HTML structure.
- **Environment:** Since symlinks are not supported (Android/Termux), linter commands use direct paths to `node_modules`.

### Library Implementations
When implementing or modifying features, adhere to these established patterns:
- **Tailwind CSS:** Used via CDN for rapid styling. Adhere to utility classes; avoid custom CSS unless for complex animations or canvas-based tools (like the Model Canvas in InquiryOS).
- **PeerJS:** Used for P2P collaboration (e.g., SnapMeet, WorkPlanner). Ensure robust error handling for peer connections and data channel lifecycle.
- **Data & Visualization:** 
  - **Chart.js:** Primary for data visualization.
  - **XLSX (SheetJS):** Used for spreadsheet imports/exports.
  - **PDF.js / html2pdf / jspdf:** Used for document rendering and export.
  - **tldraw:** Integrated for advanced whiteboarding/drawing capabilities.
- **Icons:** Use **Iconify** for dynamic icon loading.

### AI Integration (Gemini)
AI features should leverage the pattern established in the `TechieTeaching` ecosystem:
- **Core Helper:** Utilize or replicate the logic of `callGeminiDirect($action, $prompt, $context, $modelOverride, $extraData)`.
- **Key Management:** Support multiple API keys with rotation and cooldown (10-minute) logic to handle rate limits.
- **Structured Output:** Prefer structured responses parsed via predictable patterns (e.g., `TITLE:`, `DESCRIPTION:`, `TAGS:`) or JSON if the model is configured for it.
- **System Prompts:** Manage templates via centralized settings or `getAiDefaultPrompt()` logic in `utilities.php`.

### Data Persistence
- **IndexedDB:** Use for heavy client-side data (e.g., `InquiryOS_DB`).
- **LocalStorage:** Use for lightweight settings and UI states.
- **Modular Pattern:** Centralize data logic in a `DB` or `Storage` module within each application.
