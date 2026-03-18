# Plan: KnowledgeMapper Styling & Layout Refresh

This plan aims to modernize the KnowledgeMapper UI, fix the side panels, and add labels/better icons to the bottom toolbar.

## Objective
Create a sleek, modern, and consistent feel for the KnowledgeMapper tool by redesigning the toolbar and side panels.

## Key Files & Context
- `KnowledgeMapper/index.html`: Main HTML structure for the modular version.
- `KnowledgeMapper/style.css`: Primary stylesheet.
- `KnowledgeMapper/js/ui.js`: (Optional) If HTML changes require JS reference updates.

## Proposed Changes

### 1. HTML (index.html)
- Add labels to each `tool-button` in the `#toolbar`.
- Update each button to follow this structure:
  ```html
  <button class="tool-button" id="homeBtn" title="Back to My Maps">
      <span class="iconify" data-icon="solar:home-2-bold-duotone"></span>
      <span class="label">Home</span>
  </button>
  ```
- Repeat for all 10 buttons.

### 2. CSS (style.css)
- **Root Variables:** Refine colors for a more cohesive theme.
- **Toolbar:**
  - Redesign `#toolbar` to be a sleek, glassmorphic bar.
  - Set `height: auto;` with `padding: 10px 16px;`.
  - Use `gap: 12px;` between buttons.
  - Style `.tool-button` to have `flex-direction: column;` and `height: auto; width: auto; min-width: 64px;`.
  - Add styles for `.tool-button .label`: `font-size: 10px; font-weight: 600; margin-top: 4px; color: var(--text-secondary);`.
  - On hover, change label color to `var(--text-primary)`.
- **Side Panels:**
  - Update `.side-panel` to:
    - `top: 20px; bottom: 20px;` (Full height for better utility).
    - `width: 380px;`.
    - `background: rgba(30, 41, 59, 0.9); backdrop-filter: blur(12px);`.
    - `border-radius: 20px;`.
  - Refine `.side-panel-header` and `.side-panel-content`.
- **Media Queries (Mobile):**
  - In `@media (max-width: 768px)`:
    - Hide `.tool-button .label` to save space.
    - Keep toolbar as a floating dock or dock it to bottom edges.
    - Side panels: `top: 15%; bottom: 0;` and full width.

### 3. Verification & Testing
- Open `KnowledgeMapper/index.html`.
- Test all buttons.
- Check AI Assistant and Node Details panels.
- Verify responsiveness.
- Run `npm run lint`.
