import {
    APP_NAMESPACE,
    GEMINI_DEFAULT_MODEL_NAME,
    GEMINI_APPLY_MODEL_NAME, // Keep if you might use different models
    MAX_CHAT_HISTORY_LENGTH,
    CONTEXT_LINES_AROUND,
    OPEN_FILE_REGISTRY_HEADER,
    FULL_DOCUMENT_CONTEXT_HEADER,
    SYSTEM_INSTRUCTION_TEXT,
    SYSTEM_INSTRUCTION_TEXT_PAD, // NEW: PAD System Instruction
    availableTools
} from './config.js';
import {
    debounce,
    toggleElementVisibility,
    showLoading,
    hideLoading,
    escapeHtml,
    utf8_to_b64,
    b64_to_utf8,
} from './utils.js';
import { ApplicationStateService } from './state.js';
import { CustomEditorService } from './editorService.js';
import { DiffPatcherService } from './diffPatcherService.js';
import { CodeAnalysisService } from './codeAnalysisService.js';

// --- AI Chat Service ---
const AIChatServiceInternal = (() => {
    let genAI = null;
    let currentChatSession = null;
    let currentChatModelInstance = null;
    let isAIInitializing = false;
    let isAIReady = false;
    let chatHistory = [];
    let fileIdForChatHistoryContext = null;
    let isAIPendingResponse = false;
    let autocompleteSuggestionsDiv = null;

    // --- NEW: Dev PAD State ---
    let padChatSession = null;
    let isPadInitialized = false;

    const SYSTEM_INSTRUCTION_TEXT_ACTUAL = SYSTEM_INSTRUCTION_TEXT;
    const SYSTEM_INSTRUCTION_PAD_ACTUAL = SYSTEM_INSTRUCTION_TEXT_PAD; // NEW
    const OPEN_FILE_REGISTRY_HEADER_ACTUAL = OPEN_FILE_REGISTRY_HEADER;
    const FULL_DOCUMENT_CONTEXT_HEADER_ACTUAL = FULL_DOCUMENT_CONTEXT_HEADER;

    async function initializeAI() {
        if (isAIInitializing || isAIReady) return isAIReady;
        isAIInitializing = true;
        isAIReady = false;
        genAI = null; currentChatSession = null; currentChatModelInstance = null;
        console.log("Attempting AI Initialization...");

        const uiElementsToDisable = [
            document.getElementById('floating-ai-chat-trigger'),
            document.getElementById('aiModelSelectorChat'),
            document.getElementById('main-ai-chat-input'),
            document.getElementById('main-ai-chat-send-btn'),
            document.getElementById('toggle-pad-btn') // Disable PAD button until ready
        ];
        uiElementsToDisable.forEach(el => { if (el) el.disabled = true; });

        try {
            await window.sdkInitializationPromise;
            if (!window.AiClass) {
                throw new Error("GoogleGenerativeAI SDK Class (window.AiClass) not found after loader finished.");
            }

            const storageKey = `${APP_NAMESPACE}_gemini_api_key`;
            let apiKey = localStorage.getItem(storageKey);

            if (!apiKey) {
                apiKey = prompt("Please enter your Gemini API Key:");
                if (!apiKey?.trim()) throw new Error("API Key is required for AI features.");
                apiKey = apiKey.trim();
                if (confirm("Remember Gemini API Key for this session? (Will be stored in localStorage)")) {
                    localStorage.setItem(storageKey, apiKey);
                }
            }
            genAI = new window.AiClass(apiKey);
            window.genAiInstance = genAI; 

            if (!genAI?.getGenerativeModel) {
                throw new Error("SDK instance loaded, but required API (getGenerativeModel) is missing.");
            }

            const defaultModelName = getSelectedModelName(); 
            let testModelInstance = genAI.getGenerativeModel({ model: defaultModelName });
            await validateModelAccess(defaultModelName, testModelInstance);

            if (GEMINI_APPLY_MODEL_NAME !== defaultModelName) {
                 let applyModelInstance = genAI.getGenerativeModel({ model: GEMINI_APPLY_MODEL_NAME });
                 await validateModelAccess(GEMINI_APPLY_MODEL_NAME, applyModelInstance);
            }

            console.log("AI Service Initialized Successfully.");
            isAIReady = true;
            showNotification("AI Assistant Ready.", "success", 3000);
            return true;
        } catch (error) {
            console.error("AI Initialization Error:", error);
            showNotification(`AI Init Failed: ${error.message}`, "error", 10000);
            isAIReady = false; genAI = null;
            localStorage.removeItem(`${APP_NAMESPACE}_gemini_api_key`); 
            return false;
        } finally {
            isAIInitializing = false;
            const canUseAI = isAIReady && genAI;
            uiElementsToDisable.forEach(el => { if (el) el.disabled = !canUseAI; });
        }
    }

    async function validateModelAccess(modelName, modelInstance) {
        if (!modelInstance || !modelInstance.countTokens) throw new Error(`Model instance for ${modelName} not valid for validation.`);
        try {
             await modelInstance.countTokens("validation_ping");
        } catch (validationError) {
             const errorStr = String(validationError);
             if (errorStr.includes("API key not valid") || errorStr.includes("permission denied") || errorStr.includes("API_KEY_INVALID")) { throw new Error(`API Key invalid or lacks permission for ${modelName}. Please check your key and its permissions.`); }
             else if (errorStr.includes("quota") || errorStr.includes("rate limit") || errorStr.includes("RESOURCE_EXHAUSTED")) { throw new Error(`Quota exceeded or rate limited for ${modelName}.`); }
             else if (errorStr.includes("Model not found") || errorStr.includes("404")) { throw new Error(`Model ${modelName} not found or unavailable.`); }
             else if (errorStr.includes("invalid content")) { console.warn(`Ignoring 'invalid content' during validation for ${modelName}. This is likely okay.`); }
             else { throw new Error(`Validation failed for ${modelName}: ${validationError.message || errorStr}`); }
        }
    }

    function getSelectedModelName() {
        const modelSelector = document.getElementById('aiModelSelectorChat');
        return modelSelector?.value || GEMINI_DEFAULT_MODEL_NAME;
    }

    function appendThinkingMessage(logElementId, thinkingId) {
        const chatLog = document.getElementById(logElementId);
        if (!chatLog) return;
        const placeholder = chatLog.querySelector('p[style*="text-align:center"]');
        if (placeholder) placeholder.remove();
        const thinkingMessageDiv = document.createElement('div');
        thinkingMessageDiv.id = thinkingId;
        thinkingMessageDiv.dataset.historyId = thinkingId; // For potential updates
        thinkingMessageDiv.classList.add('ai-chat-message', 'ai', 'ai-pending');
        thinkingMessageDiv.innerHTML = `<div class="markdown-preview"><em>AI is thinking...</em></div><span class="timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
        chatLog.appendChild(thinkingMessageDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
        return thinkingId; // Return the ID for later updates
    }

    function showNotification(message, type = 'info', duration = 5000) {
        const area = document.getElementById('notification-area');
        if (!area) return;
        const notificationId = `notif_${Date.now()}`;
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = notificationId;
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <span>${escapeHtml(message)}</span>
            <button class="notification-close" data-dismiss="${notificationId}" aria-label="Close">×</button>
        `;
        area.appendChild(notification);
        const closeButton = notification.querySelector('.notification-close');
        const removeNotif = () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)'; // Or other exit animation
            setTimeout(() => notification.remove(), 500); // Remove after animation
        };
        closeButton?.addEventListener('click', removeNotif);
        if (duration > 0) setTimeout(removeNotif, duration);
    }

    function safeMarkdownToHTML(markdownText) {
        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
            console.warn("Markdown processing libraries (marked/DOMPurify) not available. Displaying raw text.");
            return `<pre>${escapeHtml(String(markdownText))}</pre>`;
        }
        try {
            marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
            const rawHtml = marked.parse(String(markdownText) || ''); // Ensure string input
            return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
        } catch (e) {
            console.error("Error processing markdown:", e);
            return `<pre style="color:red;">Error rendering markdown: ${escapeHtml(e.message)}</pre><pre>${escapeHtml(String(markdownText))}</pre>`;
        }
    }
    function addToHistory(role, parts, idOverride = null, inputTokens = null, outputTokens = null) {
        const newEntryId = idOverride || `${role}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newEntry = { id: newEntryId, role, parts };
        if (inputTokens !== null) newEntry.inputTokens = inputTokens;
        if (outputTokens !== null) newEntry.outputTokens = outputTokens;

        chatHistory.push(newEntry);
        if (chatHistory.length > MAX_CHAT_HISTORY_LENGTH) {
            chatHistory.splice(0, chatHistory.length - MAX_CHAT_HISTORY_LENGTH);
        }
        return newEntryId;
    }

    function getHistoryForNewSession() {
        const historyForSDK = [];
        const currentInternalHistory = [...chatHistory];

        for (const entry of currentInternalHistory) {
            if (entry.role === 'user') {
                const textParts = entry.parts.filter(p => p.text).map(p => ({ text: p.text }));
                if (textParts.length > 0) {
                    historyForSDK.push({ role: 'user', parts: textParts });
                }
            } else if (entry.role === 'model') {
                const modelParts = entry.parts.map(part => {
                    if (part.text) return { text: part.text };
                    if (part.functionCall) return { functionCall: part.functionCall };
                    return null;
                }).filter(p => p !== null);

                if (modelParts.length > 0) {
                    historyForSDK.push({ role: 'model', parts: modelParts });
                }
            }
        }
        
        let firstUserTurnIndex = -1;
        for (let i = 0; i < historyForSDK.length; i++) {
            if (historyForSDK[i].role === 'user') {
                firstUserTurnIndex = i;
                break;
            }
        }

        if (historyForSDK.length > 0 && firstUserTurnIndex === -1) {
            console.warn("[AIChatService] getHistoryForNewSession: SDK history has no user turn after filtering. Clearing for safety.");
            return [];
        }

        if (firstUserTurnIndex > 0) {
            console.warn(`[AIChatService] getHistoryForNewSession: SDK history started with role '${historyForSDK[0].role}'. Slicing ${firstUserTurnIndex} entries.`);
            return historyForSDK.slice(firstUserTurnIndex);
        }
        
        return historyForSDK;
    }


    function clearChatHistoryData() {
        console.trace("[AIChatService] clearChatHistoryData() CALLED.");
        chatHistory = [];
        fileIdForChatHistoryContext = null; 
        const chatLog = document.getElementById('main-ai-chat-log');
        if (chatLog) {
            const selectionContextDiv = chatLog.querySelector('#main-ai-chat-selection-context');
            chatLog.innerHTML = ''; 
            if (selectionContextDiv) { 
                chatLog.appendChild(selectionContextDiv);
            }
            const placeholder = document.createElement('p');
            placeholder.style.textAlign = 'center';
            placeholder.style.color = '#777';
            placeholder.style.fontStyle = 'italic';
            placeholder.textContent = 'Ask a question about the current document...';
            chatLog.appendChild(placeholder);
        }
        console.log("[AIChatService] Chat history and UI cleared by clearChatHistoryData().");
    }

    function updateChatContextDisplay() {
        const contextDiv = document.getElementById('main-ai-chat-selection-context');
        const contextCode = document.getElementById('main-ai-chat-context-code');
        if (!contextDiv || !contextCode) return;

        const selection = CustomEditorService.getCurrentSelection();
        if (selection && selection.text.trim() !== '') {
            contextCode.textContent = selection.text.length > 500 ? selection.text.substring(0, 497) + "..." : selection.text;
            contextDiv.classList.remove('is-hidden');
        } else {
            contextDiv.classList.add('is-hidden');
            contextCode.textContent = '';
        }
    }

    async function executeToolCall(functionCall) {
        const { name, args } = functionCall;
        let resultPayload = { success: false, error: 'Unknown tool execution error' };

        console.log(`[AI Service] Attempting to execute tool: ${name}. Full arguments received:`, JSON.parse(JSON.stringify(args || {})));

        try {
            switch (name) {
                case 'get_document_context':
                    if (!args.file_id || !ApplicationStateService.getState().fileRegistry[args.file_id]) {
                        throw new Error(`Invalid or missing file_id: '${args.file_id}'. Check OPEN FILE REGISTRY.`);
                    }
                    const startLine = parseInt(args.start_line, 10);
                    const endLine = parseInt(args.end_line, 10);
                    if (isNaN(startLine) || isNaN(endLine) || startLine <= 0 || endLine < startLine) {
                         throw new Error(`Invalid start_line (${args.start_line}) or end_line (${args.end_line}). Must be positive numbers, end >= start.`);
                    }
                    const content = CustomEditorService.getContentByLineRange(startLine, endLine, args.file_id);
                    if (content.startsWith("Error:")) { 
                        resultPayload = { success: false, error: content };
                    } else {
                        resultPayload = { success: true, content: content, file_id: args.file_id, start_line: args.start_line, end_line: args.end_line };
                    }
                    break;
                case 'grep_files':
                    if (!args.file_id_patterns || !Array.isArray(args.file_id_patterns) || args.file_id_patterns.length === 0) {
                        throw new Error("Missing or invalid 'file_id_patterns' for grep_files (must be a non-empty array).");
                    }
                    if (!args.pattern || typeof args.pattern !== 'string') {
                        throw new Error("Missing or invalid 'pattern' for grep_files (must be a string).");
                    }
                    const grepResult = CustomEditorService.executeGrepTool(args);
                    resultPayload = { success: true, ...grepResult }; 
                    break;
                case 'fetch_rules':
                    if (!args.rule_name || typeof args.rule_name !== 'string') {
                        throw new Error("Missing or invalid 'rule_name' for fetch_rules.");
                    }
                    const ruleData = ApplicationStateService.getState().userRules?.[args.rule_name];
                    if (ruleData) {
                        resultPayload = { success: true, rule_name: args.rule_name, content: ruleData.content, description: ruleData.description };
                    } else {
                        resultPayload = { success: false, error: `Rule named "${args.rule_name}" not found in <available_instructions>.` };
                    }
                    break;
                case 'create_new_file':
                    if (!args.file_name || typeof args.file_name !== 'string' || !args.file_name.trim()) {
                         throw new Error("Missing or invalid 'file_name' for create_new_file.");
                    }
                    if (typeof args.file_content !== 'string') { 
                         throw new Error("'file_content' must be a string for create_new_file.");
                    }
                    resultPayload = await CustomEditorService.createNewFile(args.file_name, args.file_content);
                    break;
                case 'get_code_symbols_outline': {
                    const { file_id, symbol_name } = args;
                    if (!file_id) { throw new Error("Missing required 'file_id' for get_code_symbols_outline."); }

                    const state = ApplicationStateService.getState();
                    const fileData = state.fileRegistry[file_id];
                    if (!fileData) {
                        resultPayload = { success: false, error: `File ID "${file_id}" not found.` };
                        break;
                    }
                    let graphEntry = state.codeGraph[file_id];
                    if (!graphEntry || !graphEntry.symbols || graphEntry.symbols.length === 0) {
                        console.warn(`[AI Tool] Code graph for ${file_id} empty or missing, attempting on-the-fly parse.`);
                        const currentContent = CustomEditorService.getFileContent(file_id);
                        if (currentContent === null || currentContent === undefined) {
                             resultPayload = { success: false, error: `Content for file "${fileData.name}" (ID: ${file_id}) is not available for on-the-fly symbol parsing.` };
                             break;
                        }
                        const symbols = CodeAnalysisService.parseCodeForSymbols(file_id, currentContent, fileData.language);
                        ApplicationStateService.dispatch({ type: 'UPDATE_CODE_GRAPH_FOR_FILE', payload: { fileId: file_id, symbols } });
                        graphEntry = { symbols }; 
                    }

                    if (symbol_name) {
                        const targetSymbol = graphEntry.symbols.find(s => s.name === symbol_name);
                        if (targetSymbol) {
                            const definition = CodeAnalysisService.getSymbolDefinition(file_id, targetSymbol.name, targetSymbol.line, fileData.language);
                            if (definition.startsWith("Error:")) {
                                 resultPayload = { success: false, error: `Error fetching definition for symbol "${symbol_name}": ${definition}` };
                            } else {
                                 resultPayload = { success: true, file_id: file_id, file_name: fileData.name, symbol: targetSymbol, definition_snippet: definition, message: `Definition snippet for symbol "${symbol_name}" retrieved.` };
                            }
                        } else {
                            resultPayload = { success: false, error: `Symbol "${symbol_name}" not found in ${fileData.name}. Available symbols: ${graphEntry.symbols.map(s=>s.name).join(', ') || 'None found'}` };
                        }
                    } else {
                        resultPayload = { success: true, file_id: file_id, file_name: fileData.name, symbols: graphEntry.symbols, message: `Found ${graphEntry.symbols.length} symbols in ${fileData.name}.` };
                    }
                    break;
                }
                case 'apply_chunk_update_with_context':
                    if (!args.file_id || !args.explanation ||
                        args.new_chunk_content === undefined || 
                        args.context_before_chunk === undefined || 
                        args.context_after_chunk === undefined ||
                        !args.original_start_line || !args.original_end_line) {
                        throw new Error("Missing one or more required arguments for apply_chunk_update_with_context. Check: file_id, explanation, new_chunk_content, context_before_chunk, context_after_chunk, original_start_line, original_end_line.");
                    }
                    resultPayload = {
                        success: true, 
                        message: "User action required to apply this chunk update. AI has proposed a modification.",
                        status: "PENDING_USER_APPROVAL", 
                        proposed_change_details: args 
                    };
                    break;
                default:
                    resultPayload = { success: false, error: `Tool "${name}" is not supported.` };
            }
        } catch (error) {
            console.error(`[AI Service] Error during PREPARATION or EXECUTION of tool ${name}:`, error);
            resultPayload = { success: false, error: error.message || `An internal error occurred during ${name} tool execution.` };
        }
        console.log(`[AI Service] Tool ${name} execution finished. Result success: ${resultPayload.success}, Status: ${resultPayload.status || 'N/A'}`);
        return { functionResponse: { name: name, response: resultPayload }};
    }


    async function handleSendChatMessage() {
        const inputElement = document.getElementById('main-ai-chat-input'); const sendButton = document.getElementById('main-ai-chat-send-btn'); const chatLog = document.getElementById('main-ai-chat-log');
        if (!inputElement || !sendButton || !chatLog) return;
        const userPrompt = inputElement.value.trim(); if (!userPrompt) return;
        if (!isAIReady || !genAI) { showNotification("AI not ready.", "warning"); return; }
        if (isAIPendingResponse) { showNotification("AI is busy...", "info", 2000); return; }

        isAIPendingResponse = true; const originalInputValue = inputElement.value;
        inputElement.value = ''; inputElement.style.height = ''; sendButton.disabled = true; inputElement.disabled = true;

        const state = ApplicationStateService.getState(); const activeFileId = state.activeFileId; const activeFile = state.fileRegistry[activeFileId]; const editor = CustomEditorService.getEditorInstance();
        if (!activeFile || !editor) {
            showNotification("Cannot send message: No active file or editor.", "error");
            isAIPendingResponse = false; inputElement.value = originalInputValue; inputElement.disabled = false; sendButton.disabled = false; return;
        }

        const modelName = getSelectedModelName();
        let sessionObjectNeedsRecreation = false;
        let historyAndUiNeedsClear = false;
        let addFullActiveFileContextToPrompt = false;

        if (activeFileId !== fileIdForChatHistoryContext && fileIdForChatHistoryContext !== null) {
            addFullActiveFileContextToPrompt = true;
        }

        if (!currentChatSession || !currentChatModelInstance || currentChatModelInstance.model !== modelName) {
            sessionObjectNeedsRecreation = true;
        }
        if (historyAndUiNeedsClear) sessionObjectNeedsRecreation = true;


        console.log(`[AIChatService] handleSendChatMessage: activeFileId = ${activeFileId}, fileIdForChatHistoryContext = ${fileIdForChatHistoryContext}, historyAndUiNeedsClear = ${historyAndUiNeedsClear}, sessionObjectNeedsRecreation = ${sessionObjectNeedsRecreation}`);

        if (historyAndUiNeedsClear) {
            console.log("[AIChatService] Clearing chat due to historyAndUiNeedsClear = true in handleSendChatMessage.");
            clearChatHistoryData();
        }

        if (chatHistory.length === 0 || activeFileId !== fileIdForChatHistoryContext) {
            fileIdForChatHistoryContext = activeFileId;
            console.log(`[AIChatService] Set fileIdForChatHistoryContext to: ${activeFileId}`);
        }


        const docLang = activeFile.language || 'plaintext';
        let contextForPrompt = `Current Active File: "${activeFile.name}" (ID: ${activeFile.id}, Lang: ${docLang})\n`;
        if (addFullActiveFileContextToPrompt) {
            const fullContent = activeFile.content || '';
            contextForPrompt += `\n${FULL_DOCUMENT_CONTEXT_HEADER_ACTUAL}${activeFile.id}, Lang: ${docLang}):\n\`\`\`${docLang}\n${fullContent}\n\`\`\`\n`;
        }

        let attachedFilesContext = ""; const mentionRegex = /@([\w.-]+)/g; let match; const mentionedFileNames = new Set();
        while ((match = mentionRegex.exec(userPrompt)) !== null) {
            const mentionedName = match[1]; if (mentionedFileNames.has(mentionedName.toLowerCase())) continue;
            const foundFileEntry = Object.values(state.fileRegistry).find(f => f.name.toLowerCase() === mentionedName.toLowerCase());
            if (foundFileEntry && foundFileEntry.id !== activeFileId) {
                const fileContent = foundFileEntry.content || ''; const fileLang = foundFileEntry.language || 'plaintext';
                attachedFilesContext += `\n<attached_files file_id="${foundFileEntry.id}" file_name="${foundFileEntry.name}">\n\`\`\`${fileLang}\n${fileContent}\n\`\`\`\n</attached_files>\n`;
                mentionedFileNames.add(mentionedName.toLowerCase());
            }
        }
        if (attachedFilesContext) { contextForPrompt = attachedFilesContext + contextForPrompt; }

        const selectionInfo = CustomEditorService.getCurrentSelection(); const totalLines = editor.lineCount();
        if (selectionInfo && selectionInfo.text.trim() !== '') {
            const startLine = Math.max(0, selectionInfo.startPos.line - CONTEXT_LINES_AROUND); const endLine = Math.min(totalLines - 1, selectionInfo.endPos.line + CONTEXT_LINES_AROUND); const relevantContext = editor.getRange({ line: startLine, ch: 0 }, { line: endLine, ch: editor.getLine(endLine)?.length ?? 0 }); contextForPrompt += `\nRELEVANT DOCUMENT SNIPPET (Around Selection L${selectionInfo.startPos.line + 1}-L${selectionInfo.endPos.line + 1}, Context L${startLine + 1}-L${endLine + 1}):\n\`\`\`${docLang}\n${relevantContext}\n\`\`\`\n`; contextForPrompt += `\nSELECTED TEXT (L${selectionInfo.startPos.line + 1}-L${selectionInfo.endPos.line + 1}):\n\`\`\`${docLang}\n${selectionInfo.text}\n\`\`\`\n`;
        } else { 
            const cursorPos = editor.getCursor();
            const startLine = Math.max(0, cursorPos.line - CONTEXT_LINES_AROUND); const endLine = Math.min(totalLines - 1, cursorPos.line + CONTEXT_LINES_AROUND); const relevantContext = editor.getRange({ line: startLine, ch: 0 }, { line: endLine, ch: editor.getLine(endLine)?.length ?? 0 }); contextForPrompt += `\nRELEVANT DOCUMENT SNIPPET (Around Cursor L${cursorPos.line + 1}, Context L${startLine + 1}-L${endLine + 1}):\n\`\`\`${docLang}\n${relevantContext}\n\`\`\`\n`;
        }

        const openFiles = Object.values(state.fileRegistry).map(f => `- "${f.name}" (ID: ${f.id}, Lang: ${f.language || 'plaintext'})`); const globalSearchStatus = state.aiSearchSettings.globalSearchEnabled ? "ENABLED" : "DISABLED"; contextForPrompt += `\n${OPEN_FILE_REGISTRY_HEADER_ACTUAL} (Global Search for grep_files: ${globalSearchStatus})\n${openFiles.join('\n')}\n`;
        const ruleNames = Object.keys(state.userRules || {});
        if (ruleNames.length > 0) { const ruleList = ruleNames.map(name => `- ${name}: ${state.userRules[name].description || '(No description)'}`); contextForPrompt += `\n<available_instructions>\n${ruleList.join('\n')}\n</available_instructions>\n`;}
        contextForPrompt += `\n\nUSER REQUEST:\n${userPrompt}`; 
        const userMessageForApi = contextForPrompt;


        const uiHistoryId = appendMessageToChat('main-ai-chat-log', 'user', [{ text: userPrompt }]);
        if (!uiHistoryId) {
            showNotification("Error displaying user message or adding to history.", "error");
            isAIPendingResponse = false; inputElement.disabled=false; sendButton.disabled=false;
            return;
        }
        const userHistoryEntryForApi = chatHistory.find(entry => entry.id === uiHistoryId && entry.role === 'user');
        if (userHistoryEntryForApi) {
            userHistoryEntryForApi.parts = [{ text: userMessageForApi }];
        } else {
            console.warn("[AI Service] Could not find initial history entry to update with full API prompt.");
        }


        const thinkingId = `main_thinking_${Date.now()}`; appendThinkingMessage('main-ai-chat-log', thinkingId);
        const generationConfig = { temperature: 0.75 }; 
        const safetySettings = [ { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }, { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }, { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }, { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }, ];

        try {
            if (sessionObjectNeedsRecreation) {
                 const historyForNewChat = getHistoryForNewSession();
                 console.log("[AIChatService] Starting new chat session. History for SDK (last 4 entries shown):", JSON.stringify(historyForNewChat.slice(-4).map(h => ({role: h.role, parts: h.parts.map(p => Object.keys(p)[0])}) ), null, 2) );
                 currentChatModelInstance = genAI.getGenerativeModel({ model: modelName, tools: availableTools, systemInstruction: SYSTEM_INSTRUCTION_TEXT_ACTUAL, generationConfig, safetySettings });
                 currentChatSession = currentChatModelInstance.startChat({ history: historyForNewChat });
            }
            console.log("[AIChatService] Sending message to AI model...");
            const result = await currentChatSession.sendMessage(userMessageForApi);
            console.log("[AIChatService] Received response from AI model (raw):", JSON.parse(JSON.stringify(result || {})));
            if (!result || !result.response) throw new Error("Received no response from AI chat.");
            await processAIResponse(result.response, thinkingId);
        } catch (error) {
            console.error("Error during AI chat communication:", error, error.stack);
            let errorMessage = `Error: ${error.message || "Unknown error during AI communication"}`;
            if (String(error.message).includes("[500 ]") || String(error.message).includes("FETCH_ERROR")) { 
                errorMessage += ". This might be a temporary Google API issue or network problem. Please try again shortly, or try a different model.";
            }
            await updateThinkingMessage(thinkingId, [{ text: errorMessage }], null);
            isAIPendingResponse = false; if (inputElement) inputElement.disabled = false; if (sendButton) sendButton.disabled = false;
        }
    }
    
    // --- START OF NEW DEV PAD FUNCTIONS ---

    async function initializePadSession() {
        if (!isAIReady || !genAI) {
            showNotification("AI is not ready for PAD session.", "error");
            ApplicationStateService.dispatch({ type: 'PAD_SET_GENERATING', payload: false });
            return;
        }

        console.log("[PAD Service] Initializing new PAD session...");
        ApplicationStateService.dispatch({ type: 'PAD_RESET' });
        
        // This is a user-facing prompt that will be shown in the UI.
        const userFacingPrompt = "Please analyze my open files, create an initial Project Architecture Document (PAD), and ask what I'd like to do next.";
        
        isPadInitialized = true;
        // The true flag indicates this is the first, special call.
        await handleSendPadMessage(userFacingPrompt, true);
    }
    
    // This is the main function for a PAD turn. It handles user input and tool calls.
    async function handleSendPadMessage(promptText, isInitial = false) {
        if (!isAIReady || !genAI) { 
            showNotification("AI not ready.", "warning"); 
            ApplicationStateService.dispatch({ type: 'PAD_SET_GENERATING', payload: false });
            return;
        }

        // *** FIX: REMOVED THE BLOCKING CHECK ***
        // This check was causing the deadlock. The UI button's disabled state is sufficient
        // to prevent the *user* from sending multiple requests.
        // if (ApplicationStateService.getState().padState.isGenerating) { 
        //     showNotification("PAD AI is busy...", "info", 2000); 
        //     return; 
        // }

        if (!isPadInitialized && !isInitial) {
            await initializePadSession();
            return;
        }
    
        ApplicationStateService.dispatch({ type: 'PAD_SET_GENERATING', payload: true });
    
        let promptForApi = promptText;
        if (isInitial) {
            let fileContext = "";
            const state = ApplicationStateService.getState();
            const openFiles = Object.values(state.fileRegistry);
    
            if (openFiles.length === 0) {
                fileContext = "There are no files open. ";
            } else {
                openFiles.forEach(file => {
                    fileContext += `--- START OF FILE ${file.name} (ID: ${file.id}) ---\n${file.content}\n--- END OF FILE ${file.name} ---\n\n`;
                });
            }
            promptForApi = `This is the initial analysis request. Please analyze the following context and then respond with the first PAD.\n\n${fileContext}\n\nUser's Goal: ${promptText}`;
        }
    
        try {
            const currentPadState = ApplicationStateService.getState().padState;
            const historyForSDK = currentPadState.history.map(h => ({ role: h.role, parts: h.parts }));
    
            const modelName = getSelectedModelName();
            const padModelInstance = genAI.getGenerativeModel({ model: modelName, tools: availableTools, systemInstruction: SYSTEM_INSTRUCTION_PAD_ACTUAL });
            padChatSession = padModelInstance.startChat({ history: historyForSDK });
    
            console.log("[PAD Service] Sending message to AI model...");
            const result = await padChatSession.sendMessage(promptForApi);
    
            await processPadResponse(result.response, promptText);
    
        } catch (error) {
            console.error("Error during PAD AI communication:", error);
            showNotification(`PAD Error: ${error.message}`, "error");
            const errorPad = {
                projectTitle: "Error",
                projectStatement: `An error occurred: ${error.message}. Please check the console and try again.`,
                clarificationQuestions: []
            };
            ApplicationStateService.dispatch({
                type: 'PAD_UPDATE',
                payload: {
                    userHistory: { role: 'user', parts: [{ text: promptText }] },
                    modelHistory: { role: 'model', parts: [{ text: JSON.stringify(errorPad) }] },
                    pad: errorPad
                }
            });
            // Also ensure the generating flag is turned off on error.
            ApplicationStateService.dispatch({ type: 'PAD_SET_GENERATING', payload: false });
        }
    }
    
    // This new function handles the response from the AI, including multi-turn tool calls.
    async function processPadResponse(response, originalUserPrompt) {
        const candidate = response.candidates?.[0];
        if (!candidate) {
            throw new Error("Received no valid candidate from AI.");
        }
    
        const functionCalls = candidate.content?.parts.filter(p => p.functionCall).map(p => p.functionCall);
    
        // CASE 1: The AI's response has no more tool calls. It's the final answer.
        if (!functionCalls || functionCalls.length === 0) {
            const rawText = candidate.content?.parts.map(p => p.text).join('') || '';
            const jsonStart = rawText.indexOf('{');
            const jsonEnd = rawText.lastIndexOf('}');
    
            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error("AI response did not contain a valid JSON PAD object.");
            }
            const jsonString = rawText.substring(jsonStart, jsonEnd + 1);
            const padData = JSON.parse(jsonString);
    
            // Dispatch the final update with the original user prompt and the final model response.
            ApplicationStateService.dispatch({
                type: 'PAD_UPDATE',
                payload: {
                    userHistory: { role: 'user', parts: [{ text: originalUserPrompt }] },
                    modelHistory: candidate.content,
                    pad: padData
                }
            });
            // CRITICAL FIX: Set generating to false since the turn is complete.
            // This happens in the PAD_UPDATE reducer now.
            return; // End of the chain.
        }
    
        // CASE 2: The AI's response has tool calls.
        
        // First, dispatch an interim update to show the user the AI is calling a tool.
        ApplicationStateService.dispatch({
            type: 'PAD_UPDATE',
            payload: {
                userHistory: { role: 'user', parts: [{ text: originalUserPrompt }] },
                modelHistory: candidate.content,
                pad: ApplicationStateService.getState().padState.currentPad // Keep the last valid PAD for now
            }
        });
    
        // Execute the tool calls.
        const functionResponses = [];
        for (const call of functionCalls) {
            const toolResultPart = await executeToolCall(call);
            functionResponses.push(toolResultPart);
        }
    
        // Send the tool results back to the AI.
        const nextResult = await padChatSession.sendMessage(functionResponses);
    
        // Recursively process the AI's *next* response, carrying the original user prompt forward.
        await processPadResponse(nextResult.response, originalUserPrompt);
    }
    
    // --- END OF NEW DEV PAD FUNCTIONS ---

    function createAutocompleteSuggestionsDiv() {
        if (autocompleteSuggestionsDiv && document.body.contains(autocompleteSuggestionsDiv)) return;
        autocompleteSuggestionsDiv = document.createElement('div');
        autocompleteSuggestionsDiv.id = 'chat-filename-suggestions';
        autocompleteSuggestionsDiv.classList.add('autocomplete-suggestions', 'is-hidden');
        autocompleteSuggestionsDiv.innerHTML = '<ul></ul>';
        const inputArea = document.getElementById('main-ai-chat-input-area');
        if (inputArea) {
            inputArea.insertBefore(autocompleteSuggestionsDiv, inputArea.firstChild); // Insert before the textarea
        } else {
            console.error("AI Chat Input area not found for autocomplete suggestions.");
        }
    }
    function updateAutocompleteSuggestions(query) {
        if (!autocompleteSuggestionsDiv) createAutocompleteSuggestionsDiv();
        const listElement = autocompleteSuggestionsDiv.querySelector('ul');
        if (!listElement) return;

        listElement.innerHTML = ''; // Clear previous suggestions
        const files = ApplicationStateService.getState().fileRegistry;
        const matchingFiles = Object.values(files)
            .filter(file => file.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5); // Limit to 5 suggestions

        if (matchingFiles.length > 0) {
            matchingFiles.forEach(file => {
                const listItem = document.createElement('li');
                listItem.textContent = file.name;
                listItem.addEventListener('mousedown', (e) => { // Use mousedown to fire before blur on input
                    e.preventDefault(); // Prevent input blur
                    const chatInput = document.getElementById('main-ai-chat-input');
                    if (chatInput) {
                        const currentVal = chatInput.value;
                        const atIndex = currentVal.lastIndexOf('@');
                        if (atIndex !== -1) {
                            chatInput.value = currentVal.substring(0, atIndex + 1) + file.name + " "; // Add space after
                        } else { // Should not happen if @ was typed
                            chatInput.value += "@" + file.name + " ";
                        }
                        chatInput.focus();
                        window.autoResizeChatInput(); // Resize after update
                        chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length; // Move cursor to end
                    }
                    autocompleteSuggestionsDiv.classList.add('is-hidden');
                });
                listElement.appendChild(listItem);
            });
            autocompleteSuggestionsDiv.classList.remove('is-hidden');
        } else {
            autocompleteSuggestionsDiv.classList.add('is-hidden');
        }
    }


    async function processAIResponse(response, thinkingId) {
        console.log("[AIChatService] Processing AI response object:", JSON.parse(JSON.stringify(response || {})));

        let outputTokens = null; let inputTokens = null;
        if (!response) {
            console.error("[AIChatService] processAIResponse: Received null or undefined response object.");
            await updateThinkingMessage(thinkingId, [{ text: "Error: Received empty response object from AI." }], null);
            isAIPendingResponse = false; return;
        }
        if (response.promptFeedback?.blockReason) {
            const reason = response.promptFeedback.blockReason;
            const safetyRatings = response.promptFeedback.safetyRatings || [];
            console.warn(`[AIChatService] AI response blocked. Reason: ${reason}. Safety Ratings:`, JSON.stringify(safetyRatings));
            let blockMessage = `Error: AI response blocked due to ${reason}.`;
            if (safetyRatings.length > 0) {
                 blockMessage += ` Details: ${safetyRatings.map(r => `${r.category} was ${r.probability}`).join(', ')}.`;
            }
            await updateThinkingMessage(thinkingId, [{ text: blockMessage }], null);
            isAIPendingResponse = false; return;
        }
        if (!response.candidates?.[0]) {
            console.error("[AIChatService] processAIResponse: No valid candidate in AI response. Full response:", JSON.parse(JSON.stringify(response)));
            await updateThinkingMessage(thinkingId, [{ text: "Error: No valid candidate in AI response." }], null);
            isAIPendingResponse = false; return;
        }

        const candidate = response.candidates[0];
        console.log("[AIChatService] Processing AI candidate:", JSON.parse(JSON.stringify(candidate || {})));

        const responseContent = candidate.content;
        if (!responseContent || !responseContent.parts || responseContent.role !== 'model') {
            console.error("[AIChatService] processAIResponse: Invalid content structure in AI candidate. Candidate content:", JSON.parse(JSON.stringify(responseContent || {})));
            await updateThinkingMessage(thinkingId, [{ text: "Error: Invalid content structure in AI response." }], null);
            isAIPendingResponse = false; return;
        }
        const responseParts = responseContent.parts || []; // Ensure responseParts is always an array
        console.log("[AIChatService] Extracted response parts:", JSON.parse(JSON.stringify(responseParts)));


        // Extract token counts
        try { if (candidate.usageMetadata) { inputTokens = candidate.usageMetadata.promptTokenCount; outputTokens = candidate.usageMetadata.totalTokenCount ?? candidate.usageMetadata.candidatesTokenCount; } else if (response.usageMetadata) { inputTokens = response.usageMetadata.promptTokenCount; outputTokens = response.usageMetadata.totalTokenCount; } } catch (e) { console.warn("Could not extract token count metadata:", e); }

        await updateThinkingMessage(thinkingId, responseParts, outputTokens, inputTokens);

        const functionCalls = responseParts.filter(part => part.functionCall).map(part => part.functionCall);
        if (functionCalls.length > 0) {
            console.log(`[AIChatService] Found ${functionCalls.length} function call(s) in response parts. Preparing to execute.`);
            const functionResponsesToSend = [];
            let requiresAnotherTurnBasedOnThisResponse = false; 

            for (const call of functionCalls) {
                const toolResultPart = await executeToolCall(call); 
                functionResponsesToSend.push(toolResultPart); 

                const toolExecutionActualSuccess = toolResultPart.functionResponse.response.success;
                const toolStatus = toolResultPart.functionResponse.response.status;

                if (call.name === 'apply_chunk_update_with_context' &&
                    toolExecutionActualSuccess === true &&
                    toolStatus === "PENDING_USER_APPROVAL") {
                    // This specific call is pending user, so it doesn't force an immediate AI turn by itself.
                } else {
                    requiresAnotherTurnBasedOnThisResponse = true;
                }
            }

            if (requiresAnotherTurnBasedOnThisResponse && functionResponsesToSend.length > 0) {
                 console.log("[AIChatService] Sending function results back to AI model for further processing as at least one tool call requires AI reaction.");
                 await sendFunctionResultAndGetResponse(functionResponsesToSend);
            } else if (functionResponsesToSend.length > 0) {
                 console.log("[AIChatService] All function calls resulted in PENDING_USER_APPROVAL or no further AI turn required for now.");
                 isAIPendingResponse = false;
                 const sendButton = document.getElementById('main-ai-chat-send-btn');
                 const inputElement = document.getElementById('main-ai-chat-input');
                 if(sendButton) sendButton.disabled = false;
                 if(inputElement) inputElement.disabled = false;
            } else {
                console.log("[AIChatService] No function calls were processed or no responses to send. Interaction might be complete.");
                isAIPendingResponse = false;
                 const sendButton = document.getElementById('main-ai-chat-send-btn');
                 const inputElement = document.getElementById('main-ai-chat-input');
                 if(sendButton) sendButton.disabled = false;
                 if(inputElement) inputElement.disabled = false;
            }
        } else {
            console.log("[AIChatService] No function calls in response. AI interaction turn complete.");
            isAIPendingResponse = false;
            const sendButton = document.getElementById('main-ai-chat-send-btn');
            const inputElement = document.getElementById('main-ai-chat-input');
            if(sendButton) sendButton.disabled = false;
            if(inputElement) inputElement.disabled = false;
        }
    }

    async function sendFunctionResultAndGetResponse(functionResponseParts) { 
        if (!currentChatSession) {
            showNotification("Error: Chat session not active for sending function results.", "error");
            isAIPendingResponse = false; return;
        }

        addToHistory('function_result_internal', functionResponseParts);

        const thinkingId = `main_thinking_fn_resp_${Date.now()}`;
        appendThinkingMessage('main-ai-chat-log', thinkingId);
        console.log("[AIChatService] Sending function response parts to AI model:", JSON.parse(JSON.stringify(functionResponseParts)));

        try {
            const result = await currentChatSession.sendMessage(functionResponseParts);
            console.log("[AIChatService] Received response from AI model after sending function results (raw):", JSON.parse(JSON.stringify(result || {})));
            if (!result || !result.response) throw new Error("Received no response from AI after function results.");
            await processAIResponse(result.response, thinkingId);
        } catch (error) {
            console.error("Error sending function results or processing AI response:", error, error.stack);
            let errorMessage = `Error after tool use: ${error.message || "Unknown error processing AI response after tool use"}`;
            if (String(error.message).includes("[500 ]") || String(error.message).includes("FETCH_ERROR")) {
                errorMessage += ". This might be a temporary Google API issue or network problem. Please try again shortly.";
            }
            await updateThinkingMessage(thinkingId, [{ text: errorMessage }], null); 
            isAIPendingResponse = false; const sendButton = document.getElementById('main-ai-chat-send-btn'); const inputElement = document.getElementById('main-ai-chat-input'); if(sendButton) sendButton.disabled = false; if(inputElement) inputElement.disabled = false;
        }
    }

    function appendMessageToChat(logElementId, role, parts, historyIdOverride = null) {
        const chatLog = document.getElementById(logElementId); if (!chatLog) return null;
        const placeholder = chatLog.querySelector('p[style*="text-align:center"]'); if (placeholder) placeholder.remove();

        const historyId = historyIdOverride || addToHistory(role, parts); 
        if (!historyId) return null;

        const historyEntry = chatHistory.find(entry => entry.id === historyId);
        const messageDiv = document.createElement('div'); messageDiv.dataset.historyId = historyId; messageDiv.classList.add('ai-chat-message', role);
        const hasToolUse = parts.some(part => part.functionCall || part.functionResponse); if (hasToolUse) messageDiv.classList.add('ai-tool-use'); if (role === 'model' && parts[0]?.text?.toLowerCase().startsWith("error:")) messageDiv.classList.add('error');
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); let messageContentHTML = ''; let tokenHTML = '';
        if (historyEntry) { const i = historyEntry.inputTokens; const o = historyEntry.outputTokens; if (i !== undefined && i !== null) tokenHTML += ` (In: ${i})`; if (o !== undefined && o !== null) tokenHTML += ` (Out: ${o})`; }

        parts.forEach(part => {
             if (part.text) { messageContentHTML += safeMarkdownToHTML(String(part.text)); }
             else if (part.functionCall) { 
                 let argsString = '(No args)'; try { argsString = JSON.stringify(part.functionCall.args) || '{}'; } catch {}
                 const callArgs = part.functionCall.args;
                 if (part.functionCall.name === 'apply_chunk_update_with_context' && callArgs.new_chunk_content !== undefined) {
                     messageContentHTML += `<div class="ai-tool-call-info"><strong>🤖 AI proposing chunk update:</strong> <span class="tool-explanation">${escapeHtml(callArgs.explanation || '')}</span><details><summary>Show Proposed New Chunk Content</summary><pre class="diff-display"><code>${escapeHtml(String(callArgs.new_chunk_content).substring(0, 700))}${String(callArgs.new_chunk_content).length > 700 ? '...' : ''}</code></pre></details></div>`;
                 } else {
                     messageContentHTML += `<div class="ai-tool-call-info"><strong>🛠️ Calling Tool:</strong> ${escapeHtml(part.functionCall.name)} <pre>${escapeHtml(argsString.substring(0, 250))}${argsString.length > 250 ? '...' : ''}</pre></div>`;
                 }
             }
             else if (part.functionResponse) {
                  let responseSummary = "(No content)"; const responseData = part.functionResponse.response; const toolName = part.functionResponse.name;
                  try {
                      if (responseData) {
                           if (responseData.error) responseSummary = `Error: ${responseData.error}`;
                           else if (responseData.message) responseSummary = `Msg: ${responseData.message}`;
                           else if (responseData.status) responseSummary = `Status: ${responseData.status}`;
                           else if (toolName === 'grep_files' && Array.isArray(responseData.results)) { const matchCount = responseData.results.reduce((sum, fileResult) => sum + (fileResult.matches?.length || 0), 0); responseSummary = `Found ${matchCount} matches in ${responseData.results.length} file(s).`; }
                           else if (toolName === 'get_code_symbols_outline' && Array.isArray(responseData.symbols)) { responseSummary = `Found ${responseData.symbols.length} symbols in ${responseData.file_name || 'file'}.`; }
                           else if (toolName === 'get_code_symbols_outline' && responseData.symbol && responseData.definition_snippet) { responseSummary = `Definition for ${responseData.symbol.name}:\n${String(responseData.definition_snippet).substring(0,150)}...`; }
                           else if (responseData.content) responseSummary = String(responseData.content).substring(0, 200) + (String(responseData.content).length > 200 ? '...' : '');
                           else responseSummary = JSON.stringify(responseData).substring(0, 200) + (JSON.stringify(responseData).length > 200 ? '...' : '');
                      }
                  } catch { responseSummary = '(Error summarizing response data)'; }
                  messageContentHTML += `<div class="ai-tool-response-info"><strong>🖥️ Tool Response (${escapeHtml(toolName)}):</strong><pre>${escapeHtml(responseSummary)}</pre></div>`;
             }
        });
        let actionsHTML = `<div class="ai-message-actions">`;
        if (role === 'user' && parts.length === 1 && parts[0].text && !parts[0].text.includes(OPEN_FILE_REGISTRY_HEADER_ACTUAL)) {
            actionsHTML += `<button data-history-id="${historyId}" class="ai-message-action-button edit-btn" title="Edit this message">✏️</button>`;
        }
        actionsHTML += `<button data-history-id="${historyId}" class="ai-message-action-button delete-btn" title="Delete this message and subsequent history">🗑️</button>`;
        actionsHTML += `</div>`;

        messageDiv.innerHTML = `${actionsHTML}<div class="markdown-preview">${messageContentHTML}</div><span class="timestamp">${timestamp}${tokenHTML}</span>`;
        chatLog.appendChild(messageDiv); chatLog.scrollTop = chatLog.scrollHeight;
        messageDiv.querySelector('.delete-btn')?.addEventListener('click', handleDeleteMessage);
        messageDiv.querySelector('.edit-btn')?.addEventListener('click', handleEditMessage);
        return historyId;
    }

    async function updateThinkingMessage(thinkingId, finalParts, outputTokens = null, inputTokens = null) {
        const thinkingMessageDiv = document.getElementById(thinkingId);
        if (!thinkingMessageDiv) {
            console.warn(`[AIChatService] Thinking message ID ${thinkingId} not found. Appending as new message.`);
            appendMessageToChat('main-ai-chat-log', 'model', finalParts, thinkingId); 
            const entry = chatHistory.find(e => e.id === thinkingId);
            if (entry) {
                if(outputTokens !== null) entry.outputTokens = outputTokens;
                if(inputTokens !== null && entry.inputTokens === undefined) entry.inputTokens = inputTokens;
            }
            return;
        }

        const historyId = thinkingMessageDiv.dataset.historyId || thinkingId;

        const historyEntryIndex = chatHistory.findIndex(entry => entry.id === historyId);
        if (historyEntryIndex !== -1) {
            chatHistory[historyEntryIndex].parts = finalParts;
            if (outputTokens !== null) chatHistory[historyEntryIndex].outputTokens = outputTokens;
            if (inputTokens !== null && chatHistory[historyEntryIndex].inputTokens === undefined) {
                 chatHistory[historyEntryIndex].inputTokens = inputTokens;
            }
            chatHistory[historyEntryIndex].role = 'model';
        } else {
            addToHistory('model', finalParts, historyId, inputTokens, outputTokens);
        }

        thinkingMessageDiv.classList.remove('ai-pending');
        thinkingMessageDiv.classList.add('model');
        if (finalParts[0]?.text?.toLowerCase().startsWith("error:")) {
            thinkingMessageDiv.classList.add('error');
        }

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let messageContentHTML = '';
        let suggestionBlocksHTML = '';
        let tokenHTML = '';
        if (inputTokens !== null) tokenHTML += ` (In: ${inputTokens})`;
        if (outputTokens !== null) tokenHTML += ` (Out: ${outputTokens})`;

        finalParts.forEach(part => {
            if (part.text) { messageContentHTML += safeMarkdownToHTML(String(part.text)); }
            else if (part.functionCall) {
                const callDetails = part.functionCall; const args = callDetails.args || {};
                if (callDetails.name === 'apply_chunk_update_with_context') {
                    const explanation = args.explanation || 'Suggested code chunk update';
                    let changeDetailsDisplay = `<p><small>(Proposed new content for the identified chunk. Review carefully.)</small></p>`;
                    if (args.new_chunk_content !== undefined) {
                        changeDetailsDisplay = `<pre class="diff-display"><code>${escapeHtml(String(args.new_chunk_content).substring(0, 700))}${String(args.new_chunk_content).length > 700 ? '...' : ''}</code></pre>`;
                    }
                    const b64CallDetails = utf8_to_b64(JSON.stringify(callDetails));
                    suggestionBlocksHTML += `
                        <div class="ai-suggestion-block" data-call='${b64CallDetails}'>
                            <p><strong>🤖 Suggestion:</strong> ${escapeHtml(explanation)}</p>
                            <details open>
                                <summary>Show Proposed New Chunk Content (first 700 chars)</summary>
                                ${changeDetailsDisplay}
                            </details>
                            <div class="ai-suggestion-actions">
                                <button class="action-button accept-btn" title="Apply this suggestion">✅ Approve</button>
                                <button class="action-button cancel-btn" title="Reject this suggestion">❌ Reject</button>
                                <button class="action-button refine-btn" title="Ask AI to refine this suggestion">✍️ Refine</button>
                            </div>
                        </div>`;
                } else {
                    let argsString = '(No args)'; try { argsString = JSON.stringify(args); } catch {}
                    messageContentHTML += `<div class="ai-tool-call-info"><strong>🛠️ Tool Call:</strong> ${escapeHtml(callDetails.name)} Args: <pre>${escapeHtml(argsString.substring(0,250))}${argsString.length > 250 ? '...' : ''}</pre></div>`;
                }
            }
         });
        let actionsHTML = `<div class="ai-message-actions"><button data-history-id="${historyId}" class="ai-message-action-button delete-btn" title="Delete this message and subsequent history">🗑️</button></div>`;

        thinkingMessageDiv.innerHTML = `${actionsHTML}<div class="markdown-preview">${messageContentHTML}${suggestionBlocksHTML}</div><span class="timestamp">${timestamp}${tokenHTML}</span>`;
        thinkingMessageDiv.querySelectorAll('.accept-btn').forEach(b => b.addEventListener('click', handleAcceptSuggestion));
        thinkingMessageDiv.querySelectorAll('.cancel-btn').forEach(b => b.addEventListener('click', handleCancelSuggestion));
        thinkingMessageDiv.querySelectorAll('.refine-btn').forEach(b => b.addEventListener('click', handleRefineSuggestion));
        thinkingMessageDiv.querySelector('.delete-btn')?.addEventListener('click', handleDeleteMessage);

        const chatLog = thinkingMessageDiv.parentElement; if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
    }


    async function handleAcceptSuggestion(event) {
        const button = event.target;
        const suggestionBlock = button.closest('.ai-suggestion-block');
        const actionsDiv = button.closest('.ai-suggestion-actions');
        if (!suggestionBlock || !actionsDiv) return;

        let callDetails;
        const rawDataCall = suggestionBlock.dataset.call;
        try {
            const jsonStr = b64_to_utf8(rawDataCall);
            if (!jsonStr) throw new Error("Base64 decoding failed for suggestion data.");
            callDetails = JSON.parse(jsonStr);
            if (callDetails.name !== 'apply_chunk_update_with_context') {
                actionsDiv.innerHTML = '<em style="color: orange;">Invalid action. Unexpected tool name.</em>';
                return;
            }
        } catch (e) {
            console.error("Error parsing suggestion data-call:", e);
            actionsDiv.innerHTML = '<em style="color: red;">Err parsing suggestion data.</em>';
            return;
        }

        const aiSuggestedArgs = callDetails.args;

        if (!aiSuggestedArgs || !aiSuggestedArgs.file_id ||
            aiSuggestedArgs.new_chunk_content === undefined ||
            aiSuggestedArgs.context_before_chunk === undefined ||
            aiSuggestedArgs.context_after_chunk === undefined ||
            !aiSuggestedArgs.original_start_line || !aiSuggestedArgs.original_end_line) {
            actionsDiv.innerHTML = '<em style="color: red;">Err: Crucial details missing in AI suggestion for chunk update.</em>';
            return;
        }

        actionsDiv.innerHTML = '<em style="color: blue;">Applying...</em>';
        isAIPendingResponse = true; 
        let applyResult = { success: false, error: "Apply init error" };
        let functionResponsePayload = {}; 

        try {
            const state = ApplicationStateService.getState();
            const fileInfo = state.fileRegistry[aiSuggestedArgs.file_id];
            if (!fileInfo) throw new Error(`Target file (ID: ${aiSuggestedArgs.file_id}) not found.`);

            const originalFileContent = CustomEditorService.getFileContent(aiSuggestedArgs.file_id);
            if (originalFileContent === null) throw new Error(`Could not get content for "${fileInfo.name}".`);

            const patchResult = DiffPatcherService.applyChunkUpdate(originalFileContent, aiSuggestedArgs, fileInfo.name);

            if (patchResult.success) {
                CustomEditorService.replaceContent(aiSuggestedArgs.file_id, patchResult.newContent); 
                applyResult = { success: true, message: patchResult.message || `Chunk updated in ${fileInfo.name}.` };
            } else {
                applyResult = { success: false, error: patchResult.error || "Failed to apply chunk update." };
            }

        } catch (error) {
            console.error("Error preparing for or applying chunk update suggestion:", error);
            applyResult = { success: false, error: error.message || "Unknown error during suggestion application." };
        }

        if (applyResult.success) {
            actionsDiv.innerHTML = `<em style="color: green;">✅ Applied: ${escapeHtml(applyResult.message || 'Success!')}</em>`;
            showNotification("Suggestion applied.", "success");
            functionResponsePayload = { success: true, message: applyResult.message || "Change applied by user." };
        } else {
            actionsDiv.innerHTML = `<em style="color: red;">❌ Fail: ${escapeHtml(applyResult.error || 'Unknown err')}</em>`;
            showNotification(`Apply failed: ${applyResult.error}`, "error");
            functionResponsePayload = { success: false, error: applyResult.error || "Apply attempt failed by the system." };
        }

        const responsePartForAI = { functionResponse: { name: callDetails.name, response: functionResponsePayload } };
        await sendFunctionResultAndGetResponse([responsePartForAI]);
    }


    async function handleCancelSuggestion(event) {
        const button = event.target;
        const suggestionBlock = button.closest('.ai-suggestion-block');
        const actionsDiv = button.closest('.ai-suggestion-actions');
        if (!suggestionBlock || !actionsDiv) return;

        let callDetails;
        const rawDataCall = suggestionBlock.dataset.call;
        try {
            callDetails = JSON.parse(b64_to_utf8(rawDataCall));
            if (callDetails.name !== 'apply_chunk_update_with_context') {
                actionsDiv.innerHTML = '<em style="color: orange;">Invalid action for this suggestion.</em>'; return;
            }
        } catch (e) { actionsDiv.innerHTML = '<em style="color: red;">Err parsing suggestion data.</em>'; return; }

        actionsDiv.innerHTML = '<em style="color: grey;">❌ Suggestion Rejected.</em>';
        showNotification("Suggestion rejected.", "info");

        const functionResponsePayload = {
            success: false,
            error: "User rejected the suggestion.",
            user_feedback: "Suggestion rejected by user."
        };
        const responsePartForAI = { functionResponse: { name: callDetails.name, response: functionResponsePayload } };
        isAIPendingResponse = true;
        await sendFunctionResultAndGetResponse([responsePartForAI]);
    }

    async function handleRefineSuggestion(event) {
        const button = event.target;
        const suggestionBlock = button.closest('.ai-suggestion-block');
        const actionsDiv = button.closest('.ai-suggestion-actions');
        if (!suggestionBlock || !actionsDiv) return;

        let callDetails;
        const rawDataCall = suggestionBlock.dataset.call;
        try {
            callDetails = JSON.parse(b64_to_utf8(rawDataCall));
             if (callDetails.name !== 'apply_chunk_update_with_context') {
                actionsDiv.innerHTML = '<em style="color: orange;">Invalid action for this suggestion.</em>'; return;
            }
        } catch (e) { actionsDiv.innerHTML = '<em style="color: red;">Err parsing suggestion data.</em>'; return; }

        const refinementPrompt = prompt("How should the AI refine this suggestion?", "e.g., Make it more concise, use a different approach for X, ensure Y is handled...");
        if (!refinementPrompt || refinementPrompt.trim() === "") {
            showNotification("Refinement cancelled.", "info"); return;
        }

        actionsDiv.innerHTML = '<em style="color: blue;">✍️ Asking AI to refine...</em>';
        showNotification("Asking AI to refine suggestion...", "info");

        const functionResponsePayload = {
            success: false,
            error: "User requested refinement of the suggestion.",
            user_feedback: `User requested refinement for the previous chunk update proposal: "${refinementPrompt}"`,
            original_suggestion_details: callDetails.args
        };
        const responsePartForAI = { functionResponse: { name: callDetails.name, response: functionResponsePayload } };
        isAIPendingResponse = true;
        await sendFunctionResultAndGetResponse([responsePartForAI]);
    }


    function handleDeleteMessage(event) {
        const button = event.target;
        const historyId = button.dataset.historyId;
        if (!historyId) return;

        const messageDiv = button.closest('.ai-chat-message');
        if (!messageDiv) return;

        const chatLog = messageDiv.parentElement;
        const historyEntryIndex = chatHistory.findIndex(entry => entry.id === historyId);

        if (historyEntryIndex !== -1) {
            if (confirm("Delete this message and all subsequent messages in this chat session?")) {
                chatHistory.splice(historyEntryIndex);
                let currentMsgElement = messageDiv;
                while (currentMsgElement) {
                    let nextMsgElement = currentMsgElement.nextElementSibling;
                    currentMsgElement.remove();
                    currentMsgElement = nextMsgElement;
                }
                showNotification("Messages deleted.", "info");
                if (chatHistory.length === 0 && chatLog) {
                    fileIdForChatHistoryContext = null;
                    const placeholder = document.createElement('p');
                    placeholder.style.textAlign = 'center';
                    placeholder.style.color = '#777';
                    placeholder.style.fontStyle = 'italic';
                    placeholder.textContent = 'Ask a question about the current document...';
                    chatLog.appendChild(placeholder);
                }
            }
        }
    }

    function handleEditMessage(event) {
        const button = event.target;
        const historyId = button.dataset.historyId;
        if (!historyId) return;

        const historyEntryIndex = chatHistory.findIndex(entry => entry.id === historyId && entry.role === 'user');
        if (historyEntryIndex === -1) {
            showNotification("Cannot edit this message type.", "warning");
            return;
        }

        let canEdit = false;
        if (historyEntryIndex === chatHistory.length - 1) {
            canEdit = true;
        } else if (historyEntryIndex === chatHistory.length - 2 && chatHistory[chatHistory.length -1].role === 'model') {
            canEdit = true;
        }

        if (!canEdit) {
             showNotification("Only your most recent message can be edited if no AI response followed, or the one just before the last AI response.", "warning");
             return;
        }

        const originalFullPromptForAPI = chatHistory[historyEntryIndex].parts[0]?.text;
        if (!originalFullPromptForAPI) {
            showNotification("Cannot retrieve original message content for editing.", "error");
            return;
        }

        const userRequestMarker = "\n\nUSER REQUEST:\n";
        const userRequestStartIndex = originalFullPromptForAPI.lastIndexOf(userRequestMarker);
        const userTextToEdit = userRequestStartIndex !== -1 ?
            originalFullPromptForAPI.substring(userRequestStartIndex + userRequestMarker.length) :
            originalFullPromptForAPI;

        const mainAiChatInput = document.getElementById('main-ai-chat-input');
        if (mainAiChatInput) {
            mainAiChatInput.value = userTextToEdit;
            mainAiChatInput.focus();
            window.autoResizeChatInput();
            showNotification("Editing your message. Press Send when done.", "info");

            chatHistory.splice(historyEntryIndex);
            const messageDiv = button.closest('.ai-chat-message');
            if (messageDiv) {
                 let currentMsgElement = messageDiv;
                 while (currentMsgElement) {
                     let nextMsgElement = currentMsgElement.nextElementSibling;
                     currentMsgElement.remove();
                     currentMsgElement = nextMsgElement;
                 }
            }
             if (chatHistory.length === 0 && document.getElementById('main-ai-chat-log')) {
                const currentChatLog = document.getElementById('main-ai-chat-log');
                fileIdForChatHistoryContext = null;
                const placeholder = document.createElement('p');
                placeholder.style.textAlign = 'center'; placeholder.style.color = '#777'; placeholder.style.fontStyle = 'italic';
                placeholder.textContent = 'Ask a question about the current document...';
                currentChatLog.appendChild(placeholder);
            }
        }
    }

    const init = () => {
        console.log("Initializing AIChatService subscriptions and listeners...");
        document.getElementById('aiModelSelectorChat')?.addEventListener('change', () => {
            currentChatSession = null; currentChatModelInstance = null; // Force new session
            showNotification(`Switched model. New session on next message.`, "info");
        });
        document.getElementById('ai-global-search-toggle')?.addEventListener('change', (e) => {
            ApplicationStateService.dispatch({ type: 'SET_AI_GLOBAL_SEARCH', payload: e.target.checked });
            showNotification(`AI Global Search (for grep_files) ${e.target.checked ? 'Enabled' : 'Disabled'}.`, "info");
        });

        // Autocomplete for @ mentions
        const chatInput = document.getElementById('main-ai-chat-input');
        if (chatInput) {
            chatInput.addEventListener('input', (e) => {
                const query = e.target.value;
                const cursorPos = e.target.selectionStart;
                const textBeforeCursor = query.substring(0, cursorPos);
                const atMatch = textBeforeCursor.match(/@([\w.-]*)$/);

                if (atMatch) {
                    updateAutocompleteSuggestions(atMatch[1]);
                } else {
                    if (autocompleteSuggestionsDiv) autocompleteSuggestionsDiv.classList.add('is-hidden');
                }
                window.autoResizeChatInput();
            });
            chatInput.addEventListener('blur', (e) => {
                setTimeout(() => {
                     if (autocompleteSuggestionsDiv && !autocompleteSuggestionsDiv.matches(':hover')) {
                         autocompleteSuggestionsDiv.classList.add('is-hidden');
                     }
                }, 150);
            });
        }


        ApplicationStateService.subscribe((newState, oldState = {}) => {
             if (newState.activeFileId &&
                 newState.activeFileId !== oldState?.activeFileId && 
                 oldState?.activeFileId !== undefined && 
                 AIChatService.isAIReady()) {
                 console.log("[AIChatService StateSub] Active file ID change detected. New context will be added if chat continues.");
             }
            const toggle = document.getElementById('ai-global-search-toggle');
            if (toggle && typeof newState.aiSearchSettings?.globalSearchEnabled === 'boolean' && toggle.checked !== newState.aiSearchSettings.globalSearchEnabled) {
                 toggle.checked = newState.aiSearchSettings.globalSearchEnabled;
            }

            // NEW: PAD state subscription
            if (newState.padState.isVisible && !oldState.padState?.isVisible && !isPadInitialized) {
                initializePadSession();
            }
        });
        console.log("AIChatService subscriptions initialized.");
    };

    return {
        initializeAI,
        showNotification,
        handleSendChatMessage,
        isAIReady: () => isAIReady,
        clearChatHistoryData,
        updateChatContextDisplay,
        init,
        // --- NEWLY EXPOSED PAD FUNCTIONS ---
        handleSendPadMessage
    };
})();

export const AIChatService = AIChatServiceInternal;