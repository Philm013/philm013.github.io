# Archie's IDE

Archie's IDE is a powerful, browser-based development environment designed for AI-driven software creation. It provides a complete, self-contained workspace that allows a user to collaborate with an AI agent ("Archie") to build and modify web projects from scratch. The entire application runs client-side, leveraging IndexedDB for project persistence and Google's Gemini models for its intelligence.

## Core Concepts

The central philosophy of Archie's IDE is structured, AI-guided development. The workflow is orchestrated through a key document:

-   **Project Architecture Document (PAD):** A `PROJECT_ARCHITECTURE.md` file serves as the single source of truth for the AI. It contains the project's high-level objective, a detailed file and component blueprint, function contracts, and a step-by-step implementation plan. The AI reads this document to understand its tasks and updates it as it completes them.

-   **AI Auto Mode:** When activated, Archie enters an autonomous loop where it systematically works through the `PENDING` tasks in the PAD. It reads a task, executes it using its available tools (like creating or modifying files), and then updates the PAD to mark the task as `COMPLETED` before moving to the next one.

## Key Features

### 1. Project & File Management
-   **Full Project Lifecycle:** Create new projects (scaffolded by the AI based on a prompt), load projects from your browser's database, or import from local files.
-   **Virtual File System (VFS):** The IDE operates on a virtual file system, allowing for the creation, editing, renaming, and deletion of files and folders within a project's scope.
-   **Persistent Storage:** All projects, including their file snapshots and version history, are saved locally in your browser's **IndexedDB**.
-   **Import/Export:** Import an existing project from a local directory or download the entire virtual project as a `.zip` file.

### 2. Advanced AI Integration ("Archie")
-   **Conversational Terminal:** Interact with the AI through a terminal interface, giving instructions in natural language.
-   **Tool-Based Operations:** The AI uses a defined set of tools to interact with the file system, such as `createFile`, `readFile`, and `applyChange`.
-   **Change Proposal System:** When the AI wishes to modify a file, it presents a clear `diff` view of the proposed changes. The user must approve the change before it is applied, ensuring complete control.
-   **Auto Mode:** Delegate the development process to the AI, which will autonomously execute the plan laid out in the PAD.
-   **PAD (Project Architecture Document):** A structured planning document that guides the AI, tracks its progress, and logs its decisions.
-   **Custom Rules Engine:** Define project-specific rules and guidelines that the AI can query and adhere to during development.

### 3. Modern IDE Interface
-   **Responsive Multi-Pane Layout:** A VS Code-inspired, responsive interface featuring:
    - A collapsible file explorer.
    - A main editor with a tabbed interface for open files.
    - A resizable right-hand panel for the terminal, history, PAD, and rules.
-   **Live Preview:** Instantly render HTML and Markdown files. The previewer intelligently handles local file paths (e.g., `<script src="app.js">`), making it fully self-contained.
-   **Basic Version Control:** The "History" tab tracks all uncommitted changes. You can review diffs, write commit messages, and save snapshots of your project, creating a linear version history.

## Technical Stack & Architecture

-   **Frontend:** The application is a self-contained Single Page Application (SPA) built with vanilla **HTML, CSS, and JavaScript (ES Modules)**. It has no external framework dependencies.
-   **AI SDK:** Integrates **Google's Generative AI SDK (`@google/genai`)** via ESM import for all large language model interactions.
-   **Local Persistence:** Uses the browser's **IndexedDB** as a robust database for storing all project data, including files, commit history, and rules.
-   **Client-Side Libraries:**
    -   **`jsdiff`:** Powers the diff view for reviewing uncommitted changes.
    -   **`showdown`:** Used for rendering Markdown previews.
    -   **`jszip`:** Enables the "Download Project as ZIP" functionality.
-   **Architecture:** The application's logic, while embedded in a single HTML file, is highly structured into objects that manage different concerns:
    -   `App`: Manages global application state.
    -   `DB`: An IndexedDB wrapper for all persistence logic.
    -   `VirtualFileSystem`: Manages the in-memory file system.
    -   `functionHandlers`: Implements the tools available to the AI agent.

## How to Use

1.  **Open `index.html`** in a modern web browser.
2.  **API Key:** On first use, you will be prompted to enter a Google Gemini API key. This key is stored in your browser's `localStorage` for the session.
3.  **Start a Project:**
    - **Start Fresh:** Describe a project you want to build, and the AI will create an initial set of files and a PAD for you.
    - **Restore Last Project:** Load the last project you were working on.
    - **Load a Project:** Choose from a list of previously saved projects.
4.  **Interact with Archie:** Use the input bar at the bottom to give instructions to the AI. Be descriptive (e.g., "Create a new CSS file named `style.css` and link it in `index.html`").
5.  **Review Changes:** When the AI proposes a file modification, review the diff in the terminal and click "Apply" or "Reject".
6.  **Use Auto Mode:** Once a solid plan is in the PAD, toggle "Auto Mode" and watch the AI build the project according to the plan.
7.  **Commit Your Work:** Navigate to the "History" tab to review your changes and save a snapshot of your project.
