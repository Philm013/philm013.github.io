import {
    APP_NAMESPACE,
    LOCALSTORAGE_KEY, // Uses updated key from config.js
    DEBOUNCE_INTERVALS,
    PREVIEWABLE_LANGUAGES
} from './config.js';
import {
    debounce,
    deriveLanguageFromName,
    extractUntitledCounter
} from './utils.js';
import { AIChatService } from './aiService.js'; // For notifications

// --- Core Application State Service ---
const ApplicationStateServiceInternal = (() => {
    let state = {
        fileRegistry: {},
        openTabRegistry: [],
        activeFileId: null,
        nextUntitledIndex: 1,
        isDirty: false,
        viewMode: 'edit', // 'edit' or 'preview'
        editorSettings: {
            fontSize: 14,
            tabSize: 2
        },
        aiSearchSettings: {
            globalSearchEnabled: true
        },
        userRules: {}, // For project-specific AI rules
        codeGraph: {},   // NEW: For storing parsed code symbols { fileId: { symbols: [], lastUpdated: timestamp } }
        padState: { // NEW: For Dev PAD feature
            isVisible: false,
            currentPad: null, // Will hold the parsed PAD JSON
            history: [],      // Separate history for the PAD conversation
            isGenerating: false
        }
    };
    let listeners = [];

    const getState = () => JSON.parse(JSON.stringify(state)); // Deep clone for safety

    const dispatch = (action) => {
        const oldState = getState(); // Get state *before* reduction
        state = rootReducer(state, action); // Update internal state

        // Persist state *after* reducer for specific actions
        const persistActions = [
            'FILE_CREATED', 'FILE_UPDATED', 'FILE_DELETED', 'FILE_RENAMED',
            'TAB_CLOSED', 'TAB_ACTIVATED', 'SAVE_ACTIVE_FILE_SUCCESS',
            'ADD_LOADED_FILE', 'SET_AI_GLOBAL_SEARCH',
            'FILE_CONTENT_UPDATED_IN_EDITOR', // Content change from editor
            'UPDATE_FILE_CONTENT', // Programmatic full content update
            'ADD_RULE', 'UPDATE_RULE', 'DELETE_RULE',
            'UPDATE_CODE_GRAPH_FOR_FILE', 'REMOVE_CODE_GRAPH_FOR_FILE' // Graph changes
            // Note: We don't persist padState by default to keep it session-specific
        ];
        if (persistActions.includes(action.type)) {
            persistState();
        }

        // Notify listeners *after* state update and potential persistence
        listeners.forEach(listener => listener(state, oldState));
    };

    const subscribe = (listener) => {
        listeners.push(listener);
        return () => { // Return an unsubscribe function
            listeners = listeners.filter(l => l !== listener);
        };
    };

    // Internal helper, consistent with utils.js
    const deriveLanguageFromNameInner = (filename) => {
         return deriveLanguageFromName(filename);
    };

    const debouncedPersistState = debounce(() => {
        try {
            // Selectively persist necessary state parts
            const stateToPersist = {
                fileRegistry: state.fileRegistry,
                openTabRegistry: state.openTabRegistry,
                activeFileId: state.activeFileId,
                nextUntitledIndex: state.nextUntitledIndex,
                aiSearchSettings: state.aiSearchSettings,
                userRules: state.userRules,
                codeGraph: state.codeGraph // Persist the code graph
            };
            localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(stateToPersist));
             // console.log(`State persisted. Size: ~${(localStorage.getItem(LOCALSTORAGE_KEY)?.length / 1024).toFixed(2)} KB`);
        } catch (error) {
            console.error("CRITICAL: Failed to persist state!", error);
            AIChatService?.showNotification(`Error saving application state. Data might be lost on refresh.`, "error", 10000);
        }
    }, DEBOUNCE_INTERVALS.SAVE);

    const persistState = () => {
         debouncedPersistState();
    };

    const hydrateState = () => {
        const data = localStorage.getItem(LOCALSTORAGE_KEY);
        if (data) {
            try {
                const loaded = JSON.parse(data);
                // Validate essential loaded parts
                if (loaded && loaded.fileRegistry && loaded.openTabRegistry && typeof loaded.nextUntitledIndex === 'number') {
                    state.fileRegistry = loaded.fileRegistry || {};
                    state.openTabRegistry = loaded.openTabRegistry || [];
                    state.activeFileId = loaded.activeFileId || null;
                    state.nextUntitledIndex = Math.max(1, loaded.nextUntitledIndex || 1);
                    state.aiSearchSettings = loaded.aiSearchSettings || { globalSearchEnabled: true };
                    state.userRules = loaded.userRules || {};
                    state.codeGraph = loaded.codeGraph || {}; // Hydrate codeGraph

                    // Sanitize files
                    Object.values(state.fileRegistry).forEach(file => {
                        if (!file) return;
                        if (!file.language) file.language = deriveLanguageFromNameInner(file.name);
                        if (file.content === undefined || file.content === null) file.content = '';
                        else if (typeof file.content !== 'string') file.content = String(file.content);
                        // Remove any old embedding fields if they exist from previous versions
                        delete file.embeddings;
                        delete file.embeddingsHash;
                    });

                    // Sanitize user rules
                    Object.entries(state.userRules).forEach(([name, rule]) => {
                        if (!rule || typeof rule !== 'object') { delete state.userRules[name]; return; }
                        if (typeof rule.description !== 'string') rule.description = '';
                        if (typeof rule.content !== 'string') rule.content = '';
                    });

                    // Sanitize code graph (ensure symbols is an array)
                    Object.entries(state.codeGraph).forEach(([fileId, graphEntry]) => {
                        if (!graphEntry || typeof graphEntry !== 'object' || !Array.isArray(graphEntry.symbols)) {
                            state.codeGraph[fileId] = { symbols: [], lastUpdated: graphEntry?.lastUpdated || Date.now() };
                        }
                        // Further validation of individual symbols could be added if necessary
                    });


                    // Ensure consistency of open tabs and active file
                    state.openTabRegistry = state.openTabRegistry.filter(id => state.fileRegistry[id]);
                    if (state.activeFileId && !state.fileRegistry[state.activeFileId]) { state.activeFileId = null; }
                    if (state.activeFileId && state.fileRegistry[state.activeFileId] && !state.openTabRegistry.includes(state.activeFileId)) {
                        state.openTabRegistry.push(state.activeFileId);
                    }
                    if (!state.activeFileId && state.openTabRegistry.length > 0) {
                        state.activeFileId = state.openTabRegistry[0];
                    } else if (!state.activeFileId && Object.keys(state.fileRegistry).length > 0) {
                        state.activeFileId = Object.keys(state.fileRegistry)[0];
                        if (state.activeFileId && !state.openTabRegistry.includes(state.activeFileId)) {
                            state.openTabRegistry.push(state.activeFileId);
                        }
                    }

                    state.viewMode = 'edit'; // Default to edit mode on load
                    state.isDirty = false;   // Assume clean state on load

                    console.log("State hydrated successfully from localStorage.");
                    setTimeout(() => dispatch({ type: 'STATE_HYDRATED' }), 0); // Notify UI after hydration
                    return true;
                } else {
                     console.warn("Hydrated state structure is invalid or incomplete. Resetting to default state.");
                     localStorage.removeItem(LOCALSTORAGE_KEY); // Remove invalid data
                }
            } catch (error) {
                console.error("Error parsing or hydrating state from localStorage. Resetting to default state.", error);
                localStorage.removeItem(LOCALSTORAGE_KEY); // Remove corrupted data
            }
        }
        initializeDefaultState(); // Fallback to default if no data or errors
        return false;
    };

    const initializeDefaultState = () => {
        // This is a direct copy of the state shape from the top of the file
        state = {
            fileRegistry: {}, openTabRegistry: [], activeFileId: null,
            nextUntitledIndex: 1, isDirty: false, viewMode: 'edit',
            editorSettings: { fontSize: 14, tabSize: 2 },
            aiSearchSettings: { globalSearchEnabled: true },
            userRules: {}, codeGraph: {},
            padState: { isVisible: false, currentPad: null, history: [], isGenerating: false }
        };
        console.log("Default state initialized.");
    };

    const generateUniqueId = () => `${APP_NAMESPACE}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // --- Reducer Logic ---
    const rootReducer = (current, action) => {
        // Create a new state object for immutability
        let newState;
        try {
            newState = structuredClone(current);
        } catch (cloneError) {
            newState = JSON.parse(JSON.stringify(current));
        }


        switch (action.type) {
            case 'PAD_SET_GENERATING':
                newState.padState.isGenerating = action.payload;
                break;
            case 'PAD_UPDATE':
                newState.padState.history.push(action.payload.userHistory);
                newState.padState.history.push(action.payload.modelHistory);
                // Ensure history doesn't grow indefinitely
                if (newState.padState.history.length > 20) {
                    newState.padState.history.splice(0, newState.padState.history.length - 20);
                }
                newState.padState.currentPad = action.payload.pad;
                newState.padState.isGenerating = false;
                break;
            case 'PAD_TOGGLE_VISIBILITY': {
                const newVisibility = typeof action.payload === 'boolean' ? action.payload : !newState.padState.isVisible;
                newState.padState.isVisible = newVisibility;
                // If opening for the first time, reset history and pad
                if (newVisibility && !newState.padState.currentPad && newState.padState.history.length === 0) {
                     newState.padState.isGenerating = true; // Set generating flag immediately
                } else if (!newVisibility) {
                     // Optionally clear history on close, or keep it for the session
                     // For now, let's keep it. A reset button could be added later.
                }
                break;
            }
            case 'PAD_RESET':
                 newState.padState = { isVisible: newState.padState.isVisible, currentPad: null, history: [], isGenerating: true };
                 break;

            case 'SET_DIRTY_FLAG':
                newState.isDirty = action.payload;
                break;
            case 'SET_VIEW_MODE':
                newState.viewMode = action.payload;
                // If switching to preview and current language is not previewable, switch back to edit
                if (newState.viewMode === 'preview' && newState.activeFileId && newState.fileRegistry[newState.activeFileId]) {
                    const activeLang = newState.fileRegistry[newState.activeFileId].language;
                    if (!PREVIEWABLE_LANGUAGES.includes(activeLang)) {
                        newState.viewMode = 'edit';
                    }
                }
                break;
            case 'FILE_CONTENT_UPDATED_IN_EDITOR': // From CodeMirror changes
                if (newState.activeFileId && newState.fileRegistry[newState.activeFileId]) {
                    const newContent = String(action.payload.content || '');
                    if (newState.fileRegistry[newState.activeFileId].content !== newContent) {
                        newState.fileRegistry[newState.activeFileId].content = newContent;
                        newState.isDirty = true;
                    }
                }
                break;
            case 'UPDATE_FILE_CONTENT': { // For programmatic full content updates (e.g., AI applying diff)
                const { fileId, content } = action.payload;
                if (newState.fileRegistry[fileId]) {
                    const newContentStr = String(content || '');
                    if (newState.fileRegistry[fileId].content !== newContentStr) {
                        newState.fileRegistry[fileId].content = newContentStr;
                        if (newState.activeFileId === fileId) {
                            newState.isDirty = true; // Mark dirty if active file was changed
                        }
                    }
                } else {
                    console.warn(`UPDATE_FILE_CONTENT: File ID ${fileId} not found.`);
                }
                break;
            }
            case 'SAVE_ACTIVE_FILE_SUCCESS': // Typically called after a format or explicit save action
                if (newState.activeFileId && newState.fileRegistry[newState.activeFileId]) {
                     if (action.payload && action.payload.content !== undefined) {
                         newState.fileRegistry[newState.activeFileId].content = String(action.payload.content || '');
                     }
                    newState.isDirty = false;
                }
                break;
            case 'CREATE_FILE_REQUESTED': {
                let baseName = "untitled", defaultExt = "html", name, idx = newState.nextUntitledIndex;
                const existingNames = Object.values(newState.fileRegistry).map(f => f.name.toLowerCase());
                do { name = `${baseName}-${idx}.${defaultExt}`; idx++; } while (existingNames.includes(name.toLowerCase()));

                const fileId = generateUniqueId();
                const defaultContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>${name}</title>\n</head>\n<body>\n    <h1>Edit ${name}</h1>\n    <!-- New file created by editor -->\n</body>\n</html>\n`;
                newState.fileRegistry[fileId] = { id: fileId, name: name, content: defaultContent, language: deriveLanguageFromNameInner(name) };
                newState.nextUntitledIndex = idx;
                newState.activeFileId = fileId;
                if (!newState.openTabRegistry.includes(fileId)) { newState.openTabRegistry.push(fileId); }
                newState.isDirty = false; // New file is considered clean initially
                newState.viewMode = 'edit';
                // Initialize code graph for the new file (likely empty symbols initially)
                newState.codeGraph[fileId] = { symbols: [], lastUpdated: Date.now() };
                setTimeout(() => dispatch({ type: 'FILE_CREATED', payload: { id: fileId, name: name } }), 0);
                break;
            }
            case 'ADD_LOADED_FILE': { // From file input or AI creating file with content
                const { id, name, content, language } = action.payload;
                if (!id || !name) break; // Essential properties missing

                const fileContent = content === undefined || content === null ? '' : String(content);
                const fileLanguage = language || deriveLanguageFromNameInner(name);
                const isUpdate = !!newState.fileRegistry[id];

                newState.fileRegistry[id] = { id: id, name: name, content: fileContent, language: fileLanguage };
                if (!isUpdate) { // Only update nextUntitledIndex if it's a truly new file to the system
                     newState.nextUntitledIndex = Math.max(newState.nextUntitledIndex, extractUntitledCounter(name) + 1);
                }
                newState.activeFileId = id;
                if (!newState.openTabRegistry.includes(id)) { newState.openTabRegistry.push(id); }

                if (current.activeFileId !== id) {
                    newState.isDirty = false;
                } else if (isUpdate && current.fileRegistry[id]?.content !== fileContent) {
                    newState.isDirty = true;
                } else if (!isUpdate) { 
                    newState.isDirty = false;
                }

                newState.viewMode = 'edit';
                newState.codeGraph[id] = { symbols: [], lastUpdated: Date.now() }; 
                break;
            }
             case 'DELETE_FILE_REQUESTED': {
                 const idToDelete = action.payload.id;
                 if (!newState.fileRegistry[idToDelete]) break;

                 const wasActive = newState.activeFileId === idToDelete;
                 const deletedFileName = newState.fileRegistry[idToDelete].name;

                 delete newState.fileRegistry[idToDelete];
                 if (newState.codeGraph[idToDelete]) { 
                    delete newState.codeGraph[idToDelete];
                 }

                 const tabIndex = newState.openTabRegistry.indexOf(idToDelete);
                 if (tabIndex > -1) { newState.openTabRegistry.splice(tabIndex, 1); }

                 if (wasActive) {
                     const openTabs = newState.openTabRegistry;
                     const allFileIds = Object.keys(newState.fileRegistry);
                     let nextActiveId = openTabs[Math.max(0, tabIndex - 1)] || openTabs[0] || allFileIds[0] || null;
                     newState.activeFileId = nextActiveId;
                     newState.isDirty = false;
                     newState.viewMode = 'edit';
                     if (nextActiveId && newState.fileRegistry[nextActiveId] && !newState.openTabRegistry.includes(nextActiveId)) {
                         newState.openTabRegistry.push(nextActiveId);
                     }
                 }
                 setTimeout(() => dispatch({ type: 'FILE_DELETED', payload: { id: idToDelete, name: deletedFileName } }), 0);
                 break;
             }
            case 'RENAME_FILE_REQUESTED': {
                const { id, newName } = action.payload;
                if (!newState.fileRegistry[id] || !newName || !newName.trim()) {
                    setTimeout(() => dispatch({ type: 'RENAME_FILE_FAILED', payload: { id, reason: 'Invalid name' } }), 0);
                    break;
                }
                const trimmedName = newName.trim();
                if (Object.values(newState.fileRegistry).some(f => f.id !== id && f.name.toLowerCase() === trimmedName.toLowerCase())) {
                    AIChatService?.showNotification(`A file named "${trimmedName}" already exists.`, "warning");
                    setTimeout(() => dispatch({ type: 'RENAME_FILE_FAILED', payload: { id, reason: 'Duplicate name' } }), 0);
                    break;
                }

                const oldName = newState.fileRegistry[id].name;
                newState.fileRegistry[id].name = trimmedName;
                const newLanguage = deriveLanguageFromNameInner(trimmedName);
                newState.fileRegistry[id].language = newLanguage;

                if (newState.activeFileId === id && !PREVIEWABLE_LANGUAGES.includes(newLanguage) && newState.viewMode === 'preview') {
                    newState.viewMode = 'edit'; // Switch to edit if language no longer previewable
                }
                newState.nextUntitledIndex = Math.max(newState.nextUntitledIndex, extractUntitledCounter(trimmedName) + 1);
                setTimeout(() => dispatch({ type: 'FILE_RENAMED', payload: { id, oldName, newName: trimmedName } }), 0);
                break;
            }
            case 'ACTIVATE_TAB_REQUESTED': {
                const idToActivate = action.payload.id;
                if (idToActivate === newState.activeFileId || !newState.fileRegistry[idToActivate]) break;

                newState.isDirty = false; // Activating a tab implies loading its saved state, so not dirty
                newState.activeFileId = idToActivate;
                if (!newState.openTabRegistry.includes(idToActivate)) { // Should usually be open if activating via tab click
                    newState.openTabRegistry.push(idToActivate);
                }
                newState.viewMode = 'edit'; // Default to edit mode when switching tabs
                setTimeout(() => dispatch({ type: 'TAB_ACTIVATED', payload: { id: idToActivate } }), 0);
                break;
            }
            case 'CLOSE_TAB_REQUESTED': {
                const idToClose = action.payload.id;
                const tabIndex = newState.openTabRegistry.indexOf(idToClose);
                if (tabIndex === -1) break; // Tab not found in open registry

                const closedFileName = newState.fileRegistry[idToClose]?.name || idToClose;
                newState.openTabRegistry.splice(tabIndex, 1);

                if (newState.activeFileId === idToClose) {
                    const openTabs = newState.openTabRegistry;
                    let nextActiveId = openTabs[Math.max(0, tabIndex - 1)] || openTabs[0] || null;
                    if (!nextActiveId && Object.keys(newState.fileRegistry).length > 0) { // If no open tabs left, pick first from registry
                        nextActiveId = Object.keys(newState.fileRegistry)[0];
                        if(nextActiveId && !newState.openTabRegistry.includes(nextActiveId)){
                            newState.openTabRegistry.push(nextActiveId); // Ensure this fallback is "opened"
                        }
                    }
                    newState.activeFileId = nextActiveId;
                    newState.isDirty = false; // New active tab is considered clean
                    newState.viewMode = 'edit';
                }
                setTimeout(() => dispatch({ type: 'TAB_CLOSED', payload: { id: idToClose } }), 0);
                break;
            }
             case 'SET_AI_GLOBAL_SEARCH':
                 newState.aiSearchSettings.globalSearchEnabled = !!action.payload; // Ensure boolean
                 break;

             case 'ADD_RULE': {
                  const { name, description, content } = action.payload;
                  if (!name) break;
                  if (newState.userRules[name]) {
                       AIChatService?.showNotification(`Rule "${name}" already exists.`, "warning");
                       break;
                  }
                  newState.userRules[name] = { description: description || '', content: content || '' };
                  break;
             }
             case 'UPDATE_RULE': {
                  const { name, description, content } = action.payload;
                  if (!name || !newState.userRules[name]) {
                      console.warn(`Update rule failed: Rule "${name}" not found.`);
                      break;
                  }
                  newState.userRules[name] = { description: description || '', content: content || '' };
                  break;
             }
             case 'DELETE_RULE': {
                  const { name } = action.payload;
                  if (!name || !newState.userRules[name]) {
                      console.warn(`Delete rule failed: Rule "${name}" not found.`);
                      break;
                  }
                  delete newState.userRules[name];
                  break;
             }
            case 'UPDATE_CODE_GRAPH_FOR_FILE': { // New reducer for code graph
                const { fileId, symbols } = action.payload;
                if (fileId) {
                    newState.codeGraph[fileId] = { symbols: Array.isArray(symbols) ? symbols : [], lastUpdated: Date.now() };
                }
                break;
            }
            case 'REMOVE_CODE_GRAPH_FOR_FILE': { // New reducer for code graph
                const { fileId } = action.payload;
                if (fileId && newState.codeGraph[fileId]) {
                    delete newState.codeGraph[fileId];
                }
                break;
            }

            // Notification/Side-effect only actions (no direct state change here, handled by preceding request action)
            case 'STATE_HYDRATED':
            case 'FILE_CREATED':
            case 'FILE_DELETED':
            case 'FILE_RENAMED':
            case 'RENAME_FILE_FAILED':
            case 'TAB_ACTIVATED':
            case 'TAB_CLOSED':
                // These are primarily for listeners to react to, state changes already occurred
                break;

            default:
                console.warn(`Unhandled action type: ${action.type}`, action.payload);
                return current; // Return current state if action is not recognized
        }
        return newState;
    };

    // Public interface
    return {
        getState,
        dispatch,
        subscribe,
        hydrateState,
        generateUniqueId
    };
})();

export const ApplicationStateService = ApplicationStateServiceInternal;