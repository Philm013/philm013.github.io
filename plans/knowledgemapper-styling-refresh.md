# KnowledgeMapper Style and UX Overhaul Plan

## Objective
Transform KnowledgeMapper into a highly polished, professional student research assistant tool. This overhaul will fix current interactivity issues on desktop and provide a cohesive, modern aesthetic centered around the academic research workflow.

## Key Changes

### 1. Unified Academic Theme
- **Color Palette:** Soft parchment whites (`#fdfdf7`), deep academic blues (`#1e3a8a`), and accented teals (`#0d9488`).
- **Typography:** Refined use of 'Inter' with better weight distribution and readability.
- **Card Aesthetic:** Redesign D3 nodes to look like physical "Notecards" with a colored top border and clean interior space.

### 2. Desktop Workspace Layout
- **Grid Layout:** Move from floating panels to a structured 3-column desktop layout.
    - **Left Sidebar (300px):** Collapsible. Houses the "Research Navigator" (Steps 1-6), "Bibliography", and "Outline".
    - **Main Center:** The graph canvas, filling the remaining space.
    - **Right Sidebar (350px):** Collapsible. Dedicated space for the AI Coach.
- **Sticky Header:** Ensure the project header is fixed at the top with a clear z-index.
- **Auto-Resize:** Update D3 simulation to respond to sidebar toggle events to keep the graph centered.

### 3. Core Interactivity Fixes
- **Positioning Fix:** Set `app-header` to `position: sticky` and ensure `graph-container` uses `flex-grow` instead of `position: fixed` where possible to avoid layering bugs.
- **Node Click Robustness:** Fix click event propagation in `js/main.js` and `js/graph.js` to ensure node details open reliably.
- **Double-Tap Shortcut:** Polish the mobile double-tap to create a new node and add a desktop equivalent (e.g., double-click canvas).

### 4. Component Overhauls
- **Bibliography:** Redesign the sources list with icons for different media types (PDF, Web, Book).
- **AI Coach:** Improve chat bubbles with better padding, distinct user/model styles, and cleaner "Socratic Chip" suggestions.
- **Research Stepper:** A more visual progress bar that acts as the primary navigation for the student's journey.

## Implementation Steps

### Phase 1: Structural Setup
1. Update `index.html` to use a more structured layout (header + flex-main).
2. Refactor `style.css` with the new color variables and grid/flex layout for sidebars.
3. Update `js/ui.js` to include new element references for sidebar toggles.

### Phase 2: Visual Overhaul
1. Apply the "Academic Explorer" theme to all components.
2. Redesign the D3 node rendering in `js/graph.js` to use the "Notecard" style.
3. Polish transitions and hover states for all interactive elements.

### Phase 3: UX & Interactivity
1. Fix the desktop "nothing happens" bug by ensuring event listeners are correctly attached to the positioned elements.
2. Implement sidebar toggle logic in `js/main.js`.
3. Add a "Center View" button to quickly reset the graph view.

### Phase 4: Final Polish & Validation
1. Run `npm run lint` and fix any issues.
2. Verify all 6 research steps work correctly with the Coach.
3. Test responsiveness on mobile and tablet.

## Verification & Testing
- **Visual Check:** UI matches the "Academic Explorer" theme.
- **Interaction Check:** Clicking nodes consistently opens details; sidebars toggle smoothly.
- **Functional Check:** AI Coach tools (updating steps, adding nodes) work correctly within the new layout.
- **Linter:** `npm run lint` passes without errors.
