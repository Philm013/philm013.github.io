# Plan: Comprehensive UI & Logic Alignment Fixes

## 1. Fix Mobile Navigation
- Update `InquiryOS/js/ui/navigation.js` to implement the missing mobile logic in `showStudentModule`.
- Use `scrollIntoView` or manual `scrollTop` adjustments to navigate between modules on mobile.

## 2. Desktop Layout Optimization
- Remove `max-w-*` restrictions in module renderers to allow full-bleed workspace on desktop.
- Update `InquiryOS/js/modules/overview.js`, `InquiryOS/js/modules/analysis.js`, `InquiryOS/js/teacher/dashboard.js`, and `InquiryOS/js/teacher/viewer.js`.

## 3. Align Questions Board
- Update `InquiryOS/js/modules/questions.js` to include the "Questions" (testableQuestions) category for students.
- Update `quickAddInquiry` to support the new tab.

## 4. Align Tag Language
- Standardize tag rendering in `InquiryOS/js/teacher/noticeboard.js` and `InquiryOS/js/modules/questions.js`.
- Use a helper function to resolve friendly names for SEP/CCC codes.

## 5. Fix Media Addition
- Ensure `addMediaToPhenomenon` is properly handling JSON inputs and updating the state correctly.
- Verify `updatePhenomenon` function existence and logic.

## Verification
- Test mobile navigation buttons.
- Check desktop layout on wide screens.
- Verify "Questions" tab on student board.
- Check tag labels in both student and teacher views.
- Confirm media can be added to phenomenon.
