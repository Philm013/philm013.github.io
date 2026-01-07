import { APP_NAMESPACE, DESKTOP_MEDIA_QUERY, LOCALSTORAGE_KEY } from './config.js';
import { showLoading, hideLoading } from './utils.js';
import { ApplicationStateService } from './state.js';
import { CustomEditorService } from './editorService.js';
import { AIChatService } from './aiService.js';
// Removed EmbeddingService import
import { UIRenderingOrchestrator } from './uiRenderer.js';
import { initViewController, syncFullscreenButton } from './viewController.js';
import { CodeAnalysisService } from './codeAnalysisService.js'; // Added for Bug 2 fix

// --- Application Initialization ---
const initializeComplexApplication = async () => {
    // Updated version string, removed "semantic_tools"
    const version = LOCALSTORAGE_KEY;
    console.log(`Initializing Complex Code Editor (${version})...`);

    showLoading('Initializing Editor Interface...');

    // 1. Initialize Core Editor Service (CodeMirror)
    CustomEditorService.initializeEditor();
    // Initial refresh can be deferred or handled more robustly after content load.
    // setTimeout(() => { CustomEditorService.getEditorInstance()?.refresh(); }, 50); // This refresh might be too early

    // 2. Hydrate Application State (Load data from localStorage)
    showLoading('Loading Application State...');
    const hydrationSuccess = ApplicationStateService.hydrateState(); // This dispatches STATE_HYDRATED internally on success
    console.log(hydrationSuccess ? "State hydrated from localStorage." : "Initialized with default state.");

    // --- Initialize Service Listeners/Subscriptions ---
    // Needs to happen *after* state hydration but *before* first render/AI init
    showLoading('Initializing Services...');
    UIRenderingOrchestrator.init();
    CustomEditorService.init(); // Subscribes and handles initial load for active file (Bug 1 fix related)
    AIChatService.init();       // Sets up AI state subscriptions
    initViewController();       // Sets up DOM listeners

    // Bug 2 Fix: Ensure code graph is populated for all initially loaded files
    showLoading('Updating Code Intelligence...');
    let Dbg2_initialState = ApplicationStateService.getState(); // Get state after hydration and service inits
    for (const fileId in Dbg2_initialState.fileRegistry) {
        const file = Dbg2_initialState.fileRegistry[fileId];
        const graphEntry = Dbg2_initialState.codeGraph[fileId];
        if (file.content && (!graphEntry || !graphEntry.symbols || graphEntry.symbols.length === 0)) {
            console.log(`[Main Init - Bug 2 Fix] Populating/Updating code graph for initially loaded file: ${file.name}`);
            const symbols = CodeAnalysisService.parseCodeForSymbols(fileId, file.content, file.language);
            ApplicationStateService.dispatch({
                type: 'UPDATE_CODE_GRAPH_FOR_FILE',
                payload: { fileId, symbols }
            });
        }
    }
    // Re-fetch state if dispatches occurred, though forceRender below will use latest.
    Dbg2_initialState = ApplicationStateService.getState();


    // 4. Perform Initial Full UI Render
    showLoading('Rendering Initial UI...');
    UIRenderingOrchestrator.forceRender(); // Render based on potentially hydrated state

    // 5. Initialize AI Service (loads models)
    // Removed reference to embedding model loading
    showLoading('Initializing AI Assistant...');
	console.log("[Main] Waiting for SDK initialization promise...");
	await window.sdkInitializationPromise;
	console.log("[Main] SDK initialization promise resolved.");
	// Now it's safer to proceed with AI service initialization
    const aiReady = await AIChatService.initializeAI(); // No longer initializes EmbeddingService

    // --- Removed Embedding Index Initialization Block ---
    // The rebuilding logic is no longer needed.
    if (!aiReady) {
         console.warn("AI failed to initialize.");
    }

    // 6. Apply Desktop-Specific UI Settings
    if (DESKTOP_MEDIA_QUERY.matches) {
         const desktopSidebarClosed = localStorage.getItem(`${APP_NAMESPACE}_desktopSidebarClosed`) === 'true';
         if (desktopSidebarClosed) {
             document.getElementById('app-container')?.classList.add('desktop-sidebar-closed');
             setTimeout(() => { CustomEditorService.getEditorInstance()?.refresh(); }, 100);
         }
    }

    // 7. Ensure an Active File Exists and is Loaded
    showLoading('Verifying Active File...');
    const finalState = ApplicationStateService.getState();
    if (!finalState.activeFileId || !finalState.fileRegistry[finalState.activeFileId]) {
         console.log("No valid active file after initialization. Checking or creating default.");
         const allFileIds = Object.keys(finalState.fileRegistry);
         if (allFileIds.length > 0) {
             ApplicationStateService.dispatch({ type: 'ACTIVATE_TAB_REQUESTED', payload: { id: allFileIds[0] } });
         } else {
             ApplicationStateService.dispatch({ type: 'CREATE_FILE_REQUESTED' });
         }
     } else {
          console.log(`Initial active file verified: ${finalState.fileRegistry[finalState.activeFileId].name}`);
          // Bug 1 related: editorService.init() should now handle loading content for this.
          // We can add a refresh here to be safe after all other UI updates.
          setTimeout(() => { CustomEditorService.getEditorInstance()?.refresh(); }, 150);
     }

    // 8. Final UI Adjustments
    syncFullscreenButton();
    UIRenderingOrchestrator.triggerInitialResizeRender();

    // 9. Hide Loading Indicator
    setTimeout(() => {
        hideLoading();
        console.log(`Editor & Application (${version}) fully initialized.`);
        if (!AIChatService.isAIReady()) {
             console.error("AI Service failed to initialize properly.");
             // Optionally show a persistent error message to the user
        }
        // Final refresh after everything is settled
        setTimeout(() => { CustomEditorService.getEditorInstance()?.refresh(); }, 200);
    }, 500); 
};

// --- Bootstrapping ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComplexApplication);
} else {
    initializeComplexApplication();
}