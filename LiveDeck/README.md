# LiveDeck

A high-performance, Markdown-backed presentation creator and player designed for education.

## Features
- **Markdown-First**: Write slides using simple Markdown syntax. Use `---` as a separator.
- **Interactive Components**:
    - Polls: `:::poll [Question] [Option1, Option2]:::`
    - Quizzes: `:::quiz [Question] [Option1, Option2] [CorrectIndex]:::`
- **Collaborative Live Sessions**: Integrated PeerJS for real-time slide syncing and live reactions.
- **Spatial Mode**: Prezi-style zooming and panning transitions between slides.
- **Standalone Export**: Export your presentation as a single, portable HTML file with all dependencies included.
- **PWA & Mobile Ready**: Full offline support and touch-optimized gestures.

## Built With
- Vanilla JavaScript / HTML / CSS
- [Tailwind CSS](https://tailwindcss.com/)
- [PeerJS](https://peerjs.com/)
- [Marked.js](https://marked.js.org/)
- [Iconify](https://iconify.design/)

## Usage
1. Open `index.html`.
2. Enter your content in the Markdown Editor.
3. Switch to **PLAYER** view to present.
4. Click the **Collaborate** icon to start a live session or join one.
5. Use the **Spatial** button to toggle zooming transitions.
