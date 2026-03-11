# Fix 404 Errors for CardVault and CoinVault

## Objective
Address the 404 errors for `js/app.js` and `manifest.json` that occur when the applications are accessed without a trailing slash (e.g., `http://localhost:3000/CardVault`). Also fix the missing source map warning for Chart.js.

## Key Files
- `/CardVault/index.html`
- `/CoinVault/index.html`

## Implementation Steps
1. **Trailing Slash Redirect:** Add a lightweight inline `<script>` at the very top of `<head>` in both `index.html` files. This script will detect if the URL pathname lacks a trailing slash (and doesn't end in `.html`) and automatically redirect the browser to append the slash. This ensures that relative asset paths (`js/app.js`, `manifest.json`) resolve correctly against the folder rather than the server root.
2. **Chart.js CDN Link:** Update the CDN link for Chart.js to point to a specific, stable version with its source map intact (`https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`) to prevent DevTools warnings.

## Verification
- Accessing `localhost:3000/CardVault` will auto-redirect to `localhost:3000/CardVault/`.
- All assets will load with 200 OK statuses.
- The Chart.js source map warning will disappear from the console.