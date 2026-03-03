/**
 * LiveDeck - Onboarding & Help Module
 */

const onboarding = {
    guideContent: `
# 🚀 Getting Started with LiveDeck

Welcome to the future of interactive presentations. LiveDeck is designed to be powerful yet simple.

## 📝 The Creator View
- **Navigator (Left)**: View and manage your slides. Right-click any slide for more options.
- **Editor (Center)**: Write your content in Markdown. Use \`---\` on a new line to start a new slide.
- **Preview (Right)**: See exactly what your audience will see.

## 🎮 Interactive Elements
LiveDeck goes beyond standard slides with special components:
- **Polls**: \`:::poll [Question] [Option 1, Option 2, ...]:::\`
- **Quizzes**: \`:::quiz [Question] [Option 1, Option 2, ...] [Correct Index]:::\`
- **Collaborate Board**: \`:::board [Prompt]:::\`
- **Branching**: \`:::branch [Option 1 -> Slide 5, Option 2 -> Slide 8]:::\`
- **Drawing**: \`:::drawing [Prompt]:::\`

## 🌐 Live Sessions
Click the **OFFLINE** status in the header to start hosting. Share your ID with participants, and they'll see your slides in real-time.

## 🪄 Spatial Mode
Toggle the **Spatial** button (axis icon) to switch from linear transitions to a cinematic zooming canvas.

---

### 💡 Pro Tips:
- Use **Right-Click** in the editor for quick component insertion.
- Use **F5** or **Ctrl+Enter** to start presenting instantly.
- Export as a **Standalone HTML** file to share a deck that works anywhere, offline!
`,

    init() {
        if (!localStorage.getItem('LiveDeck_FirstRun')) {
            this.startTour();
            localStorage.setItem('LiveDeck_FirstRun', 'done');
        }
    },

    showHelp() {
        const modal = document.getElementById('modal-help');
        const content = document.getElementById('help-content');
        if (modal && content) {
            content.innerHTML = marked.parse(this.guideContent);
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    },

    hideHelp() {
        const modal = document.getElementById('modal-help');
        if (modal) modal.classList.add('hidden');
    },

    startTour() {
        setTimeout(() => this.showHelp(), 1000);
    }
};
