# InquiryOS Modularization Summary & Implementation Plan

## 1. Accomplished Steps
- **Project Structure Created:** Established `js/core`, `js/ui`, `js/modules`, and `js/teacher` directories.
- **Core Layer Extracted:**
    - `js/core/state.js`: Centralized application state and initial data structures.
    - `js/core/storage.js`: Robust IndexedDB wrapper for local persistence.
    - `js/core/sync.js`: Polling and synchronization logic for multi-user collaboration.
    - `js/core/ngss.js`: Logic for external standards data management.
- **UI & Utilities Extracted:**
    - `js/ui/utils.js`: Toast system, clipboard helpers, and progress calculations.
    - `js/ui/navigation.js`: Sidebar routing and practice module switching.
    - `js/ui/renderer.js`: Main view-port management and module-specific rendering hooks.
- **Practice Modules Started:**
    - `js/modules/questions.js`: Fully documented and extracted SEP1 logic.
- **Main Entry Point:**
    - `js/main.js`: Boots the application and bridges modular exports to global HTML event handlers.

## 2. Documentation Standard Applied
All extracted functions use JSDoc syntax:
```javascript
/**
 * @param {string} moduleId - The practice module to activate.
 */
export function showStudentModule(moduleId) { ... }
```

## 3. Remaining Modularization Tasks

### Immediate Next Steps (Science Practices)
1. **Models Module (`js/modules/models.js`):** Move the complex canvas interaction logic (drag/drop, connections, SVG paths).
2. **Investigation Module (`js/modules/investigation.js`):** Extract the data table and variable bank logic.
3. **Analysis Module (`js/modules/analysis.js`):** Move Chart.js initialization and data processing.
4. **Remaining Practices:** Move Math, CER, Argument, and Communication modules to their respective files in `js/modules/`.

### Teacher Tools Layer
1. **Teacher Core (`js/teacher/dashboard.js`):** Extract overview tiles and activity monitoring.
2. **Lesson Designer (`js/teacher/lessons.js`):** Manage presets and curation of icons/emojis.
3. **Classroom Controls (`js/teacher/access.js`):** Locking/unlocking modules and guided lesson controls.
4. **Live Viewer (`js/teacher/viewer.js`):** Specialized logic for teacher feedback (comments/stickers) on student models.

## 4. Final Integration Step
Once all modules are extracted, the final step is to update `InquiryOS/index.html`:
1.  **Remove** the `<script>` block containing ~8000 lines of code.
2.  **Add** `<script type="module" src="js/main.js"></script>`.
3.  **Audit** all `onclick` handlers to ensure they match the properties attached to `window` in `main.js`.

## 5. Maintenance Guidelines
- New science practices should be added as a new file in `js/modules/`.
- All data modifications must go through `saveAndBroadcast` in `js/core/sync.js` to ensure persistence.
- UI components should favor the centralized `toast` and `renderModuleHeader` helpers for consistency.
