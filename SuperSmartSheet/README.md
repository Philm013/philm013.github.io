# SuperSmartSheet

SuperSmartSheet is an advanced, high-performance, client-side web application designed to provide a fast and powerful spreadsheet-like interface for Smartsheet. It acts as an offline-first front-end, enabling users to load an entire sheet, make extensive edits, and then synchronize all changes back to the Smartsheet server in a single, intelligent batch.

The application addresses common Smartsheet pain points by providing instant editing, reordering, and hierarchy manipulation without the latency of constant API calls.

## Key Features

### 1. High-Performance Spreadsheet UI
- **Offline-First Editing:** The entire sheet is loaded into the browser's memory, allowing for instantaneous cell edits, row creation, and hierarchy changes.
- **Hierarchical Data:** Natively supports Smartsheet's parent-child row relationships. Users can collapse, expand, indent, and outdent rows to restructure the sheet.
- **Drag-and-Drop Reordering:** Intuitively re-order rows and change their hierarchy using a smooth drag-and-drop interface, powered by SortableJS.
- **Customizable View:**
    - **Column Selection:** A setup modal gives you full control over which columns are visible.
    - **Row Filtering:** Select a subset of rows to work with for a focused view.
    - **Resizable Columns:** Adjust column widths to fit your content and screen real-estate.

### 2. Intelligent Synchronization
- **Batch Updates:** All local modifications (new rows, deleted rows, cell edits, and hierarchy changes) are tracked. Clicking "Sync" sends all changes to the Smartsheet API in an efficient, batched request.
- **Change Highlighting:** The UI provides clear visual cues for all local modifications, highlighting new, modified, and deleted rows in different colors.
- **Auto-Sync & Conflict Resolution:**
    - An optional auto-sync feature periodically checks the server for remote updates.
    - If another user has changed a row that you are also editing locally, a **Conflict Resolution** modal appears.
    - For each conflict, you are presented with "theirs" vs. "yours" and can choose which version to keep, ensuring no data is accidentally overwritten.

### 3. Advanced Editing & Data Handling
- **Rich Cell Editing:** The interface supports various Smartsheet column types, including text, checkboxes, and multi-select dropdowns (via a custom popover).
- **Row Actions:** Quickly add new rows above or below an existing row, delete rows, and manage their indentation level.
- **Data Export:** Export your sheet data to various formats, including JSON (for backup), static HTML, or a styled `.xlsx` file for use in Excel or Google Sheets.

## Technical Stack & Architecture

- **Architecture:** A Single Page Application (SPA) built entirely with vanilla **HTML, CSS, and JavaScript**. It communicates directly with the Smartsheet API via a CORS proxy.
- **Styling:** The UI is built using **Bootstrap 5** for its layout and modal system, augmented with a significant amount of custom CSS to create the spreadsheet grid and interactive elements.
- **Core Libraries:**
    - **SortableJS:** Provides the robust drag-and-drop functionality for row reordering.
    - **`xlsx-js-style`:** Enables the generation of styled Microsoft Excel (`.xlsx`) files.
- **API Communication:**
    - Interacts with the **Smartsheet API v2.0**.
    - Uses a public CORS proxy (`cors-anywhere`) to manage cross-origin API requests from the browser. The application includes logic to prompt the user to authorize the proxy if needed.
- **Persistence:**
    - All sheet data is held in-memory for the duration of an editing session.
    - `localStorage` is used to persist the user's Smartsheet API token and a "library" of recently accessed sheets for quick access.

## How to Use

1.  **Open `index.html`** in a modern web browser.
2.  **Enter API Token:** On first use, click the "Settings" icon and enter your Smartsheet API Access Token. This is saved in your browser's `localStorage`.
3.  **Load a Sheet:** Paste the ID of the Smartsheet you wish to edit into the input field on the dashboard and click **"Open"**.
4.  **Configure Your View:** A setup modal will appear, allowing you to select which rows and columns you want to work with. Make your selections and click **"Apply & Load"**.
5.  **Edit Offline:** Make any desired changes to the sheet. The UI will respond instantly. Add, delete, edit, and re-organize rows as needed.
6.  **Synchronize Changes:** When you are ready to save your work, click the **"Sync"** button. The application will push all your tracked changes to the Smartsheet server. If you wish to abandon your changes, click **"Discard"**.
