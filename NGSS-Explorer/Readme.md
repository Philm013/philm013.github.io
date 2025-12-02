# NGSS 3D + PE Explorer

![Version](https://img.shields.io/badge/version-1.4-blue) ![Status](https://img.shields.io/badge/status-Active-success) ![Tech](https://img.shields.io/badge/tech-HTML%2FJS%2FCSS-yellow)

## 1. Overview

The **NGSS 3D + PE Explorer** is a comprehensive, client-side web application designed for educators, curriculum developers, and instructional coaches. It provides a powerful and intuitive interface to explore, analyze, and organize the Next Generation Science Standards (NGSS).

This tool operates as a Single Page Application (SPA). It requires no backend server installation; however, it fetches data from remote JSON endpoints upon first load. While core exploration features work offline once data is cached, the AI integrations require an active internet connection to communicate with Google's servers.

## 2. Key Features

*   **Interactive Guided Tour:** A built-in tutorial (powered by Shepherd.js) walks new users through the interface, explaining filters, views, and AI tools step-by-step.
*   **Three Powerful Views:**
    *   **PE Explorer:** A searchable, filterable database of all NGSS Performance Expectations (PEs) with expandable details.
    *   **3D Explorer:** A vertical progression view of Science and Engineering Practices (SEPs), Disciplinary Core Ideas (DCIs), and Crosscutting Concepts (CCCs) across K-12.
    *   **Matrix View:** A customizable heatmap that visualizes where specific 3D elements appear across grade levels.
*   **Curriculum Bundling:** Select multiple PEs to create custom "bundles." The tool generates a summary of all 3D elements covered by the group, aiding in unit planning. Bundles can be saved, named, and reloaded.
*   **AI-Powered Analysis (Gemini):**
    *   **Contextual Analysis:** Automatically color-codes PE descriptions to visually identify SEPs (blue), DCIs (orange), and CCCs (green).
    *   **Facet Deconstruction:** Uses AI to break down complex Evidence Statements into granular learning "facets" mapped to specific 3D elements.
    *   **Interactive Editor:** Refine AI outputs by selecting text to add nested formatting or correct classifications manually.
*   **Smart Linking:** Click on any colored 3D element text to instantly jump to the **3D Explorer** and see every other PE that utilizes that specific element (Reverse Lookup).
*   **Data Privacy:** Your data, saved bundles, and API keys are stored in your browser's `localStorage` and are never sent to a third-party server (excluding direct calls to Google's AI API).

## 3. How to Use the Tool

### Getting Started

1.  Open `ngss-explorer.html` in a modern web browser (Chrome, Edge, Firefox).
2.  **First Run:** Click the **"Take a Tour"** button in the header for an interactive walkthrough.
3.  **Unlock AI:** Click **"Settings"** and enter your Google Gemini API Key to enable the analysis features.

### The Main Views

#### 3.1. PE Explorer
The default dashboard.
*   **Filter:** Use the sidebar to filter by Grade, Topic, or specific 3D Elements.
*   **Deep Dive:** Click any row to expand it. You will see the full standard, clarification statements, assessment boundaries, and a formatted breakdown of the three dimensions.
*   **Pro Tip:** Right-click any text (ID, description, element) to copy it to your clipboard.

#### 3.2. 3D Explorer
Understand vertical alignment and progressions.
*   **Visualize:** See how specific elements evolve from Kindergarten through High School.
*   **Filter:** Navigate from a PE to this view to highlight specific elements associated with that standard.
*   **Reverse Lookup:** Click on any element in the table to open a modal listing every PE that utilizes that specific skill or concept.

#### 3.3. Matrix View
A high-level map for curriculum planning.
*   **Customize:** Click **"Select/Refine Rows"** to choose specific SEPs, DCIs, or CCCs.
*   **Analyze:** The grid displays which PEs address the selected elements across various grade levels.

## 4. Advanced Features

### 4.1. PE Bundling
1.  **Select:** Check the boxes next to PEs in the main list.
2.  **Analyze:** The "Bundle Controls" bar will appear at the top. Click **"View Bundle Details"** for an aggregate summary.
3.  **Save:** Bundles can be saved to local storage for future retrieval via the "Manage" button in the sidebar.

### 4.2. AI Integration
Powered by Google Gemini (Supports `gemini-1.5-flash` and `gemini-2.5-pro`).

1.  **Analyze Description:** Inside a PE's detail view, click **"Analyze with Full Context"**. The AI reads the standard and highlights the three dimensions.
2.  **Deconstruct Evidence:** Open the **"View Evidence Statements"** modal. Click **"Deconstruct"** to have the AI parse the raw evidence data into specific, observable student skills.
3.  **Editor:** Select text within an analysis to apply your own formatting overrides (e.g., adding an underline to specific words).

## 5. Technical Specifications

*   **Architecture:** Client-side HTML/JS/CSS. No backend framework (Node/Python/PHP) required.
*   **Data Source:** Fetches optimized JSON data files (`ngss3DElements.json`, `ngssK5.json`, etc.) from a remote repository on first load. This data is cached in IndexedDB (`NGSS_Explorer_Cache`) for faster subsequent loads.
*   **Persistence:**
    *   **IndexedDB:** Caches static NGSS data and AI analysis results to reduce API costs.
    *   **LocalStorage:** Stores user settings (API Key, Model preference) and Saved Bundles.
*   **State Management:** The URL query parameters (`?view=pe&grade=Kindergarten...`) track the current application state, allowing views to be bookmarked and shared.
*   **Context Window:** When analyzing a standard, the tool constructs a rich context prompt containing the PE description, clarification, boundary, and raw evidence statements to ensure the AI output is accurate and hallucination-free.
