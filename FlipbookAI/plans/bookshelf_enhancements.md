# Objective
Enhance the Bookshelf with drag-and-drop functionality, an operations ("...") menu, full CRUD capabilities (including renaming), and improved accessibility.

# Key Files & Context
- **`db.js`**: Manage PDF and collection persistence in IndexedDB.
- **`index.html`**: Structure for the bookshelf and operations menu.
- **`fbAI_script.js`**: Core logic for rendering, event handling, drag-and-drop, and AI features.
- **`fbai_dark.css` / `fbai_light.css`**: Styling for the new UI elements and interaction states.

# Implementation Steps

## 1. Database Enhancements (`db.js`)
- Add `updatePdf(id, updates)` to allow changing properties like `name`.
- Ensure `updateCollection` is robust enough for moving PDFs between them.

## 2. UI & Style Updates
- **`index.html`**:
    - Update the item template in `fbAI_script.js` (inside `renderPdfList` and `populateBookshelf`) to include a "..." button.
    - Ensure the `pdf-context-menu` is styled and positioned correctly for both right-click and button click.
- **`fbai_dark.css`**:
    - Add styles for `.dragging` and `.drag-over` states.
    - Style the `.more-options` button and ensure it fits well in the list item.
    - Improve visibility and contrast for accessibility.

## 3. Drag-and-Drop Logic (`fbAI_script.js`)
- Implement `handleDragStart(e)`: Store the PDF ID in `dataTransfer`.
- Implement `handleDragOver(e)` and `handleDragLeave(e)`: Add/remove `.drag-over` class on collection items.
- Implement `handleDrop(e)`: Identify the target collection, update the DB using `db.movePdfToCollection`, and refresh the UI.

## 4. Operations Menu & CRUD (`fbAI_script.js`)
- Update `showPdfContextMenu` to accept an element for positioning (for the "..." button).
- Add "Rename" option to the menu.
- Implement `renamePdf(id)` and `renameCollection(id)`: Use a prompt to get the new name and update the DB.
- Ensure all CRUD actions (Create, Read, Update, Delete) are fully functional for both PDFs and Collections.

## 5. Accessibility & Hints
- Add ARIA roles and labels to the bookshelf lists and items.
- Provide visual "hints" during dragging (e.g., change cursor, highlight valid drop targets).
- Ensure the operations menu is keyboard accessible.

# Verification & Testing
- **Drag-and-Drop**: Drag a PDF from "All PDFs" or a specific collection and drop it onto another collection. Verify it moves in the database and UI.
- **CRUD Operations**:
    - Create: Upload a new PDF, create a new collection.
    - Read: List PDFs and collections, open a PDF.
    - Update: Rename a PDF, rename a collection, move a PDF to a collection.
    - Delete: Delete a PDF, delete a collection (verify PDFs remain in "All PDFs").
- **Accessibility**: Verify the bookshelf can be navigated via keyboard and that dragging states are visually distinct.
- **Linter**: Run `npm run lint` to ensure no syntax errors or style regressions.
