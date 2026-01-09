# NGSS 3D + PE Explorer

The NGSS 3D + PE Explorer is a comprehensive, client-side web application designed for educators, curriculum developers, and instructional coaches. It provides a powerful and intuitive interface to explore, analyze, and organize the Next Generation Science Standards (NGSS) in a deeply interconnected way.

This tool operates as a Single Page Application (SPA). It fetches data from remote JSON endpoints upon first load and then caches it for fast, offline-capable browsing. AI features require an active internet connection and a user-provided API key.

## Key Features

### 1. Three Powerful Views
-   **PE Explorer:** A searchable, filterable database of all NGSS Performance Expectations (PEs). Expand any PE to see its full details, including clarification statements, assessment boundaries, and a formatted breakdown of its three dimensions.
-   **3D Explorer:** A vertical progression view showing how each Science and Engineering Practice (SEP), Disciplinary Core Idea (DCI), and Crosscutting Concept (CCC) evolves from Kindergarten through High School.
-   **Matrix View:** A customizable heatmap that visualizes where specific 3D elements appear across grade levels, serving as a high-level curriculum mapping tool.

### 2. AI-Powered Analysis & Deconstruction (Google Gemini)
-   **Contextual Analysis:** Automatically color-codes a PE's description to visually identify the integrated SEPs (blue), DCIs (orange), and CCCs (green).
-   **Evidence Statement Deconstruction:** A key feature that uses AI to break down complex Evidence Statements into granular, observable student skills, or "facets," and maps them to the specific 3D elements they address.
-   **Interactive AI Editor:** After an AI analysis, select any highlighted text to open a toolbar and manually re-classify or re-format the AI's output, giving you full control.

### 3. Smart Navigation and Curriculum Planning
-   **Smart Linking:** The application is deeply interconnected. Click on any colored 3D element within a PE's details to instantly jump to the 3D Explorer, which will highlight that specific element and show every other PE that utilizes it (a "reverse lookup").
-   **Curriculum Bundling:** Select multiple PEs to create custom "bundles." The tool generates a summary view of all 3D elements covered by the group, aiding in cohesive unit planning.
-   **Save & Share Bundles:** Bundles can be named and saved to your browser's local storage for future retrieval. They can also be used as filters in the PE Explorer.

### 4. User Experience
-   **Interactive Guided Tour:** A built-in tutorial (powered by **Shepherd.js**) walks new users through the interface, explaining filters, views, and AI tools step-by-step.
-   **Stateful URLs:** The application's state (current view, filters, expanded items) is encoded in the URL. This allows any view to be bookmarked, shared with colleagues, or refreshed without losing your place.
-   **Data Privacy & Caching:** Your API key and saved bundles are stored in `localStorage`. Core NGSS data and AI analysis results are cached in `IndexedDB` to reduce API costs and provide a snappy experience on subsequent visits.

## Technical Specifications

-   **Architecture:** A client-side Single Page Application (SPA) built with vanilla **HTML, CSS, and JavaScript (ES Modules)**. No backend is required.
-   **AI Integration:** Uses the **Google Generative AI SDK (`@google/generative-ai`)** for all language model interactions. Supports models like `gemini-flash-latest` and `gemini-2.5-pro`.
-   **Data Source:** Fetches optimized NGSS JSON data files from an external repository on first load.
-   **Persistence:**
    -   **IndexedDB:** Caches the static NGSS dataset and the results of AI analyses to minimize network requests and API calls.
    -   **LocalStorage:** Stores user settings (API Key, selected model) and saved curriculum bundles.
-   **UI Libraries:**
    -   **Shepord.js:** Powers the interactive guided tour for new users.

## How to Use

1.  **Open `index.html`** in a modern web browser (e.g., Chrome, Firefox, Edge).
2.  **Take the Tour:** On your first visit, click the "❓" button to start the interactive tour for a quick overview of the main features.
3.  **Set API Key:** To enable the AI features, click the **"Settings"** button, enter your Google Gemini API key, and click "Save."
4.  **Explore:**
    -   Use the **PE Explorer** to filter and find standards. Click any row to expand it and see its details.
    -   Click on a blue, orange, or green element link within the details to jump to the **3D Explorer**.
    -   Use the **Matrix View** and the "Select/Refine Rows" button to create a high-level curriculum map.
5.  **Analyze and Deconstruct:**
    -   In a PE's detail view, click **"Analyze with Full Context"** to have the AI highlight the three dimensions in the description.
    -   Open the **"View Evidence Statements"** modal and click **"Deconstruct into 3D Facets"** to get a detailed breakdown of student skills.