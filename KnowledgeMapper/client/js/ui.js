/**
 * An object containing references to all key DOM elements, allowing other modules to access them without querying the DOM directly.
 */
export const ui = {
    landingPage: document.getElementById('landing-page'),
    appContainer: document.getElementById('app-container'),
    mapList: document.getElementById('map-list'),
    noMapsMessage: document.getElementById('no-maps-message'),
    newBlankMapBtn: document.getElementById('new-blank-map-btn'),
    importJsonBtn: document.getElementById('import-json-btn'),
    importClipboardBtn: document.getElementById('import-clipboard-btn'),
    templateLibrary: document.getElementById('template-library'),
    landingAiMapType: document.getElementById('landing-ai-map-type'),
    landingAiTopicInput: document.getElementById('landing-ai-topic-input'),
    landingAiGenerateBtn: document.getElementById('landing-ai-generate-btn'),
    
    homeBtn: document.getElementById('homeBtn'),
    saveBtn: document.getElementById('saveBtn'),
    exportBtn: document.getElementById('exportBtn'),
    addNodeBtn: document.getElementById('addNodeBtn'),
    selectModeBtn: document.getElementById('selectModeBtn'),
    layoutBtn: document.getElementById('layoutBtn'),
    linkStyleBtn: document.getElementById('linkStyleBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    helpBtn: document.getElementById('helpBtn'),
    
    aiPanelBtn: document.getElementById('aiPanelBtn'),
    aiPanel: document.getElementById('ai-panel'),
    aiPanelClose: document.getElementById('ai-panel-close'),
    aiChatHistory: document.getElementById('ai-chat-history'),
    aiChatInput: document.getElementById('ai-chat-input'),
    aiChatSendBtn: document.getElementById('ai-chat-send-btn'),
    
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
        gemini: document.getElementById('gemini-key'), 
        hf: document.getElementById('hf-key'),
        newsapi: document.getElementById('newsapi-key'), 
        finnhub: document.getElementById('finnhub-key'), 
        wolfram: document.getElementById('wolfram-key'), 
    },
    modelSelectors: {
        tool: document.getElementById('tool-model-select'),
        content: document.getElementById('content-model-select'),
    },

    researchProgressOverlay: document.getElementById('research-progress-overlay'),
    researchProgressTitle: document.getElementById('research-progress-title'),
    researchChecklist: document.getElementById('research-checklist'),
};

/**
 * An array of hex color codes used for the node color palette.
 */
export const PRESET_COLORS = ['#4a90e2', '#50e3c2', '#f5a623', '#e24a4a', '#bd10e0', '#9013fe', '#7ed321', '#f8e71c'];

/**
 * An array of objects defining the available node shapes, each with an ID and an SVG path string.
 */
export const PRESET_SHAPES = [
    { id: 'rectangle', svg: '<rect x="2" y="5" width="16" height="10" rx="2" />' },
    { id: 'ellipse', svg: '<ellipse cx="10" cy="10" rx="9" ry="6" />' },
    { id: 'diamond', svg: '<path d="M10 2 L18 10 L10 18 L2 10 Z" />' },
    { id: 'hexagon', svg: '<path d="M10 2 L 18 6 V 14 L 10 18 L 2 14 V 6 Z" />' },
];

export const AVAILABLE_MODELS = {
    'gemini-2.0-flash': 'Gemini 2.0 Flash (Tool)',
    'gemini-2.5-flash-preview-05-20': 'Gemini 2.5 Flash (Default)',
};

/**
 * Displays a short-lived notification message (a "toast") at the bottom of the screen.
 * @param {string} message - The message to display.
 * @param {number} [duration=3000] - The time in milliseconds for the toast to be visible.
 */
export function toast(message, duration = 3000) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
}

/**
 * Updates the UI to reflect the AI's busy state, disabling buttons and changing their text content.
 * @param {boolean} isLoading - Whether the AI is currently processing a task.
 */
export function setAILoading(isLoading) {
    ui.landingAiGenerateBtn.disabled = isLoading;
    ui.aiChatSendBtn.disabled = isLoading;
    ui.generateDetailsBtn.disabled = isLoading;
    ui.landingAiGenerateBtn.textContent = isLoading ? 'Thinking...' : 'Generate New Map';
    ui.generateDetailsBtn.textContent = isLoading ? 'Generating...' : 'Enrich Details with AI ✨';
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
 * @param {'user' | 'model' | 'system'} role - The role of the message sender.
 * @param {string} text - The HTML or text content of the message.
 * @param {boolean} [shouldSave=true] - Whether to trigger the callback to save the message.
 * @param {Function} [dbSaveCallback] - The callback function to save the message.
 */
export function addMessageToChatHistory(role, text, shouldSave = true, dbSaveCallback) {
    const el = document.createElement('div');
    el.classList.add('chat-message', role);
    el.innerHTML = text.replace(/\n/g, '<br>');
    ui.aiChatHistory.appendChild(el);
    ui.aiChatHistory.scrollTop = ui.aiChatHistory.scrollHeight;
    if (shouldSave && role !== 'system' && dbSaveCallback) {
        dbSaveCallback(role, text);
    }
}