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

    helpModal: document.getElementById('help-modal'),
    exportModal: document.getElementById('export-modal'),
    exportInteractiveBtn: document.getElementById('export-interactive-btn'),
    exportPrintableBtn: document.getElementById('export-printable-btn'),
    exportJsonBtn: document.getElementById('export-json-btn'),
    selectModeBtn: document.getElementById('selectModeBtn'),

    // Header Elements
    headerProjectName: document.getElementById('header-project-name'),
    headerLayoutBtn: document.getElementById('header-layout-btn'),
    headerHelpBtn: document.getElementById('header-help-btn'),
    headerExportBtn: document.getElementById('header-export-btn'),
    headerSaveBtn: document.getElementById('header-save-btn'),
    headerHomeBtn: document.getElementById('header-home-btn'),

    // Research Progress UI
    researchProgressStepper: document.getElementById('research-progress-stepper'),
    researchPhaseName: document.getElementById('research-phase-name'),
    nextPhaseBtn: document.getElementById('next-phase-btn'),

    researchProgressOverlay: document.getElementById('research-progress-overlay'),
    researchProgressTitle: document.getElementById('research-progress-title'),
    researchChecklist: document.getElementById('research-checklist'),

    // Workspace Tabs & Views
    chatView: document.getElementById('chat-view'),
    sourcesView: document.getElementById('sources-view'),
    outlineView: document.getElementById('outline-view'),

    sourcesList: document.getElementById('sources-list'),
    outlineTree: document.getElementById('outline-tree'),
    addSourceBtn: document.getElementById('add-source-btn'),
    toggleViewBtn: document.getElementById('toggle-view-btn'),

    // Notecard Fields
    notecardSourceSelect: document.getElementById('notecard-source-select'),
    notecardQuote: document.getElementById('notecard-quote'),
    notecardParaphrase: document.getElementById('notecard-paraphrase'),
    notecardThoughts: document.getElementById('notecard-thoughts'),

    // Phase Goal HUD
    phaseGoalHud: document.getElementById('phase-goal-hud'),
    phaseIcon: document.getElementById('phase-icon'),
    phaseLabel: document.getElementById('phase-label'),
    phaseName: document.getElementById('phase-name'),
    phaseGoalText: document.getElementById('phase-goal-text'),

    // Coach HUD
    coachHud: document.getElementById('coach-hud'),
    coachInputContainer: document.getElementById('coach-input-container'),

    // Source Viewer
    sourceViewerPanel: document.getElementById('source-viewer-panel'),
    sourceViewerTitle: document.getElementById('source-viewer-title'),
    sourceViewerClose: document.getElementById('source-viewer-close'),
    sourceViewerLoader: document.getElementById('source-viewer-loader'),
    sourceIframe: document.getElementById('source-iframe'),
    sourcePdfObject: document.getElementById('source-pdf-object'),
    pdfViewerContainer: document.getElementById('pdf-viewer-container'),
    pdfDownloadLink: document.getElementById('pdf-download-link'),
    sourceExternalBtn: document.getElementById('source-external-btn'),
    openSourceViewerBtn: document.getElementById('open-source-viewer-btn'),

    // Layout Elements
    workspaceLayout: document.getElementById('workspace-layout'),
    leftSidebar: document.getElementById('left-sidebar'),
    rightSidebar: document.getElementById('right-sidebar'),
    centerViewBtn: document.getElementById('center-view-btn'),

    // Mobile Navigation
    mobileNav: document.getElementById('mobile-nav'),
    mobileAddNodeBtn: document.getElementById('mobile-add-node-btn'),
    mobileSettingsBtn: document.getElementById('mobile-settings-btn'),
    nodeCreationChoice: document.getElementById('node-creation-choice'),
    createSimpleNote: document.getElementById('create-simple-note'),
    createCoachedNote: document.getElementById('create-coached-note'),
    cancelNodeCreation: document.getElementById('cancel-node-creation'),

    // Badges
    badges: {
        coach: document.getElementById('badge-coach'),
        sources: document.getElementById('badge-sources'),
        outline: document.getElementById('badge-outline'),
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
 */
export function setAILoading(isLoading) {
    if (ui.landingAiGenerateBtn) {
        ui.landingAiGenerateBtn.disabled = isLoading;
        ui.landingAiGenerateBtn.textContent = isLoading ? 'Thinking...' : 'Generate New Map';
    }
    if (ui.aiChatSendBtn) ui.aiChatSendBtn.disabled = isLoading;
    if (ui.generateDetailsBtn) {
        ui.generateDetailsBtn.disabled = isLoading;
        ui.generateDetailsBtn.textContent = isLoading ? 'Generating...' : 'Enrich Details with AI ✨';
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
            if (window.Effects) window.Effects.sparkleElement(item);
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
 * @param {string} [extraHtml=''] - Optional HTML content to append to the message.
 */
export function addMessageToChatHistory(role, text, shouldSave = true, dbSaveCallback, extraHtml = '') {
    if (!ui.aiChatHistory) return;

    const el = document.createElement('div');
    el.classList.add('chat-message', role);
    
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
                        toast('Added to Bibliography!');
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

    // Show HUD elements when there's dialogue
    if (ui.aiChatHistory.classList.contains('opacity-0')) {
        ui.aiChatHistory.classList.remove('opacity-0');
    }
    if (ui.coachInputContainer && ui.coachInputContainer.classList.contains('opacity-0')) {
        ui.coachInputContainer.classList.remove('opacity-0');
    }

    if (shouldSave && role !== 'system' && dbSaveCallback) {
        dbSaveCallback(role, text);
    }
}


