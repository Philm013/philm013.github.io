# FlipbookAI - Instructional Context

FlipbookAI is a high-performance, vanilla JavaScript web application designed to provide a "flipbook" reading experience for PDF documents, enhanced with AI-powered analysis and interaction.

## Project Overview

- **Purpose:** A web-based PDF viewer with spread layouts (double-page), pan/zoom capabilities, and integrated AI chat for document interrogation.
- **Architecture:** Single-page application (SPA) using vanilla JS, HTML5, and CSS3.
- **Persistence:** 
    - **IndexedDB (`db.js`):** Stores PDF files (as ArrayBuffers) and user-defined collections.
    - **LocalStorage:** Stores custom bookmarks and UI theme preferences.
    - **SessionStorage:** Stores the Gemini API key.

## Key Technologies

- **PDF Rendering:** [pdf.js](https://mozilla.github.io/pdf.js/) for canvas-based rendering and text layer generation.
- **Interaction:** [panzoom](https://github.com/timmywil/panzoom) for smooth panning and zooming.
- **AI Integration:** [Google Gemini API](https://ai.google.dev/) via the `@google/generative-ai` SDK for document-based Q&A.
- **Styling:** Custom CSS (`fbai_dark.css`, `fbai_light.css`) with a focus on dark/light mode support and responsive layout.

## Core Features

1. **Flipbook Viewer:** Supports single-page and double-page (even/odd) spread layouts.
2. **Bookshelf & Collections:** 
    - **Full CRUD:** Upload PDFs, create collections, rename both PDFs and collections, and delete items.
    - **Operations Menu ("..."):** Each PDF and collection item features a menu for renaming, moving, and deleting.
    - **Drag-and-Drop:** Intuitive movement of PDFs between collections via a native drag-and-drop interface with visual feedback (`.dragging`, `.drag-over`).
3. **AI Chat:**
    - **Contextual Q&A:** Ask questions about the currently open PDF.
    - **Multi-File Analysis:** Add multiple PDFs from the bookshelf to the "Chat Context" for cross-document analysis.
    - **Model Selection:** Choose between different Gemini models (e.g., `gemini-1.5-flash`, `gemini-1.5-pro`).
4. **Search:** Full-text search across all pages with a progress bar and highlighted results on the PDF text layer.
5. **Bookmarks:** Supports both embedded PDF Table of Contents and user-created custom bookmarks.

## Development Conventions

### File Structure
- `index.html`: Main entry point and UI structure.
- `fbAI_script.js`: Main application logic, state management, drag-and-drop handlers, and event handling.
- `db.js`: IndexedDB wrapper for PDF and collection management (includes `updatePdf` for renaming).
- `fbai_dark.css` / `fbai_light.css`: Theme-specific styles, including dragging states and operations menu styling.
- `panzoom.min.js`, `pdf.min.js`, `pdf.worker.min.js`: Vendor libraries.

### AI Implementation Details
- **SDK Loading:** The Google AI SDK is loaded dynamically via a module script in `index.html`.
- **API Key:** Users are prompted for a Gemini API key, which is stored in `sessionStorage` (`geminiFlipbookApiKey`).
- **Prompt Engineering:** The chat uses a system-like prompt to enforce document-based answering and strict citation styles.
- **File Handling:** PDFs are converted to Base64 and sent as `inlineData` parts in the Gemini API request.

### Navigation Logic
- **Spread Modes:** `single`, `double-odd`, `double-even`. The rendering logic in `renderPage()` dynamically calculates which pages to show on the canvas.
- **Interactions:** Two modes: `ts` (Text Selection) and `pz` (Pan/Zoom). Shift key can be used to temporarily toggle Pan/Zoom.

## Building and Running

1. **Local Development:** Since it's a vanilla JS project, you can serve the root directory using any simple web server (e.g., `python -m http.server`, `live-server`, or via VS Code's Live Server extension).
2. **Linter:** As per workspace standards, run `npm run lint` from the project root to ensure code quality.

## Known Limitations / TODOs
- **Large PDFs:** Very large PDFs might consume significant memory when sent to the AI Chat as Base64.
- **OCR:** Currently relies on the text layer provided by `pdf.js`. Documents without a text layer (scanned images) will not be searchable or indexable by the AI unless OCR is implemented.
