// --- START OF FILE editorService.js ---

import {
    DEBOUNCE_INTERVALS,
    PREVIEWABLE_LANGUAGES,
    CODEMIRROR_LANGUAGE_MAP
} from './config.js';
import { debounce, escapeHtml, deriveLanguageFromName, extractUntitledCounter } from './utils.js'; // escapeRegExp removed as not used directly here
import { ApplicationStateService } from './state.js';
import { AIChatService } from './aiService.js';
import { CodeAnalysisService } from './codeAnalysisService.js'; // Added for symbol parsing

// --- Custom Editor Service ---
const CustomEditorServiceInternal = (() => {
    const editorContainer = document.getElementById('editor-area');
    const sourceTextarea = document.getElementById('editor-input-source');
    const previewFrame = document.getElementById('preview-frame');
    let editorInstance = null;
    let currentFileId = null; // Tracks the ID of the file currently loaded in the editor
    let currentLanguage = 'plaintext'; // Tracks the language of the file in the editor
    let isApplyingChange = false; // Flag to prevent feedback loops during programmatic changes

    // Debounced handler for editor changes -> update state -> update preview -> update code graph
    const debouncedContentChangeAndSave = debounce((content) => {
        if (!isApplyingChange && currentFileId) { // Only trigger if change is from user and a file is active
            ApplicationStateService.dispatch({ type: 'FILE_CONTENT_UPDATED_IN_EDITOR', payload: { content } });

            // Update code graph for the active file
            if (currentLanguage) { // currentLanguage should be set if currentFileId is set
                const symbols = CodeAnalysisService.parseCodeForSymbols(currentFileId, content, currentLanguage);
                ApplicationStateService.dispatch({ type: 'UPDATE_CODE_GRAPH_FOR_FILE', payload: { fileId: currentFileId, symbols } });
            }

            // Update preview only if the language supports it
            if (PREVIEWABLE_LANGUAGES.includes(currentLanguage)) {
                debouncedPreviewUpdate();
            }
        }
    }, DEBOUNCE_INTERVALS.EDITOR_CHANGE);

    const initializeEditor = () => {
        if (editorInstance) return;

        const state = ApplicationStateService.getState();
        const settings = state.editorSettings;

        try {
            if (typeof CodeMirror === 'undefined') {
                throw new Error("CodeMirror library not loaded.");
            }

            editorInstance = CodeMirror.fromTextArea(sourceTextarea, {
                lineNumbers: true,
                mode: CODEMIRROR_LANGUAGE_MAP[currentLanguage] || 'null',
                theme: 'ambiance',
                tabSize: settings.tabSize || 2,
                indentUnit: settings.tabSize || 2,
                indentWithTabs: false,
                matchBrackets: true,
                autoCloseBrackets: true,
                styleActiveLine: true,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                extraKeys: {
                    "Ctrl-Space": "autocomplete",
                    "Ctrl-Z": "undo", "Cmd-Z": "undo",
                    "Ctrl-Y": "redo", "Cmd-Y": "redo", "Shift-Ctrl-Z": "redo", "Shift-Cmd-Z": "redo",
                    "Ctrl-F": "findPersistent", "Cmd-F": "findPersistent",
                    "Ctrl-H": "replace", "Cmd-Alt-F": "replace"
                }
            });

            editorInstance.on('change', (instance, changeObj) => {
                if (changeObj.origin !== 'setValue' && !isApplyingChange) {
                    debouncedContentChangeAndSave(instance.getValue());
                }
            });

            editorInstance.on('cursorActivity', debounce((instance) => {
                 AIChatService?.updateChatContextDisplay(); // Update AI chat context on selection/cursor move
            }, DEBOUNCE_INTERVALS.SELECTION));

            console.log("CodeMirror Initialized.");
            // Don't refresh immediately here; loadContent will handle it.
            // setTimeout(() => editorInstance.refresh(), 50); 

        } catch (error)
{
            console.error("Failed to initialize CodeMirror:", error);
            if(editorContainer) editorContainer.innerHTML = `<div style="color: red; padding: 10px;">Failed to load CodeMirror editor. Check console.</div>`;
            AIChatService?.showNotification("CodeMirror editor failed to load.", "error");
            editorInstance = null;
        }
    };

    const loadContent = (fileId, files) => {
        if (!editorInstance) {
             // This should ideally not happen if initializeEditor was called first.
             // If it does, it means init order is still problematic.
             console.warn("loadContent called but editorInstance is null. Attempting re-init.");
             initializeEditor(); 
             if (!editorInstance) {
                 console.error("Cannot load content, CodeMirror instance not available even after re-init attempt.");
                 return;
             }
        }

        const file = files[fileId];
        if (!file) {
            console.warn(`loadContent: No file data for fileId ${fileId}. Clearing editor.`);
            clearEditor(); 
            return;
        }

        const currentEditorContent = editorInstance.getValue();
        const fileContent = String(file.content || ''); 
        const newMode = CODEMIRROR_LANGUAGE_MAP[file.language] || CODEMIRROR_LANGUAGE_MAP[file.language.toLowerCase()] || 'null';
        
        // Optimization: If same file, content, and mode, only focus and update preview.
        // However, for initial load (Bug 1), we might want to force setValue if editor is visually empty.
        // The `currentEditorContent` check here is crucial.
        if (currentFileId === fileId && currentEditorContent === fileContent && editorInstance.getOption("mode") === newMode) {
            console.log(`[EditorService.loadContent] Content for ${file.name} already matches. Focusing and refreshing preview.`);
            editorInstance.focus();
            updatePreviewContentOnly();
            // It's possible CM is visually empty but getValue() returns the correct (non-empty) content
            // if a refresh was missed. So, add a refresh here too.
            setTimeout(() => editorInstance.refresh(), 10);
            return;
        }

        console.log(`[EditorService.loadContent] Loading content for file: ${file.name} (ID: ${fileId}, Lang: ${file.language})`);
        currentFileId = fileId; 
        currentLanguage = file.language || 'plaintext';

        isApplyingChange = true;
        try {
            editorInstance.setValue(fileContent);
            editorInstance.setOption("mode", newMode);
            editorInstance.clearHistory();
            editorInstance.focus();
            // Set cursor to 0,0 only if it's a different file. If same file but content changed, keep cursor.
            if (currentFileId !== fileId || !editorInstance.getCursor().line) { // A bit heuristic
                editorInstance.setCursor(0, 0);
            }


            const symbols = CodeAnalysisService.parseCodeForSymbols(fileId, fileContent, currentLanguage);
            ApplicationStateService.dispatch({ type: 'UPDATE_CODE_GRAPH_FOR_FILE', payload: { fileId, symbols } });

            setTimeout(() => {
                 editorInstance.refresh();
                 AIChatService?.updateChatContextDisplay();
                 ApplicationStateService.dispatch({ type: 'SET_DIRTY_FLAG', payload: false }); 
            }, 10); // Small delay for refresh after setValue
        } catch (error) {
             console.error("Error loading content into CodeMirror:", error);
             AIChatService?.showNotification(`Error loading ${file.name}`, "error");
        } finally {
            isApplyingChange = false;
        }

        updatePreviewContentOnly(); 
    };

    const clearEditor = () => {
        if (!editorInstance) return;

        console.log("Clearing editor content.");
        const previouslyActiveFileId = currentFileId; 

        currentFileId = null;
        currentLanguage = 'plaintext';

        isApplyingChange = true;
        try {
            editorInstance.setValue('');
            editorInstance.setOption("mode", 'null');
            editorInstance.clearHistory();
        } catch (e) {
             console.error("Error clearing editor:", e);
        } finally {
             isApplyingChange = false;
        }

        if (previouslyActiveFileId) {
            ApplicationStateService.dispatch({ type: 'REMOVE_CODE_GRAPH_FOR_FILE', payload: { fileId: previouslyActiveFileId } });
        }

        updatePreviewContentOnly();
        AIChatService?.updateChatContextDisplay();
        ApplicationStateService.dispatch({ type: 'SET_DIRTY_FLAG', payload: false });
    };

    const getContent = () => editorInstance ? editorInstance.getValue() : '';

    const updatePreviewContentOnly = () => {
        if (!previewFrame) return;
        const state = ApplicationStateService.getState();
        const file = state.fileRegistry[state.activeFileId];
        const viewMode = state.viewMode;

        if (!file || viewMode !== 'preview' || !PREVIEWABLE_LANGUAGES.includes(file.language)) {
            previewFrame.srcdoc = 'about:blank';
            if (previewFrame.hasAttribute('sandbox')) previewFrame.removeAttribute('sandbox');
            return;
        }

        const lang = file.language;
        const contentToPreview = (state.activeFileId === currentFileId && editorInstance) ? editorInstance.getValue() : (file.content || '');

        if (lang === 'html') {
            try {
                previewFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
                previewFrame.srcdoc = contentToPreview;
            } catch (e) {
                previewFrame.srcdoc = `<pre>Error rendering HTML preview: ${escapeHtml(e.message)}</pre>`;
            }
        } else if (lang === 'markdown' || lang === 'md') {
            if (previewFrame.hasAttribute('sandbox')) previewFrame.removeAttribute('sandbox');
            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                try {
                    marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
                    const rawHtml = marked.parse(contentToPreview || '');
                    const sanitizedHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
                    const previewStyles = `<style>body { font-family: sans-serif; line-height: 1.6; padding: 15px; } code { background-color: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; font-family: var(--font-mono); } pre { background-color: #f0f0f0; padding: 10px; border-radius: 4px; overflow-x: auto; } pre code { background-color: transparent; padding: 0; } blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin-left: 0; color: #555; }</style>`;
                    previewFrame.srcdoc = `<!DOCTYPE html><html><head>${previewStyles}</head><body><div class="markdown-preview">${sanitizedHtml}</div></body></html>`;
                } catch (e) {
                    previewFrame.srcdoc = `<pre>Error rendering Markdown preview: ${escapeHtml(e.message)}</pre>`;
                }
            } else {
                previewFrame.srcdoc = '<pre>Markdown preview libraries (marked, DOMPurify) not loaded.</pre>';
            }
        } else {
            if (previewFrame.hasAttribute('sandbox')) previewFrame.removeAttribute('sandbox');
            previewFrame.srcdoc = 'about:blank';
        }
    };

    const debouncedPreviewUpdate = debounce(updatePreviewContentOnly, DEBOUNCE_INTERVALS.RENDER * 3);

    const formatContent = () => {
        if (!editorInstance || !currentFileId) return;
        const originalContent = editorInstance.getValue();
        let formattedContent = originalContent;
        const language = currentLanguage;
        const editorSettings = ApplicationStateService.getState().editorSettings;
        const options = { indent_size: editorSettings.tabSize || 2, space_in_empty_paren: true };

        try {
            switch (language) {
                case 'html': if (typeof html_beautify === 'function') formattedContent = html_beautify(originalContent, options); else { AIChatService?.showNotification('HTML beautifier not loaded.', "warning"); return; } break;
                case 'css': if (typeof css_beautify === 'function') formattedContent = css_beautify(originalContent, options); else { AIChatService?.showNotification('CSS beautifier not loaded.', "warning"); return; } break;
                case 'javascript': case 'json': if (typeof js_beautify === 'function') formattedContent = js_beautify(originalContent, options); else { AIChatService?.showNotification('JS/JSON beautifier not loaded.', "warning"); return; } break;
                default: AIChatService?.showNotification(`Formatting not available for ${language}.`, "info"); return;
            }

            if (formattedContent !== originalContent) {
                const currentCursor = editorInstance.getCursor();
                isApplyingChange = true;
                editorInstance.setValue(formattedContent);
                editorInstance.setCursor(currentCursor);
                editorInstance.clearHistory();
                editorInstance.focus();
                isApplyingChange = false;

                ApplicationStateService.dispatch({ type: 'FILE_CONTENT_UPDATED_IN_EDITOR', payload: { content: formattedContent } });
                console.log(`Applied formatting to ${currentFileId}.`);
                if (PREVIEWABLE_LANGUAGES.includes(currentLanguage)) updatePreviewContentOnly();
            } else {
                AIChatService?.showNotification(`Content already formatted.`, "info");
                ApplicationStateService.dispatch({ type: 'SET_DIRTY_FLAG', payload: false });
            }
        } catch (e) {
            console.error("Formatting Error:", e);
            AIChatService?.showNotification(`Formatting failed for ${language}. Error: ${e.message}`, "error");
            isApplyingChange = false;
        }
    };

    const getCurrentSelection = () => {
        if (!editorInstance || !editorInstance.somethingSelected()) return null;
        const from = editorInstance.getCursor("start");
        const to = editorInstance.getCursor("end");
        return { text: editorInstance.getSelection(), startPos: from, endPos: to };
    };

    const replaceSelection = (newText) => {
        if (!editorInstance) return;
        isApplyingChange = true;
        try {
            editorInstance.operation(() => editorInstance.replaceSelection(newText, "around"));
            editorInstance.focus();
        } catch (e) {
             AIChatService?.showNotification(`Error replacing text: ${e.message}`, "error");
        } finally {
             isApplyingChange = false;
        }
        const content = editorInstance.getValue();
        ApplicationStateService.dispatch({ type: 'FILE_CONTENT_UPDATED_IN_EDITOR', payload: { content } });
        if (PREVIEWABLE_LANGUAGES.includes(currentLanguage)) debouncedPreviewUpdate();
    };

    const replaceContent = (fileId, newContent) => {
        const state = ApplicationStateService.getState();
        if (!state.fileRegistry[fileId]) {
             AIChatService?.showNotification(`Error replacing content: File ID ${fileId} not found.`, "error");
             return;
        }
        const newContentStr = String(newContent || '');
        ApplicationStateService.dispatch({ type: 'UPDATE_FILE_CONTENT', payload: { fileId, content: newContentStr } });

        if (editorInstance && currentFileId === fileId) {
            isApplyingChange = true;
            try {
                const currentCursor = editorInstance.getCursor();
                editorInstance.setValue(newContentStr);
                const doc = editorInstance.getDoc();
                const lastLine = doc.lastLine();
                const clampedPos = {
                     line: Math.min(currentCursor.line, lastLine),
                     ch: currentCursor.line <= lastLine ? Math.min(currentCursor.ch, doc.getLine(Math.min(currentCursor.line, lastLine)).length) : (doc.getLine(lastLine).length)
                 };
                editorInstance.setCursor(clampedPos);
                editorInstance.focus();
                editorInstance.clearHistory();
            } catch (e) {
                 AIChatService?.showNotification(`Error updating editor: ${e.message}`, "error");
            } finally {
                 isApplyingChange = false;
            }
            if (PREVIEWABLE_LANGUAGES.includes(currentLanguage)) updatePreviewContentOnly();
            AIChatService?.updateChatContextDisplay();
        }

        const fileToUpdate = ApplicationStateService.getState().fileRegistry[fileId]; 
        if (fileToUpdate) {
            const symbols = CodeAnalysisService.parseCodeForSymbols(fileId, newContentStr, fileToUpdate.language);
            ApplicationStateService.dispatch({ type: 'UPDATE_CODE_GRAPH_FOR_FILE', payload: { fileId, symbols } });
        }
    };

    const getContentByLineRange = (startLine, endLine, fileId) => {
        const state = ApplicationStateService.getState();
        let targetContent = null;
        let targetFile = null;
        let fileNameForError = 'unknown file';

        if (fileId && fileId === state.activeFileId && editorInstance) {
            targetContent = editorInstance.getValue();
            targetFile = state.fileRegistry[fileId];
            fileNameForError = targetFile?.name || fileId;
        } else if (fileId && state.fileRegistry[fileId]) {
            targetFile = state.fileRegistry[fileId];
            targetContent = targetFile.content;
            fileNameForError = targetFile?.name || fileId;
             if (targetContent === null || targetContent === undefined) {
                 return `Error: Content for file "${fileNameForError}" (ID: ${fileId}) is missing or not loaded.`;
             }
        } else {
             const reason = !fileId ? "No file ID provided" : `File ID "${fileId}" not found in registry`;
            return `Error: Cannot retrieve content. ${reason}.`;
        }

        const lines = String(targetContent).split('\n');
        const totalLines = lines.length;
        const startIdx = Math.max(0, startLine - 1); 
        const endIdx = Math.min(totalLines - 1, endLine - 1); 

        if (startIdx > endIdx || startLine < 1 || endLine > totalLines ) { 
            return `Error: Invalid line range (${startLine}-${endLine}) for file "${fileNameForError}" (ID: ${fileId}). Valid range: 1-${totalLines}. Requested 0-indexed: ${startIdx}-${endIdx}`;
        }
        try {
            return lines.slice(startIdx, endIdx + 1).join('\n');
        } catch (e) {
            return `Error retrieving content slice: ${e.message}`;
        }
    };

    const getFileContent = (fileId) => {
         const state = ApplicationStateService.getState();
         if (fileId === state.activeFileId && editorInstance) {
             return editorInstance.getValue();
         }
         return state.fileRegistry[fileId]?.content ?? null;
    };

    const applyChangeToFile = (fileId, changeDetails) => {
        const state = ApplicationStateService.getState();
        const file = state.fileRegistry[fileId];
        if (!file) return { success: false, error: `File not found (ID: ${fileId}).` };

        const { change_type, target_text, new_text } = changeDetails;
        if (!change_type || target_text === undefined || new_text === undefined) {
            return { success: false, error: "Missing required details (change_type, target_text, new_text) for simple change." };
        }
        if (change_type === 'REPLACE_SEMANTIC' || change_type === 'INSERT_SEMANTIC' || change_type === 'APPLY_GIT_DIFF') {
             return { success: false, error: `applyChangeToFile is for simple text changes only. Use the diff workflow for '${change_type}'.` };
        }

        let currentContent = getFileContent(fileId);
        if (currentContent === null) return { success: false, error: `Could not retrieve content for file "${file.name}".` };
        currentContent = String(currentContent);

        let modifiedContent = currentContent;
        const targetIndex = currentContent.indexOf(target_text);

        if (targetIndex === -1) {
            return { success: false, error: `Target text not found in file "${file.name}". Target (first 50 chars): "${String(target_text).substring(0, 50)}..."` };
        }

        try {
            if (change_type === 'REPLACE_TEXT') {
                modifiedContent = currentContent.substring(0, targetIndex) + new_text + currentContent.substring(targetIndex + target_text.length);
            } else if (change_type === 'INSERT_BEFORE') {
                modifiedContent = currentContent.substring(0, targetIndex) + new_text + currentContent.substring(targetIndex);
            } else if (change_type === 'INSERT_AFTER') {
                const insertionPoint = targetIndex + target_text.length;
                modifiedContent = currentContent.substring(0, insertionPoint) + new_text + currentContent.substring(insertionPoint);
            } else {
                return { success: false, error: `Unsupported simple change_type: "${change_type}".` };
            }

            replaceContent(fileId, modifiedContent); 
            return { success: true, message: `Simple text change (${change_type}) applied to "${file.name}".` };
        } catch (e) {
            console.error(`Error applying simple change to file "${file.name}":`, e);
            return { success: false, error: `Error applying simple change: ${e.message}` };
        }
    };

    const executeGrepTool = (args) => {
        const state = ApplicationStateService.getState();
        const allFiles = state.fileRegistry;
        const globalSearchEnabled = state.aiSearchSettings.globalSearchEnabled;
        const { file_id_patterns, pattern, is_regex = false, context_lines = 2 } = args;

        if (!file_id_patterns || !pattern || !Array.isArray(file_id_patterns) || file_id_patterns.length === 0) {
            return { results: [], error: "Missing or invalid required arguments (file_id_patterns must be non-empty array, pattern)." };
        }
        const filesToSearch = [];
        const fileIdsSearched = new Set();
        if (file_id_patterns.includes("*")) {
            if (globalSearchEnabled) {
                Object.values(allFiles).forEach(file => { if (!fileIdsSearched.has(file.id)) { filesToSearch.push(file); fileIdsSearched.add(file.id); }});
            } else {
                if (state.activeFileId && allFiles[state.activeFileId]) { filesToSearch.push(allFiles[state.activeFileId]); fileIdsSearched.add(state.activeFileId); }
                else return { results: [], message: "Global search disabled and no active file. Cannot search with '*'." };
            }
        } else {
            file_id_patterns.forEach(id => { if (allFiles[id] && !fileIdsSearched.has(id)) { filesToSearch.push(allFiles[id]); fileIdsSearched.add(id); }});
            if (filesToSearch.length === 0) return { results: [], message: `No valid open files found for the specified IDs: ${file_id_patterns.join(", ")}.` };
        }
        if (filesToSearch.length === 0) return { results: [], message: "No files selected to search." };
        let regex;
        try {
            const searchPattern = is_regex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
            regex = new RegExp(searchPattern, 'gmi');
        } catch (e) { return { results: [], error: `Invalid regex pattern: ${e.message}` }; }
        const searchResults = []; let totalMatchesFound = 0; const MAX_TOTAL_MATCHES = 50;

        for (const file of filesToSearch) {
            if (totalMatchesFound >= MAX_TOTAL_MATCHES) break;
            const content = getFileContent(file.id); 
            if (content === null || content === undefined) continue;
            const lines = String(content).split('\n'); const matchesInFile = []; regex.lastIndex = 0; let match;
            while ((match = regex.exec(content)) !== null) {
                if (totalMatchesFound >= MAX_TOTAL_MATCHES) break;
                const matchStartIndex = match.index; let currentPos = 0, lineNumber = 0;
                for (let i = 0; i < lines.length; i++) {
                    const lineEndPos = currentPos + lines[i].length;
                    if (matchStartIndex <= lineEndPos) { lineNumber = i + 1; break; }
                    currentPos += lines[i].length + 1;
                }
                if (lineNumber === 0) continue;
                const lineIndex = lineNumber - 1;
                const startContextIndex = Math.max(0, lineIndex - context_lines);
                const endContextIndex = Math.min(lines.length - 1, lineIndex + context_lines);
                const contextSnippet = lines.slice(startContextIndex, endContextIndex + 1).join('\n');
                matchesInFile.push({ line_number: lineNumber, line_text: lines[lineIndex], match_text: match[0], context_snippet: contextSnippet });
                totalMatchesFound++; if (!regex.global) break;
            }
            if (matchesInFile.length > 0) searchResults.push({ file_id: file.id, file_name: file.name, matches: matchesInFile });
        }
        let message = searchResults.length === 0 ? `No matches found for pattern "${pattern}".` : `Found ${totalMatchesFound} matches in ${searchResults.length} file(s).`;
        if (totalMatchesFound >= MAX_TOTAL_MATCHES) message += ` (Result limit of ${MAX_TOTAL_MATCHES} reached).`;
        return { results: searchResults, message: message };
    };

    async function createNewFile(fileName, fileContent) {
        if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
            return { success: false, error: "Invalid or missing file_name." };
        }
        if (fileContent === undefined || fileContent === null || typeof fileContent !== 'string') {
            return { success: false, error: "Invalid or missing file_content (must be a string)." };
        }
        const trimmedFileName = fileName.trim();
        const currentState = ApplicationStateService.getState();
        if (Object.values(currentState.fileRegistry).find(f => f.name.toLowerCase() === trimmedFileName.toLowerCase())) {
            return { success: false, error: `File named "${trimmedFileName}" already exists.` };
        }
        try {
            const newFileId = ApplicationStateService.generateUniqueId();
            ApplicationStateService.dispatch({
                type: 'ADD_LOADED_FILE',
                payload: { id: newFileId, name: trimmedFileName, content: fileContent, language: deriveLanguageFromName(trimmedFileName) }
            });
            AIChatService?.showNotification(`AI created file: "${trimmedFileName}"`, "success");
            return { success: true, message: `File "${trimmedFileName}" created successfully with ID ${newFileId}. It is now active.`, fileId: newFileId };
        } catch (error) {
            AIChatService?.showNotification(`Error creating file "${trimmedFileName}": ${error.message}`, "error");
            return { success: false, error: `Failed to create file "${trimmedFileName}": ${error.message}` };
        }
    }
    
    const handleStateChange = (newState, oldState = {}) => {
        if (newState.activeFileId !== oldState.activeFileId) {
            if (newState.activeFileId) {
                loadContent(newState.activeFileId, newState.fileRegistry);
            } else {
                clearEditor();
            }
        }
        if (newState.viewMode !== oldState.viewMode) {
            if (newState.viewMode === 'edit' && editorInstance) {
                 setTimeout(() => editorInstance.refresh(), 10);
            } else if (newState.viewMode === 'preview') {
                updatePreviewContentOnly();
            }
        }
        // This block handles external updates to the *active* file's content in the state
        // It ensures the editor reflects such changes if it's not the source of the change.
        if (newState.activeFileId &&
            newState.activeFileId === currentFileId && // Active file hasn't changed ID
            oldState.fileRegistry && newState.fileRegistry[newState.activeFileId] &&
            oldState.fileRegistry[newState.activeFileId]?.content !== newState.fileRegistry[newState.activeFileId].content && // But its content *did* change in state
            editorInstance && editorInstance.getValue() !== newState.fileRegistry[newState.activeFileId].content // And editor doesn't reflect it
        ) {
            if (!isApplyingChange) { 
                console.log(`[EditorService Sub] External content change for active file ${currentFileId}. Updating editor.`);
                isApplyingChange = true; // Prevent feedback loop
                const file = newState.fileRegistry[newState.activeFileId];
                const currentCursor = editorInstance.getCursor(); // Preserve cursor
                editorInstance.setValue(String(file.content || ''));
                editorInstance.setCursor(currentCursor); // Restore cursor

                // Update code graph as content changed
                const symbols = CodeAnalysisService.parseCodeForSymbols(currentFileId, String(file.content || ''), file.language);
                ApplicationStateService.dispatch({ type: 'UPDATE_CODE_GRAPH_FOR_FILE', payload: { fileId: currentFileId, symbols } });
                
                setTimeout(() => editorInstance.refresh(), 10); // Refresh CodeMirror
                isApplyingChange = false;
            }
        }
    };

    const init = () => {
        console.log("Initializing EditorService subscriptions...");
        ApplicationStateService.subscribe(handleStateChange);

        // Bug 1 Fix: After editor is initialized and subscriptions are set up,
        // explicitly try to load content for any initially active file.
        // This ensures content is loaded even if the initial state change notification
        // timing was tricky.
        const initialState = ApplicationStateService.getState();
        if (initialState.activeFileId && editorInstance) {
            console.log(`[EditorService.init - Bug 1 Fix] Proactively loading content for initial active file: ${initialState.activeFileId}`);
            loadContent(initialState.activeFileId, initialState.fileRegistry);
        } else if (initialState.activeFileId && !editorInstance) {
            console.warn("[EditorService.init - Bug 1 Fix] Initial activeFileId present, but editorInstance is null. Load will be attempted by subscription if editor initializes later.");
        }


        const debouncedRefresh = debounce(() => editorInstance?.refresh(), DEBOUNCE_INTERVALS.RESIZE);
        window.addEventListener('resize', debouncedRefresh);
        console.log("EditorService subscriptions initialized.");
    };

    return {
        initializeEditor,
        formatContent,
        getContent,
        getCurrentSelection,
        replaceSelection,
        replaceContent, 
        getEditorInstance: () => editorInstance,
        updatePreview: updatePreviewContentOnly, 
        getContentByLineRange,
        getFileContent,
        applyChangeToFile, 
        executeGrepTool,
        createNewFile,
        init,
        loadContent // Expose loadContent for explicit calls if needed elsewhere, though init should handle Bug 1
    };
})();

export const CustomEditorService = CustomEditorServiceInternal;
// --- END OF FILE editorService.js ---