# EdReports 2.0 Review Tool

## Overview

The EdReports 2.0 Review Tool is a comprehensive, browser-based application designed to streamline the process of reviewing educational materials against a defined set of criteria. It provides a dynamic interface for reviewers to select a rubric, enter evidence and notes, and leverage the power of Generative AI to analyze source materials (PDFs). The tool is built to run entirely on the client-side, using IndexedDB for local storage of reviews and materials, ensuring that user data remains private.

## Core Features

*   **Dynamic Rubric Loading**: Supports multiple rubrics (e.g., Science K-5, ELA K-2) which are loaded dynamically.
*   **Rich Text Editing**: Integrates the TinyMCE rich text editor for detailed evidence and notes entry.
*   **AI-Powered Analysis**: Connects to Google's Gemini Pro and Flash models to perform analysis on instructional materials.
*   **PDF Management**: Allows users to load multiple PDF documents from either a URL or local files. These documents serve as the context for AI analysis.
*   **Interactive AI Chat**: A floating chat window enables reviewers to ask questions about the loaded PDFs, with the ability to add context from specific rubric indicators to the query.
*   **Contextual AI Indicator Analysis**: Reviewers can trigger an AI analysis for any specific indicator in the rubric, with the option to provide custom instructions to guide the AI.
*   **Local Data Persistence**: All review data, including metadata, rubric content, and loaded PDFs, is saved in the browser's IndexedDB, allowing users to save and load multiple reviews without a backend server.
*   **Import/Export**: Reviews can be saved and loaded from the local database. Additionally, a completed review can be exported as a standalone HTML file for sharing and archival.
*   **Built-in Viewers**: Includes a modal-based PDF viewer and an image viewer for convenience.
*   **Evidence Guides**: Provides a feature to display a detailed "Evidence Guide" for rubric indicators.

## How It Works

1.  **Initialization**: On loading `index.html`, the application initializes the Google Generative AI SDK and loads all available rubric definitions from the `/rubrics` directory.
2.  **Rubric Selection**: The user selects a rubric from a dropdown menu. `app.js` and `ui.js` work together to dynamically render the entire structure of the selected rubric in the main content area.
3.  **Review Input**: The reviewer fills out metadata (Title, Grade, etc.) and populates the rubric with evidence, notes, and scores.
4.  **Loading Materials**: The user loads relevant PDF documents (e.g., teacher's guides, student workbooks) into the tool using the "Manage & Load PDFs" feature. These files are stored in IndexedDB.
5.  **AI Interaction**:
    *   **Indicator Analysis**: The user clicks the "Analyze with AI" button for a specific indicator. The tool gathers the indicator's criteria, any custom instructions, and the text content from all loaded PDFs, then sends a prompt to the selected Gemini model via `ai-analyzer.js`. The AI's response is then populated into the evidence field.
    *   **Chat Query**: The user opens the AI chat modal to ask questions. The query is sent to the Gemini model along with the context of all loaded PDFs.
6.  **Saving and Loading**: The user can click "Save Review" to store the current state of the review (including loaded PDF references) in IndexedDB. Previously saved reviews can be listed and reloaded into the tool.
7.  **Exporting**: Once a review is complete, the user can export it as an HTML file. The `export.js` module generates a self-contained HTML document with all the review data and styling.

## File Structure

The application is organized into several key files and directories:

*   `index.html`: The main HTML file that defines the UI structure and includes all necessary scripts and styles.
*   `styles.css`: Contains all the CSS for styling the application components.
*   `rubrics/`: A directory containing JavaScript files, where each file defines a specific rubric structure (e.g., `science-k5.js`).
*   `app.js`: The central orchestrator of the application. It handles user events, manages application state, and coordinates between the other modules.
*   `ui.js`: Responsible for dynamically rendering the rubric interface based on the selected rubric object.
*   `ai-analyzer.js`: Manages all interactions with the Google Gemini API, including constructing prompts and processing responses for indicator analysis and chat.
*   `db.js`: An abstraction layer for all interactions with the browser's IndexedDB. It handles saving, loading, and deleting reviews and PDF data.
*   `review.js`: Manages the data model for a review, including functions for saving and loading review content.
*   `export.js`: Contains the logic for exporting a completed review into an HTML file.
*   `utils.js`: A collection of helper and utility functions used throughout the application.

## Getting Started / Configuration

To use the AI features of the tool, you must configure your Google Gemini API key.

1.  Open the `index.html` file.
2.  Locate the following line of code near the top in the `<script type="module">` block:
    ```javascript
    const GEMINI_API_KEY = "AIzaSyC70cXxItO4NGCEWo2B9lM9ZfbBSepASRM"; // <-- REPLACE THIS
    ```
3.  Replace `"AIzaSyC70cXxItO4NGCEWo2B9lM9ZfbBSepASRM"` with your actual Gemini API key.

**Note**: For security reasons, it is not recommended to expose API keys on the client-side in a production environment. For personal or internal use, this method is acceptable, but for a public-facing application, the key should be managed via a secure backend proxy.

## Technical Details

*   **Frontend**: The application is built with plain HTML, CSS, and JavaScript, with no external frameworks.
*   **AI Integration**: Uses the `@google/genai` JavaScript SDK to communicate with the Gemini family of models.
*   **Local Storage**: Leverages IndexedDB for robust client-side storage of large amounts of data, including review content and PDF files.
*   **Rich Text**: Implements TinyMCE for a powerful and user-friendly rich text editing experience in evidence fields.
*   **Dependencies**: Relies on several client-side libraries for specific functionalities:
    *   `Font Awesome`: For UI icons.
    *   `jspdf`: For potential PDF generation features.
    *   `marked`: To convert any Markdown in AI responses to HTML.
    *   `DOMPurify`: To sanitize HTML content before rendering it in the DOM, preventing XSS vulnerabilities.
    *   `FileSaver.js`: To enable the saving of exported files.
    *   `html2canvas`: Potentially used for capturing parts of the UI as images.
