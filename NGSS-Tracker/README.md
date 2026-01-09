# NGSS 3D Progression Planner & Tracker

The NGSS 3D Progression Planner is a comprehensive, browser-based tool for educators and curriculum designers to create, map, and analyze science curricula against the Next Generation Science Standards (NGSS). It provides a powerful, spreadsheet-like interface to track the introduction, development, and assessment of the three dimensions of the NGSS (SEPs, DCIs, and CCCs) across an entire course.

Built as a completely client-side application, all your planner data is stored locally in your browser, ensuring privacy and offline access after the initial data load.

## Key Features

### 1. Robust Curriculum Planning
-   **Planner Management:** Create and manage multiple, distinct curriculum planners. Each planner is defined by a title, course, and grade band (K-2, 3-5, 6-8, 9-12).
-   **Hierarchical Structure:** Organize your curriculum into "Lesson Sets" (units) and individual "Lessons."
-   **Interactive Table:** Add, delete, rename, and reorder lessons and sets with intuitive drag-and-drop functionality. Collapse lesson sets to easily manage large planners.
-   **Undo/Redo:** Easily revert and re-apply changes made to your planner.

### 2. 3D Element & PE Tracking
-   **Visual Mapping:** The core of the tool is a dynamic table where each lesson (row) can be mapped against every NGSS 3D element and assigned Performance Expectation (PE) (columns).
-   **Status Tracking:** For any lesson, mark a specific 3D element as **I** (Introduced), **D** (Developed), or **A** (Assessed) using a simple popover interface.
-   **Assessment Scope:** Designate lessons as having a **F**ormative or **S**ummative assessment scope.
-   **PE Integration:** Assign specific PEs to your planner. The planner automatically highlights the 3D elements that are bundled within your chosen PEs, providing a clear visual guide for alignment.

### 3. Analytics and Visualization
-   **Progression Storyline:** A dedicated view that visualizes your curriculum's flow. See the progression of each 3D element across all lessons, or view the bundle of elements covered in each individual lesson.
-   **Summary Dashboard:** Get a high-level overview of your planner with interactive charts (powered by Chart.js) that visualize:
    -   The distribution of "Introduced," "Developed," and "Assessed" statuses.
    -   The balance of usage between SEPs, DCIs, and CCCs.
    -   The breakdown of Formative vs. Summative assessment scopes.
-   **Element Coverage Report:** A detailed, filterable report that shows the coverage status of every single 3D element across your entire planner.

### 4. Usability and Data Portability
-   **Interactive Tour:** An integrated guided tour (using Shepherd.js) walks new users through the core features of the application.
-   **Import & Export:**
    -   **Export:** Save your planners in multiple formats: **JSON** (for backup and sharing), **HTML** (for a static, printable view), or **XLSX** (for Excel/Google Sheets).
    -   **Import:** Load a planner from a previously exported JSON file.
-   **Data Caching:** The core NGSS dataset is fetched once and then cached in IndexedDB, making subsequent loads nearly instantaneous.

## Technical Stack & Architecture

-   **Architecture:** A client-side Single Page Application (SPA) built with vanilla **HTML and JavaScript (ES Modules)**.
-   **Styling:** **Tailwind CSS** is used for the modern, utility-first UI design. The application supports both light and dark modes.
-   **Data Handling:**
    -   The application fetches pre-processed NGSS data from external JSON files.
    -   **IndexedDB** is used to cache this large dataset for performance.
    -   **LocalStorage** is used to save all user-created planners and program data.
-   **Core Libraries:**
    -   **Chart.js:** Renders all charts in the Summary and Analytics views.
    -   **Shepherd.js:** Powers the interactive guided tour.
    -   **`xlsx-js-style`:** Enables the export of styled Excel (.xlsx) files.

## How to Use

1.  **Open `index.html`** in a modern web browser.
2.  **Create a Planner:** From the "Planner Navigator" sidebar, click **"+ New Planner"**. Fill in the details for your course, including a title and the appropriate grade band.
3.  **Build Your Structure:** In the main planner view, use the `+ Set` and `+ Lesson` buttons to build the outline of your curriculum. Drag and drop rows to reorder them.
4.  **Assign PEs:** Click the "PEs" button to open a modal and select the Performance Expectations that your unit will target.
5.  **Track 3D Elements:** Click on any cell in the grid to open a popover. In the popover, select the specific 3D elements you are addressing in that lesson and mark their status (Introduced, Developed, or Assessed).
6.  **Analyze Your Plan:** Use the **"Summary"** and **"Progression"** buttons in the navigator to view analytics and visualize the storyline of your curriculum.
7.  **Save & Export:** Your work is saved automatically to your browser. Use the **"Export"** button to download your planner in various formats.
