# CoinVault - Numismatic Cataloging Application Plan

## Background & Motivation
CoinVault is a specialized application for cataloging and managing a coin and currency collection. The app will utilize device cameras for capturing images of multiple items at once, provide real-time auto-detection of coins (circles), and use Gemini AI for identification, grading assistance, and value estimation. It will offer a native-like mobile experience, fully utilizing all screen space.

## Scope & Impact
This will be a new standalone application within the monorepo, following the established vanilla JS architecture in the `CoinVault/` directory.

## Proposed Solution

### Architecture & Libraries
- **Frontend:** Vanilla HTML5, CSS3, and ES6+ JavaScript.
- **Styling:** Tailwind CSS (via CDN) with `dvh` units and safe-area-insets.
- **Auto-Detection:** Lightweight circle-detection algorithm (Hough-like or simple contour circularity) for live viewfinder feedback.
- **Data Persistence:** IndexedDB (`CoinVault_DB`).
- **AI Integration:** Gemini Vision for identification and market research.

### Core Modules
1. **Database (`db.js`):** 
   - Manage IndexedDB.
2. **Smart Capture Engine (`capture.js`):**
   - **Full-Screen UI:** Camera view occupies the entire screen.
   - **Auto-Detection:** Real-time identification of circular objects (coins) in the viewfinder.
   - **Haptics:** Tactile confirmation on capture events.
3. **UI Engine (`ui.js`):**
   - **Native Navigation:** Bottom nav that respects device safe areas.
   - **Bottom Sheets:** Swipe-able bottom sheets for item details.
   - **PWA Support:** Full-screen experience via manifest and Service Worker.

## Phased Implementation Plan
1. **Phase 1: Project Setup:** Initialize the folder structure and full-screen shell.
2. **Phase 2: Database & numismatic Model:** Define the `CoinVault_DB` schema and the numismatic AI prompt.
3. **Phase 3: Smart UI & Capture:** Implement the full-screen capture view with real-time circle detection.
4. **Phase 4: AI & Item Management:** Wire up the AI identification and metadata storage.
5. **Phase 5: Analytics & Data Management:** Build the dashboard and export/import functionality.
6. **Phase 6: Mobile Overhaul:** Implement Bottom Sheets, haptics, and PWA manifest.

## Verification & Testing
- **AI Accuracy:** Test with various world coins to ensure correct identification.
- **Detection Performance:** Ensure circle detection is smooth on mid-range mobile devices.
- **Full-Screen Layout:** Verify UI integrity across different notch/hole-punch screen designs.