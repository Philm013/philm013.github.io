# KnowledgeMapper: End-to-End Research Canvas Overhaul

## Objective
Transform KnowledgeMapper from a D3-based graph tool into a comprehensive "Research Canvas" using **tldraw**. AI assistant features will be removed from side panels and baked directly into the UX as contextual triggers, helping students organize, annotate, and synthesize information end-to-end.

## Key Files & Context
- `KnowledgeMapper/index.html`: Modernized layout with `importmap`.
- `KnowledgeMapper/js/canvas.jsx`: **New** React/tldraw implementation.
- `KnowledgeMapper/js/coach.js`: Contextual AI logic (no UI).
- `KnowledgeMapper/js/main.js`: App orchestration.

## Core Experience Flows

### 1. The "Guided Launch" (Starter)
- **Traditional Flow:** Blank page -> Manual adding.
- **New Flow:** `New Project` -> Full-screen overlay: "What is your Driving Question?"
- **Baked-in AI:** Once entered, AI suggests a "Starter Pack" of 3-5 nodes (Core Concepts, Key Questions, Potential Sources). User clicks "Deploy to Canvas" to begin.

### 2. Node Creation (Blank vs. Coached)
- **UX:** Double-click canvas or click `+` tool.
- **Interactive Trigger:** An input field appears at the cursor with two buttons: `[Done]` and `[✨ Coach Me]`.
- **Coached Action:** If "Coach Me" is clicked, AI researches the label, populates the "Summary" field, and generates 2-3 "Ghost Nodes" (translucent suggestions) connected to it. User clicks ghosts to "solidify" them.

### 3. Bibliography & Evidence Canvas
- **UX:** The "Sources" sidebar is linked to canvas-native **Source Cards**.
- **Evidence Flow:** 
    - Drag a URL into the sidebar -> AI unfurls metadata.
    - Drag the source from sidebar to canvas -> Spawns a **Source Card**.
    - Connector Logic: Use tldraw arrows to link **Source Cards** to **Research Notes**. 
    - AI Feedback: If a link exists, a "Verify" badge appears. AI analyzes if the source actually supports the claim in the note.

### 4. Selection-Based Synthesis (The Toolset)
- **UX:** Selecting multiple shapes triggers a floating "Synthesis Bar".
- **Tools:**
    - **[Synthesize]**: Create a new "Conclusion Card" summarizing selected nodes.
    - **[Find Gaps]**: AI analyzes the selection vs. the Driving Question and highlights missing evidence or logical leaps.
    - **[Reorganize]**: AI suggests a layout (Flowchart, Mind Map, Cluster) based on relationships.

## tldraw Customization Details

### Custom Shapes
1. **`research-note`**: 
    - Aesthetic: Parchment card with a colored header.
    - Fields: `label` (title), `quote` (serif font), `thoughts` (sans font).
2. **`source-card`**:
    - Aesthetic: Blue border, favicon icon, domain label.
    - Properties: `url`, `author`, `abstract`.

### UI Overrides
- **Hide default tldraw toolbar.**
- **Implement "Research Toolkit":** Custom overlay with `Annotate`, `Synthesize`, `Gap Analysis`, and `Coach`.

## Implementation Phases

### Phase 1: Infrastructure
1. Update `index.html` with `importmap` for `tldraw@3.x`, `react`, `react-dom`.
2. Set up React root for the canvas.
3. Implement `storage.js` snapshotting for tldraw store.

### Phase 2: Custom Shapes & Tools
1. Define `ResearchNoteUtil` and `SourceCardUtil`.
2. Implement the "Interactive Node Input" (Popover at cursor).
3. Create the "Evidence Connector" (Custom arrow behavior).

### Phase 3: AI Integration (The "Baked-in" Logic)
1. Implement `Coach.getStarterPack(question)`.
2. Implement `Coach.researchNode(label, context)`.
3. Implement `Coach.analyzeSelection(nodes)`.

### Phase 4: Polish & Onboarding
1. Create the "Guided Launch" overlay.
2. Polish the "Ghost Node" interaction.
3. Final theme alignment (Academic Parchment).

## Verification & Testing
- **Flow Test:** Can a user start from a question and reach a 10-node synthesized map?
- **Sync Test:** Do Source Cards accurately reflect the bibliography state?
- **AI Test:** Does "Gap Analysis" provide actionable research tasks?
- **Performance:** Ensure infinite canvas remains smooth with 50+ rich nodes.
