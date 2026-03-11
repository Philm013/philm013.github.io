# Baseball Card Catalog Application Plan

## Background & Motivation
The goal is to build a robust, client-side web application for cataloging and managing a sports card collection. The app will utilize device cameras for capturing images of multiple cards at once, allow users to crop individual cards from the multi-shot, and use Gemini AI to automatically identify the cards, determine the sport, and research their value. The app will be fully responsive, taking advantage of all screen space, and will provide a native-like mobile experience.

## Scope & Impact
This will be a new standalone application within the monorepo, following the established vanilla JS, single-file (or modular HTML/CSS/JS) architecture. It will be housed in a new directory, e.g., `CardVault/`.

## Proposed Solution

### Architecture & Libraries
- **Frontend:** Vanilla HTML5, CSS3, and ES6+ JavaScript.
- **Styling:** Tailwind CSS (via CDN) using `dvh` units and safe-area-insets for a full-screen, native feel.
- **Auto-Detection:** `jsfeat` (or custom lightweight edge detection) for real-time item detection in the camera feed.
- **Data Persistence:** IndexedDB for robust local storage.
- **AI Integration:** Google Gemini API for deep identification.

### Core Modules
1. **Database (`db.js`):** 
   - Manage IndexedDB (`CardVault_DB`).
2. **Smart Capture Engine (`capture.js`):**
   - **Full-Screen UI:** Viewfinder occupies 100% of the viewport.
   - **Auto-Detection:** Uses lightweight computer vision to find quadrilaterals (cards) in the live feed and suggest bounding boxes.
   - **Haptics:** Uses `navigator.vibrate` for tactile feedback during capture.
3. **UI Engine (`ui.js`):**
   - **Native Navigation:** Bottom navigation that respects mobile safe areas.
   - **Bottom Sheets:** Gesture-friendly bottom sheets for card details, replacing standard modals.
   - **PWA Features:** Manifest and Service Worker to enable full-screen, browser-chrome-free experience.

## Phased Implementation Plan
1. **Phase 1: Project Setup & UI Shell:** Create the folder structure and basic full-screen shell.
2. **Phase 2: Database Layer:** Implement the IndexedDB wrapper.
3. **Phase 3: Smart Capture & Detection:** Implement the camera feed with real-time quadrilateral detection and multi-selection overlay.
4. **Phase 4: AI Integration:** Implement the Gemini API vision calls.
5. **Phase 5: Catalog & Analytics:** Build the collection grid and charts.
6. **Phase 6: Mobile-Native Overhaul:** Implement Bottom Sheets, haptics, and PWA manifest for a premium mobile feel.

## Verification & Testing
- **Cross-Platform:** Ensure the full-screen layout and camera access work on Android/iOS.
- **Performance:** Verify that real-time detection doesn't lag the UI on older mobile devices.
- **Data Integrity:** Verify export/import functionality.