# Plan: KnowledgeMapper UI/UX Overhaul

This plan outlines the "Complete UI/UX Overhaul" for KnowledgeMapper to create a phase-based research experience for students.

## Objective
Transform KnowledgeMapper into a comprehensive, student-centric research tool with distinct experiences for each phase of the research process (Exploration to Review).

## Key Files & Context
- `index.html`: Main UI structure and landing page.
- `style.css`: Global styles and mobile-first responsive rules.
- `js/main.js`: Main application logic and event handling.
- `js/ui.js`: UI element references and utility functions.
- `js/api.js`: AI Coach logic and tool definitions.

## Proposed Solution

### 1. Enhanced Dashboard (Landing Page)
- **Project Cards:** Update map list items to show project stats (number of sources, notecards, current phase).
- **Phase Indicators:** Visual tag for each project showing its current research step.
- **Improved Empty State:** Better guidance for new users on how to start their first journey.

### 2. Phase-Based Workspace Experience
Update the UI to dynamically respond to the current `researchStep`:
- **Step 1 (Exploration):** Canvas background update, emphasis on "Brainstorming" tools.
- **Step 2 (Questioning):** Highlight the "Driving Question" HUD.
- **Step 3 (Planning):** Automatically expand the "Outline" sidebar.
- **Step 4 (Gathering):** Automatically expand the "Sources" sidebar and highlight source-linking tools.
- **Step 5 (Synthesis):** Highlight "Strategy Bar" actions (Synthesize, Group).
- **Step 6 (Review):** Show "Export" options prominently and a "Final Checklist".

### 3. Integrated AI Research Coach
- **Coach Companion:** Redesign the Coach HUD to feel more like a persistent companion.
- **Phase Goals:** Add a small "Current Goal" indicator next to the coach's message.
- **Socratic Chips:** Refine the styling of suggestion chips for better clarity and touch targets.

### 4. Visual & Structural Polish
- **Typography:** Refine font weights and sizes for better hierarchy. Use Lora (serif) for "Direct Quotes" and Inter (sans) for logic.
- **Consistent Radii:** Standardize on `rounded-2xl` for components and `rounded-[2.5rem]` for main panels.
- **Color Palette:** Ensure all "Phase" colors match the `student` theme defined in `tailwind.config`.
- **Accessibility (WCAG AA):**
    - Improve contrast on slate backgrounds.
    - Add missing `aria-label` attributes.
    - Ensure all interactive elements have visible focus rings.

### 5. Mobile Native Feel
- **Hybrid Scrolling:** Refine the snapping points between Source, Canvas, and Outline.
- **Bottom Navigation:** Update icons and labels for better clarity.

## Implementation Steps

### Phase 1: Dashboard & Foundation
1.  **Update `style.css`:** Standardize component classes and add phase-specific color variables.
2.  **Refine `index.html` (Landing):** Update the project list template to include stats and phase badges.
3.  **Update `js/storage.js`:** Ensure project stats (node count, source count) are calculated and stored.

### Phase 2: Workspace & Coach HUD
1.  **Update `index.html` (Workspace):** Add phase-specific containers and "Phase Goal" HUD elements.
2.  **Refine Coach HUD:** Update the dialogue area and input container for a more "companion" feel.
3.  **Update `js/ui.js`:** Add references for new UI elements.

### Phase 3: Phase Transitions & Logic
1.  **Update `js/main.js`:** Implement logic to toggle UI elements based on `researchStep`.
2.  **Update `js/api.js`:** Refine the Socratic prompt to include phase-specific goals.
3.  **Improve Effects:** Enhance the `Effects.celebratePhase()` with more targeted visual feedback.

### Phase 4: Accessibility & Polish
1.  **Audit & Fix Contrast:** Ensure all text/background pairs meet 4.5:1 ratio.
2.  **Add ARIA Labels:** Systematic pass through `index.html`.
3.  **Testing:** Verify on desktop and mobile browsers.

## Verification & Testing
- **Phase Navigation:** Ensure the stepper correctly updates the UI and coach guidance.
- **AI Tools:** Verify `spawn_notecards` and `google_search` tools work seamlessly.
- **Responsive Design:** Test the hybrid scroll-snapping on mobile devices.
- **Linting:** Run `npm run lint` to ensure code quality.
