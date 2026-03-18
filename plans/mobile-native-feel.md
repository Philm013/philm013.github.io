# Plan: Native Mobile Feel for KnowledgeMapper

This plan aims to refine the mobile user interface and interaction patterns to provide a "fully native application" experience on small screens.

## Objective
Enhance KnowledgeMapper's mobile UX with iOS/Android-inspired "sheets", safe area support, haptic feedback, and optimized touch interactions.

## Key Files & Context
- `KnowledgeMapper/index.html`: UI structure for panel handles.
- `KnowledgeMapper/style.css`: Mobile styling (safe areas, sheets, active states).
- `KnowledgeMapper/js/main.js`: Global haptic feedback logic.

## Implementation Steps

### 1. HTML Enhancements (index.html)
- Add a `<div class="panel-drawer-handle"></div>` inside `#ai-panel` and `#node-detail-panel` to provide a visual cue for the "sheet" metaphor.

### 2. CSS Refinements (style.css)
- **Global:**
    - Set `overscroll-behavior: none;` on `body` to prevent browser-native pull-to-refresh when interacting with the graph.
- **Safe Areas:**
    - Update `#toolbar` and `#landing-page` to use `padding-bottom: env(safe-area-inset-bottom);`.
- **Mobile Sheets (Side Panels):**
    - Redesign `.side-panel` on mobile to slide up from the bottom like a standard mobile bottom sheet.
    - Add padding to the bottom of `.ai-input-area` and `.editable-content` to clear the device's home indicator.
    - Style the `.panel-drawer-handle` (centered pill-shaped bar).
- **Touch Optimization:**
    - Add clear `:active` states for all buttons (e.g., subtle scale down or opacity change).
    - Increase minimum touch targets where necessary.
    - Improve `.side-panel-header` padding for easier closing.

### 3. Haptic Feedback (js/main.js)
- Implement a global event listener to trigger a short vibration (`vibrate(10)`) on clicks/taps for interactive elements (`.tool-button`, `.primary-button`, `.secondary-button`, `.context-menu-item`).

### 4. Interactive Feel
- Ensure the progress stepper on mobile is legible and touchable.
- Refine the "Select Mode" toggle behavior to be more visually prominent on mobile.

## Verification & Testing
- Use Chrome DevTools (Mobile emulation) and real device testing (if possible).
- Verify toolbar doesn't overlap with the iPhone home indicator.
- Confirm side panels (sheets) feel responsive and "native".
- Verify haptic pulses on all major interaction points.
