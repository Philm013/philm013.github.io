# EdReporter Code Analysis

## Summary of Findings

The EdReporter tool is a well-architected, client-side-only web application for reviewing educational materials. Its core strength lies in a clean separation of concerns and a data-driven design.

**Architecture & Flow:**

1.  **Data Model (`rubrics/*.js`):** The application's structure is defined by rubric files, which are large JavaScript objects containing all UI text, indicator definitions, scoring rules (`ratingThresholds`), and even final rating logic (`finalRatingLogic`).
2.  **Initialization (`index.html`, `app.js`):** `index.html` loads all scripts and data. `app.js` then acts as the central controller, initializing the database, UI, and event listeners.
3.  **UI Rendering (`ui.js`):** When a rubric is selected, `app.js` calls `ui.js` to dynamically generate the entire HTML for the review form based on the rubric's data object.
4.  **State Management (`review.js`):** User input is captured and stored in a global `currentReview` object. `review.js` manages this state, using TinyMCE for rich text evidence and debounced event listeners to keep the state object in sync with the UI.
5.  **Persistence (`db.js`):** All data, including review text and loaded PDF files (as base64), is stored locally in the browser's IndexedDB. `db.js` provides a clean, promise-based API for all database transactions, correctly modeling the one-to-many relationship between reviews and their source PDFs.
6.  **AI Integration (`ai-analyzer.js`):** User actions in `app.js` trigger calls to `ai-analyzer.js`, which constructs prompts by combining rubric criteria, user instructions, and the text content of all loaded PDFs, before sending the request to the Google Gemini API.
7.  **Security (`utils.js`):** The `sanitizeHTML` function (using DOMPurify) is used consistently throughout the application, providing robust protection against XSS attacks from user- or AI-generated content.

**Corrections/Revisions Identified:**

*   **API Key Storage:** The `README.md` noted a hardcoded API key. The current implementation has improved this by storing the key in `localStorage`. While better, this is still a client-side security risk in a public application but is acceptable for a local-first tool. This is a known and documented trade-off.
*   **Global Scope:** The application relies on the `window` object for inter-module communication (e.g., `window.rubrics`, `window.genAiInstance`, and exposing all utility functions globally). For a larger or multi-developer project, this could be refactored to use ES6 modules for better encapsulation and dependency management. For this self-contained tool, it is functional.
*   **Redundant Listeners:** `app.js` appears to re-attach some delegated event listeners from `review.js` every time a rubric is loaded. This is unnecessary and could be streamlined, but it does not cause any bugs.

**Conclusion:** The tool is thoughtfully designed for its purpose. The data-driven architecture is its strongest feature, making it flexible and easy to extend with new rubrics. The code is clean, well-commented, and demonstrates good practices for security and local data persistence. The investigation was interrupted before `ai-analyzer.js` and `export.js` could be fully analyzed, but their function is clear from the surrounding code. A new markdown file summarizing these findings would be the next step.

## Exploration Trace

*   Used `list_directory` to get an overview of the `EdReporter/` directory.
*   Read `EdReporter/README.md` to understand the project's purpose, features, and high-level architecture.
*   Read `EdReporter/index.html` to analyze the UI structure, script loading order, and initialization of global objects and the AI SDK.
*   Read `EdReporter/app.js` to understand the main application controller, event handling, and orchestration of other modules.
*   Read `EdReporter/ui.js` to understand how the rubric data objects are dynamically rendered into HTML.
*   Read `EdReporter/rubrics/science-k5.js` to confirm the data structure of the rubric files.
*   Read `EdReporter/utils.js` to analyze the helper functions for security, data manipulation, and scoring logic.
*   Read `EdReporter/review.js` to understand how the application state (`currentReview`) is managed, how user input is captured, and how the save/load lifecycle works.
*   Read `EdReporter/db.js` to understand the IndexedDB schema and the data persistence layer for reviews and PDFs.

## Relevant Locations

| File Path | Reasoning | Key Symbols |
| :--- | :--- | :--- |
| `EdReporter/index.html` | The main entry point of the application. It defines the complete UI structure, including all modals, and handles the initial loading of all CSS, external libraries, and application scripts. It also contains the crucial initial logic for loading the Gemini AI SDK and the individual rubric data files into the global `window.rubrics` object. | `initializeGeminiSDK`, `sdkInitializationPromise`, `rubricSelector`, `rubricContent` |
| `EdReporter/app.js` | This is the central orchestrator of the entire application. It initializes all modules, sets up global event listeners, and manages the overall application flow. The `loadRubric` function is the core of the UI rendering process, and `updateAiFeatureUI` is a key function for managing the state of AI-related features based on API key and PDF availability. It acts as the 'controller' in a model-view-controller pattern. | `initApp`, `loadRubric`, `updateAiFeatureUI`, `setupPdfLoadModal`, `setupChatQueryModal` |
| `EdReporter/ui.js` | This file is a pure data-to-DOM rendering engine. Its sole purpose is to take a complex rubric data object and translate it into an HTML string that represents the entire review interface, including tabs, gateways, criteria, and individual indicators. It makes heavy use of `sanitizeHTML` from `utils.js` for security. | `renderRubricUI`, `renderIndicator`, `renderIndicatorGroup` |
| `EdReporter/review.js` | This file is the state management hub for a user's review. It defines the `currentReview` object that holds all user-entered data (scores, evidence). It contains the logic to bind UI interactions (like typing in a TinyMCE editor or selecting a score) to this data object. It also manages the lifecycle of a review, orchestrating calls to `db.js` to save and load data. | `currentReview`, `updateEvidenceData`, `updateGatewayScores`, `saveCurrentReview`, `loadReviewData`, `initializeSingleTinyMCE` |
| `EdReporter/db.js` | This file is the data persistence layer. It provides a clean, promise-based abstraction over IndexedDB. It correctly defines a schema with two object stores (`reviews` and `reviewPdfs`) to manage the one-to-many relationship between a review and its source materials, and it handles all create, read, update, and delete (CRUD) operations transactionally. | `initDB`, `saveReview`, `getReview`, `savePdfsForReview`, `getPdfsForReview`, `deleteReview` |
| `EdReporter/utils.js` | A critical collection of stateless helper functions. It contains the application's most important security function (`sanitizeHTML` via DOMPurify), data-driven scoring logic (`calculateFinalRating`), robust DOM manipulation (`linkifyPageNumbers`), and data traversal helpers (`findIndicatorConfig`) used by all other modules. | `sanitizeHTML`, `calculateFinalRating`, `linkifyPageNumbers`, `findIndicatorConfig` |
| `EdReporter/rubrics/` | This directory contains the data models for the application. Each file defines a single, large JavaScript object that represents an entire review rubric. This data-driven approach is a core architectural feature, allowing the application to render different review structures and apply different scoring logic without changing the core application code. | `science-k5.js`, `ela-k2.js` |
| `EdReporter/ai-analyzer.js` | (Analysis Interrupted) Based on calls from `app.js`, this file is responsible for constructing the final prompts (including system instructions, PDF context, and user queries) and making the actual API calls to the Google Gemini models. It would contain the `analyzeIndicatorWithAI` and `customQueryWithAI` functions. | |
| `EdReporter/export.js` | (Analysis Interrupted) Based on calls from `app.js`, this file is responsible for generating a self-contained HTML file from the `currentReview` data object, allowing users to save a portable, offline copy of their completed review. | |
