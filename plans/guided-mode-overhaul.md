# Plan: Guided Mode & Model Feedback Overhaul

## 1. Guided Mode (Activity Dashboard) Overhaul
- **File**: `InquiryOS/js/teacher/dashboard.js`
- **Change**: Update `renderActivityDashboard` to provide a "Class Command Center" layout.
- **Features**:
    - Focus on the `forceModule` with large metrics (e.g., "24 Wonders added by 12 students").
    - Add a "Live Engagement" bar for the whole class.
    - Improved grid of student monitor cards with status indicators (Online/Away).
    - Quick-access "Guided Control" buttons to move the class forward or backward.

## 2. Model Feedback Tool Overhaul
- **File**: `InquiryOS/js/teacher/viewer.js`
- **Change**: Enhance the student model viewer for teachers.
- **Features**:
    - **Visibility**: Ensure `modelNotes` and `modelStickers` from students are rendered clearly.
    - **Interactive Toolbar**: New palette with quick-select stickers (⭐, ✅, ❓, 💡, 🎯, 👏, 🧠, 🔬, 🧪).
    - **Placement**: Improve click-to-place logic for comments and stickers.
    - **Student Notes**: Add a "Notes Feed" side panel or toggle to read all student node/shape descriptions at once.

## 3. Mobile Navigation & UI Fixes
- **File**: `InquiryOS/css/style.css`
- **Change**: Add missing `.readonly-overlay` styles and fix z-index for mobile menus.
- **Change**: Ensure `pointer-events` are correctly handled so buttons remain clickable.
- **File**: `InquiryOS/js/ui/navigation.js`
- **Change**: Clean up duplicate `updateSwipeDots` logic and ensure sidebar toggle is robust.

## 4. Alignment & Friendly Language
- **File**: `InquiryOS/js/teacher/noticeboard.js`
- **Change**: Ensure tags use the same "friendly" resolution logic as the student board.
- **File**: `InquiryOS/js/core/tips_library.js`
- **Change**: Expose resolution helpers globally.

## Verification
- Verify Guided Mode dashboard shows real-time class metrics.
- Verify Teacher Viewer renders student notes and allows sticker placement.
- Test mobile sidebar and bottom nav buttons.
- Confirm tag language is consistent between student and teacher views.
