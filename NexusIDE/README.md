# NexusIDE

NexusIDE is a simple, browser-based development environment designed for managing small projects, journals, or blogs with interactive elements and CRUD capabilities.

## Objective

To provide a lightweight platform for documenting ideas and managing small datasets (like item lists) directly in the browser.

## Features

- **Blog/Journal Interface:** A clean, Tailwind CSS-powered landing page for content.
- **Item Management (CRUD):** Add, remove, edit, and track items in a list.
- **Interactive UI:** Reusable UI components managed via JSON.
- **Tailwind CSS Integration:** Modern styling using the Tailwind CDN.

## Technical Details

- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript.
- **Storage:** Designed to support either LocalStorage for browser-only use or Node.js `fs` for local server environments.
- **Component System:** Reusable UI blocks defined in `user_ui_blocks.json`.

## Getting Started

1. Open `index.html` in any modern web browser to view the main interface.
2. For CRUD functionality, ensure the environment supports the storage mechanism defined in `main.js`.

## Future Improvements

- Resolve dependencies in `main.js` to ensure full browser compatibility using LocalStorage.
- Further integrate the UI blocks from `user_ui_blocks.json` into the main application flow.
