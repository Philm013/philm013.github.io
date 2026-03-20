/**
 * An object containing references to all key DOM elements, allowing other modules to access them without querying the DOM directly.
 */
export const ui = {
    landingPage: document.getElementById('landing-page'),
    landingSettingsBtn: document.getElementById('landing-settings-btn'),
    appContainer: document.getElementById('app-container'),
    mapList: document.getElementById('map-list'),
    noMapsMessage: document.getElementById('no-maps-message'),
    newBlankMapBtn: document.getElementById('new-blank-map-btn'),
    importJsonBtn: document.getElementById('import-json-btn'),
    templateLibrary: document.getElementById('template-library'),
    landingAiTopicInput: document.getElementById('landing-ai-topic-input'),
    landingAiGenerateBtn: document.getElementById('landing-ai-generate-btn'),
    
    homeBtn: document.getElementById('homeBtn'),
    saveBtn: document.getElementById('saveBtn'),
    exportBtn: document.getElementById('exportBtn'),
    addNodeBtn: document.getElementById('addNodeBtn'),
    selectModeBtn: document.getElementById('selectModeBtn'),
    layoutBtn: document.getElementById('layoutBtn'),
    fitViewBtn: document.getElementById('fitViewBtn'),
    linkStyleBtn: document.getElementById('linkStyleBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    helpBtn: document.getElementById('helpBtn'),
    
    aiPanelBtn: document.getElementById('aiPanelBtn'),
    aiPanel: document.getElementById('ai-panel'),
    aiPanelClose: document.getElementById('ai-panel-close'),
    aiMoreOptionsBtn: document.getElementById('ai-more-options-btn'),
    aiChatHistory: document.getElementById('ai-chat-history'),
    aiChatInput: document.getElementById('ai-chat-input'),
    aiChatSendBtn: document.getElementById('ai-chat-send-btn'),
    aiThinkingIndicator: document.getElementById('ai-thinking-indicator'),
    aiThinkingText: document.getElementById('ai-thinking-text'),
    
    contextMenu: document.getElementById('context-menu'),
    canvasContextMenu: document.getElementById('canvas-context-menu'),
    groupActionsMenu: document.getElementById('group-actions-menu'),
    linkContextMenu: document.getElementById('link-context-menu'),
    nodeSettingsPalette: document.getElementById('node-settings-palette'),
    paletteColors: document.getElementById('palette-colors'),
    paletteShapes: document.getElementById('palette-shapes'),
    textMeasurer: document.getElementById('text-measurer'),

    nodeDetailPanel: document.getElementById('node-detail-panel'),
    nodeDetailTitle: document.getElementById('node-detail-title'),
    nodeDetailClose: document.getElementById('node-detail-close'),
    nodeDetailArea: document.getElementById('node-detail-area'),
    generateDetailsBtn: document.getElementById('generate-details-btn'),
    rteToolbar: document.getElementById('rte-toolbar'),

    settingsModal: document.getElementById('settings-modal'),
    helpModal: document.getElementById('help-modal'),
    exportModal: document.getElementById('export-modal'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    exportInteractiveBtn: document.getElementById('export-interactive-btn'),
    exportPrintableBtn: document.getElementById('export-printable-btn'),
    exportJsonBtn: document.getElementById('export-json-btn'),
    apiKeys: { 
        newGeminiKey: document.getElementById('new-gemini-key'),
        geminiKeysList: document.getElementById('gemini-keys-list'),
        addKeyBtn: document.getElementById('add-key-btn'),
        hf: document.getElementById('hf-key'),
        newsapi: document.getElementById('newsapi-key'), 
        debugModeToggle: document.getElementById('debug-mode-toggle'),
    },
    settingsTabs: document.querySelectorAll('.settings-tab'),
    settingsTabPanels: document.querySelectorAll('.settings-tab-panel'),
    modelSelectors: {
        tool: document.getElementById('tool-model-select'),
        content: document.getElementById('content-model-select'),
    },

    researchProgressOverlay: document.getElementById('research-progress-overlay'),
    researchProgressTitle: document.getElementById('research-progress-title'),
    researchChecklist: document.getElementById('research-checklist'),

    // Workspace Tabs & Views
    chatView: document.getElementById('chat-view'),
    sourcesView: document.getElementById('sources-view'),
    outlineView: document.getElementById('outline-view'),

    sourcesList: document.getElementById('sources-list'),
    outlineTree: document.getElementById('outline-tree'),
    addUrlSourceBtn: document.getElementById('add-url-source-btn'),
    uploadFileSourceBtn: document.getElementById('upload-file-source-btn'),
    sourceFileInput: document.getElementById('source-file-input'),
    toggleViewBtn: document.getElementById('toggle-view-btn'),

    // Notecard Fields
    notecardSourceSelect: document.getElementById('notecard-source-select'),
    notecardQuote: document.getElementById('notecard-quote'),
    notecardParaphrase: document.getElementById('notecard-paraphrase'),
    notecardThoughts: document.getElementById('notecard-thoughts'),

    // Modal Elements
    genericModal: document.getElementById('generic-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMessage: document.getElementById('modal-message'),
    modalInput: document.getElementById('modal-input'),
    modalPromptContainer: document.getElementById('modal-prompt-container'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    modalConfirmBtn: document.getElementById('modal-confirm-btn'),

    // Step Prompts
    stepPrompts: {
        1: document.getElementById('prompt-step-1'),
        2: document.getElementById('prompt-step-2'),
        3: document.getElementById('prompt-step-3'),
        4: document.getElementById('prompt-step-4'),
        5: document.getElementById('prompt-step-5'),
        6: document.getElementById('prompt-step-6'),
        global: document.getElementById('prompt-global'),
        research: document.getElementById('prompt-research'),
        brainstorm: document.getElementById('prompt-brainstorm'),
        mapMindmap: document.getElementById('prompt-map-mindmap'),
        mapFlowchart: document.getElementById('prompt-map-flowchart'),
    }
};

/**
 * A helper object for managing the custom modal system.
 */
export const Modal = {
    _resolve: null,
    
    /**
     * Shows a confirmation dialog.
     * @param {string} title - The title of the modal.
     * @param {string} message - The message body.
     * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise.
     */
    confirm: function(title, message) {
        return new Promise((resolve) => {
            this._setup(title, message, 'confirm');
            this._resolve = resolve;
        });
    },

    /**
     * Shows a prompt dialog with an input field.
     * @param {string} title - The title of the modal.
     * @param {string} message - The message body.
     * @param {string} defaultValue - Initial value for the input.
     * @returns {Promise<string|null>} Resolves to the input string or null if cancelled.
     */
    prompt: function(title, message, defaultValue = "") {
        return new Promise((resolve) => {
            this._setup(title, message, 'prompt', defaultValue);
            this._resolve = resolve;
        });
    },

    /**
     * Shows an alert dialog.
     * @param {string} title - The title of the modal.
     * @param {string} message - The message body.
     * @returns {Promise<void>} Resolves when the user clicks OK.
     */
    alert: function(title, message) {
        return new Promise((resolve) => {
            this._setup(title, message, 'alert');
            this._resolve = resolve;
        });
    },

    /**
     * Shows a custom modal with provided HTML content.
     * @param {string} title - The title of the modal.
     * @param {string} htmlContent - The raw HTML content for the body.
     * @returns {Promise<void>} Resolves when closed.
     */
    show: function(title, htmlContent) {
        return new Promise((resolve) => {
            this._setup(title, null, 'custom', "", htmlContent);
            this._resolve = resolve;
        });
    },

    _setup: function(title, message, mode, defaultValue = "", customHtml = "") {
        ui.modalTitle.textContent = title;
        ui.modalMessage.innerHTML = message || "";
        ui.genericModal.classList.remove('hidden');
        
        ui.modalPromptContainer.classList.toggle('hidden', mode !== 'prompt');
        ui.modalCancelBtn.classList.toggle('hidden', mode === 'alert' || mode === 'custom');
        ui.modalConfirmBtn.textContent = (mode === 'alert' || mode === 'custom') ? 'OK' : 'Confirm';
        
        const bodyContent = ui.genericModal.querySelector('.modal-body');
        if (mode === 'custom') {
            const customDiv = document.createElement('div');
            customDiv.id = 'modal-custom-content';
            customDiv.innerHTML = customHtml;
            bodyContent.appendChild(customDiv);
            ui.modalMessage.classList.add('hidden');
        } else {
            ui.modalMessage.classList.remove('hidden');
            const customDiv = document.getElementById('modal-custom-content');
            if (customDiv) customDiv.remove();
        }

        if (mode === 'prompt') {
            ui.modalInput.value = defaultValue;
            setTimeout(() => ui.modalInput.focus(), 100);
        }

        const cleanup = (result) => {
            ui.genericModal.classList.add('hidden');
            ui.modalConfirmBtn.removeEventListener('click', confirmHandler);
            ui.modalCancelBtn.removeEventListener('click', cancelHandler);
            const customDiv = document.getElementById('modal-custom-content');
            if (customDiv) customDiv.remove();
            if (this._resolve) this._resolve(result);
        };

        const confirmHandler = () => cleanup(mode === 'prompt' ? ui.modalInput.value : true);
        const cancelHandler = () => cleanup(null);

        ui.modalConfirmBtn.addEventListener('click', confirmHandler);
        ui.modalCancelBtn.addEventListener('click', cancelHandler);
    }
};

/**
 * An array of hex color codes used for the node color palette.
 */
export const PRESET_COLORS = ['#38bdf8', '#2dd4bf', '#fbbf24', '#f43f5e', '#a855f7', '#6366f1', '#84cc16', '#eab308'];

/**
 * An array of objects defining the available node shapes, each with an ID and an SVG path string.
 */
export const PRESET_SHAPES = [
    { id: 'rectangle', svg: '<rect x="2" y="5" width="16" height="10" rx="2" />' },
    { id: 'ellipse', svg: '<ellipse cx="10" cy="10" rx="9" ry="6" />' },
    { id: 'diamond', svg: '<path d="M10 2 L18 10 L10 18 L2 10 Z" />' },
    { id: 'hexagon', svg: '<path d="M10 2 L 18 6 V 14 L 10 18 L 2 14 V 6 Z" />' },
];

/**
 * Displays a short-lived notification message (a "toast") at the bottom of the screen.
 * @param {string} message - The message to display.
 * @param {number} [duration=3000] - The time in milliseconds for the toast to be visible.
 */
export function toast(message, duration = 3000) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
}

/**
 * Updates the UI to reflect the AI's busy state, disabling buttons and changing their text content.
 * @param {boolean} isLoading - Whether the AI is currently processing a task.
 * @param {string} [message='Coach is thinking...'] - The message to display in the thinking indicator.
 */
export function setAILoading(isLoading, message = 'Coach is thinking...') {
    ui.landingAiGenerateBtn.disabled = isLoading;
    ui.aiChatSendBtn.disabled = isLoading;
    ui.generateDetailsBtn.disabled = isLoading;
    ui.landingAiGenerateBtn.textContent = isLoading ? 'Thinking...' : 'Generate New Map';
    ui.generateDetailsBtn.textContent = isLoading ? 'Generating...' : 'Enrich Details with AI ✨';
    
    if (ui.aiThinkingIndicator) {
        ui.aiThinkingIndicator.classList.toggle('hidden', !isLoading);
        if (isLoading && ui.aiThinkingText) {
            ui.aiThinkingText.textContent = message;
        }
    }
}

/**
 * A manager object to control the research progress overlay, with methods to show/hide the modal, add tasks to the checklist, and update their status.
 */
export const researchProgressManager = {
    /**
     * Shows the research progress overlay.
     * @param {string} titleText - The title to display in the modal header.
     */
    show(titleText) {
        ui.researchProgressTitle.textContent = titleText || 'Research in Progress...';
        ui.researchChecklist.innerHTML = '';
        ui.researchProgressOverlay.classList.remove('hidden');
    },
    /**
     * Hides the research progress overlay.
     */
    hide() {
        ui.researchProgressOverlay.classList.add('hidden');
    },
    /**
     * Adds a list of tasks to the checklist.
     * @param {string[]} tasks - An array of strings, where each string is a topic to be researched.
     */
    addTasks(tasks) {
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'checklist-item';
            li.dataset.topic = task;
            li.innerHTML = `
                <div class="checklist-item-header">
                    <span class="checklist-status queued">Q</span>
                    <strong class="checklist-topic">${task}</strong>
                </div>
                <div class="checklist-result-preview"></div>
            `;
            li.querySelector('.checklist-item-header').addEventListener('click', () => {
                li.classList.toggle('expanded');
            });
            ui.researchChecklist.appendChild(li);
        });
    },
    /**
     * Updates the status and result of a specific task in the checklist.
     * @param {string} topic - The topic of the task to update.
     * @param {'Queued' | 'Researching' | 'Done' | 'Error'} status - The new status of the task.
     * @param {string} [resultHtml=''] - Optional HTML content to display as the result of the task.
     */
    updateTask(topic, status, resultHtml = '') {
        // Sanitize topic to be a valid CSS selector if it contains special characters
        const safeTopic = topic.replace(/["\\]/g, '\\$&');
        const item = ui.researchChecklist.querySelector(`li[data-topic="${safeTopic}"]`);
        if (!item) return;

        const statusEl = item.querySelector('.checklist-status');
        const resultEl = item.querySelector('.checklist-result-preview');

        statusEl.className = 'checklist-status'; // Reset classes
        statusEl.classList.add(status.toLowerCase());
        
        if (status === 'Researching') {
            statusEl.textContent = '...';
        } else if (status === 'Done') {
            statusEl.textContent = '✓';
        } else if (status === 'Error') {
            statusEl.textContent = '✕';
        } else { // Queued
            statusEl.textContent = 'Q';
        }

        if (resultHtml) {
            resultEl.innerHTML = resultHtml;
            item.classList.add('expanded');
        }
    }
};

/**
 * Creates a new chat bubble element, adds it to the chat history display, scrolls to the bottom, and optionally saves the message to the database.
 * @param {'user' | 'model' | 'system' | 'status'} role - The role of the message sender.
 * @param {string} text - The HTML or text content of the message.
 * @param {boolean} [shouldSave=true] - Whether to trigger the callback to save the message.
 * @param {Function} [dbSaveCallback] - The callback function to save the message.
 * @param {string} [extraHtml=''] - Optional HTML content to append to the message.
 */
export function addMessageToChatHistory(role, text, shouldSave = true, dbSaveCallback, extraHtml = '') {
    const isDebugMode = localStorage.getItem('debug_mode') === 'true';
    if (role === 'system' && !isDebugMode) return;

    const el = document.createElement('div');
    el.classList.add('chat-message', role);
    
    // Status messages are shown cleanly without extra controls
    if (role === 'status') {
        el.innerHTML = text;
        ui.aiChatHistory.appendChild(el);
        ui.aiChatHistory.scrollTop = ui.aiChatHistory.scrollHeight;
        return;
    }
    
    // Convert basic markdown-like structures to HTML
    let contentHtml = text.replace(/\n/g, '<br>');
    
    if (role === 'user') {
        el.innerHTML = `
            <div class="message-content">${contentHtml}</div>
            <button class="resend-btn" title="Resend message" data-text="${text.replace(/"/g, '&quot;')}">
                <span class="iconify" data-icon="solar:restart-bold-duotone"></span>
            </button>
        `;
    } else {
        el.innerHTML = contentHtml + (extraHtml ? `<div class="chat-extra-content">${extraHtml}</div>` : '');
        
        // Add "Add All" button if multiple node suggestions exist
        const nodeSuggestions = el.querySelectorAll('.suggestion-chip[data-action="add_node"]');
        if (nodeSuggestions.length > 1) {
            const addAllBtn = document.createElement('button');
            addAllBtn.className = 'suggestion-chip primary';
            addAllBtn.innerHTML = '<span class="iconify" data-icon="solar:add-circle-bold-duotone"></span> ✨ Add All to Map';
            addAllBtn.onclick = () => {
                nodeSuggestions.forEach(chip => chip.click());
                addAllBtn.remove();
            };
            el.querySelector('.socratic-prompt-container')?.prepend(addAllBtn);
        }

        // NEW: Add "Save Source" buttons to links in model responses
        if (role === 'model') {
            const links = el.querySelectorAll('a[href^="http"]');
            links.forEach(link => {
                if (link.closest('.chat-extra-content')) return; // Skip grounding chips for now
                const saveBtn = document.createElement('button');
                saveBtn.className = 'save-source-inline-btn';
                saveBtn.innerHTML = '<span class="iconify" data-icon="solar:bookmark-opened-bold-duotone"></span>';
                saveBtn.title = 'Add to Bibliography';
                saveBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const title = link.textContent || 'Untitled Source';
                    const url = link.href;
                    if (window.projectSources) {
                        window.projectSources.push({ title, url });
                        window.dispatchEvent(new CustomEvent('sources-updated'));
                        toast('Added to Bibliography! 📚');
                        saveBtn.classList.add('saved');
                        saveBtn.disabled = true;
                    }
                };
                link.parentNode.insertBefore(saveBtn, link.nextSibling);
            });
        }
    }
    
    ui.aiChatHistory.appendChild(el);
    ui.aiChatHistory.scrollTop = ui.aiChatHistory.scrollHeight;
    if (shouldSave && role !== 'system' && dbSaveCallback) {
        dbSaveCallback(role, text);
    }
}


