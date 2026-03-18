# Plan: Fix Media Picker Scrolling and Sim Thumbnails

The goal is to fix two issues in the InquiryOS Media Picker:
1.  **Scrolling:** Users can't scroll to see more results on desktop because the initial batch is too small to trigger scrolling.
2.  **Thumbnails:** Simulation thumbnails show a generic Concord icon because of an outdated domain-fix logic and some missing/broken URLs.

## Changes

### 1. Core Logic (`InquiryOS/js/core/sims.js`)
-   Update `sanitizeThumbUrl` to stop replacing `screenshots.lab.concord.org` with `lab.concord.org/screenshots`. The original domain is now standard and supports HTTPS.
-   Just ensure HTTPS for all thumbnail URLs.

### 2. UI Logic (`InquiryOS/js/ui/media.js`)
-   Increase `RESULTS_BATCH_SIZE` from 12 to 24 to better fill high-resolution screens.
-   Add `checkAndLoadMore()` function that detects if the results container is full enough to scroll.
-   Call `checkAndLoadMore()` after initial render and subsequent batch loads.
-   Ensure the `onscroll` event is properly attached and triggers additional loading.

### 3. Layout (`InquiryOS/index.html`)
-   Add `min-h-0` to `mediaResults` to ensure it respects the flex parent and allows internal scrolling.

## Verification
-   **Scrolling:** Open the Media Picker on desktop, search for "energy" or "cells", and verify that more results load as you scroll down.
-   **Thumbnails:** Verify that Concord simulations show their actual thumbnails (like the DNA-to-protein one) instead of the generic logo or favicon.
-   **Responsive:** Ensure the Media Picker still works correctly on mobile devices.
