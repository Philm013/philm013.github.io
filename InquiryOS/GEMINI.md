# InquiryOS - NGSS Platform

## Project Overview
InquiryOS is a comprehensive, client-side web application designed to support Science & Engineering Practices as defined by the Next Generation Science Standards (NGSS). It provides a collaborative environment for students to document their scientific inquiries—from initial observations and questions to modeling, data analysis, and argumentation.

### Key Technologies
- **Frontend:** Vanilla HTML/CSS/JavaScript.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (via CDN).
- **Data Visualization:** [Chart.js](https://www.chartjs.org/).
- **Icons:** [Iconify](https://iconify.design/).
- **Persistence:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) for local storage and session management.

## Architecture
The project is currently a single-page application (SPA) contained within `index.html`. It uses a global `App` state object to manage the application's lifecycle, user roles (Student vs. Teacher), and inquiry data.

### Key Modules
1. **Questions (SEP1):** Collecting "Notices" and "Wonders" to form driving questions.
2. **Models (SEP2):** An interactive node-based canvas for developing and using scientific models.
3. **Investigation (SEP3):** Defining variables and procedure steps.
4. **Analysis (SEP4):** Data entry via tables and visualization using Chart.js.
5. **Math (SEP5):** Computational thinking and mathematical expressions.
6. **Explanations (SEP6):** Constructing explanations using the Claim-Evidence-Reasoning (CER) framework.
7. **Argument (SEP7):** Engaging in argument from evidence via a collaborative board.
8. **Communication (SEP8):** Summarizing and sharing findings.
9. **Teacher Dashboard:** Allows teachers to moderate content, control module access, and monitor student progress in real-time.

## Building and Running
As a static web application, InquiryOS does not require a build step.

- **Development/Running:** Open `index.html` directly in any modern web browser.
- **Deployment:** The project is designed for hosting on static site providers like GitHub Pages.

## Development Conventions
- **Single-File Pattern:** Currently, all HTML, CSS, and JS reside in `index.html`. For future scaling, consider modularizing into separate `.js` and `.css` files.
- **State Management:** All application state is centralized in the `App` object. Use `saveToStorage()` and `saveAndBroadcast()` to persist changes.
- **Styling:** Adhere to Tailwind CSS utility classes. Avoid adding custom CSS unless necessary for complex interactive components (like the model canvas).
- **Icons:** Use Iconify placeholders or the dynamic `iconify` script for all UI icons.

## Data Management
- **Local Persistence:** All data is saved to the user's browser using IndexedDB (database `InquiryOS_DB`).
- **Session Sharing:** Users can export their work as JSON files and import them later, facilitating portability and sharing.
