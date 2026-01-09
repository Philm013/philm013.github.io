# AI-Editor

AI-Editor is a versatile, browser-based code editor designed for rapid prototyping and AI-assisted development. It combines a feature-rich CodeMirror editor with a powerful, context-aware AI chat assistant powered by Google's Gemini models. The application runs entirely in the browser without needing a backend, making it a portable and efficient tool for developers.

## Key Features

### 1. Robust File and Editor Management
- **File System:** Create, load local files, rename, and delete files within the browser session.
- **Tabbed Interface:** Easily switch between multiple open files in a familiar tabbed layout.
- **CodeMirror 5 Engine:** Enjoy a professional editing experience with support for:
    - Syntax highlighting for numerous languages (HTML, CSS, JS, Python, Markdown, etc.).
    - Code folding, bracket matching, and active line highlighting.
- **Live Preview:** Instantly view rendered HTML and Markdown files side-by-side with the code.
- **Code Formatting:** Beautify your HTML, CSS, and JavaScript code with a single click using the integrated js-beautify library.
- **Downloadable Files:** Save your work by downloading the content of the active file.

### 2. Integrated AI Document Assistant (Gemini)
- **Multi-Model Support:** Choose between different Gemini models (e.g., Gemini Flash, Gemini Pro) to balance speed and capability.
- **Context-Aware Chat:** The AI automatically receives context from your active file, including code surrounding your cursor or any text you have selected.
- **File Mentioning (`@`):** Seamlessly include the content of other open files in your prompt by mentioning them with `@filename`.
- **Global Grep:** Authorize the AI to search for patterns across all open files, enabling project-wide queries.
- **Project Rules:** Define custom instructions or style guides that the AI can fetch and adhere to during its analysis.
- **Symbol Analysis:** The AI can read the structural outline of your code (functions, classes) and even retrieve the specific definition of a symbol upon request.

### 3. AI-Powered Code Modification
- **Chunk-Based Updates:** The AI can propose targeted changes to specific chunks of your code.
- **User Approval Workflow:** Proposed changes are presented to the user for review, showing a clear "diff" of the original and new code before it's applied.
- **Diff & Patch:** Utilizes `diff-match-patch` to reliably apply AI-suggested modifications to the document.

### 4. Developer Productivity
- **Dev PAD:** A secondary AI interface, the "Dev PAD Wizard," assists with more complex, guided development tasks based on an architectural overview.
- **Draggable UI:** The AI chat and Dev PAD modals are draggable, allowing you to position them conveniently within your workspace.
- **Fullscreen Mode:** Immerse yourself in a distraction-free coding environment.

## Technical Stack & Architecture

- **Frontend:** The application is built with vanilla **HTML, CSS, and JavaScript (ES Modules)**, ensuring it is lightweight and has no external framework dependencies.
- **AI Integration:** It uses the **Google Generative AI SDK (`@google/generative-ai`)** for all interactions with the Gemini language models.
- **Core Editor:** **CodeMirror 5** provides the foundation for the text editing experience.
- **Code Formatting:** **js-beautify** is used for code beautification tasks.
- **UI & State Management:**
    - The UI is dynamically rendered and managed through a set of dedicated service modules.
    - A centralized `ApplicationStateService` manages the application's state, including the file registry, open tabs, and UI settings.
    - The code is organized into distinct modules for concerns like AI interaction (`aiService.js`), editor abstraction (`editorService.js`), UI rendering (`uiRenderer.js`), and event handling (`viewController.js`).
- **Persistence:** The Gemini API key and UI preferences (like sidebar state) are stored locally in the browser's `localStorage`.

## How to Use

1.  **Open `index.html`** in a modern web browser (like Chrome, Firefox, or Edge).
2.  **Enter API Key:** On first use, the application will prompt you for a Google Gemini API key. This is required for all AI features. You can choose to have the key remembered for the session.
3.  **Load or Create Files:**
    - Use the **"+ Create File Entity"** button in the sidebar to create a new, empty file.
    - Click **"Load File..."** to open one or more files from your local machine.
4.  **Interact with the AI:**
    - Click the floating robot icon to open the **AI Document Assistant**.
    - Select a portion of your code or simply place your cursor within the editor to provide context.
    - Type a question or instruction into the chat input. Mention other files with `@` to include them.
    - Review and approve or reject any code modifications suggested by the AI.
5.  **Use the Dev PAD:**
    - Click the "Dev PAD Wizard" button in the top bar to open the secondary AI interface for guided development tasks.
