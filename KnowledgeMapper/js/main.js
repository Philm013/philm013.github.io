import React from 'react';
import ReactDOM from 'react-dom/client';
import { ui, toast, addMessageToChatHistory } from './ui.js';
import { dbManager, mapsManager, templatesManager } from './storage.js';
import { initializeAI, sendChatMessage } from './api.js';
import { Effects } from './effects.js';


window.Effects = Effects;
window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// --- GLOBAL STATE & SETUP ---
let currentMapId = null;
let isSelectModeActive = false;

window.projectSources = []; // Global bibliography for the current map

// --- TLDRAW COMPATIBILITY HELPERS ---
let activeNodeId = null;

function getSelectedNodeForDetails() {
    if (!activeNodeId || !window.tldrawEditor) return null;
    const shape = window.tldrawEditor.getShape(activeNodeId);
    if (!shape || shape.type !== 'research-note') return null;
    return {
        id: shape.id,
        label: shape.props.label,
        notecard: {
            quote: shape.props.quote,
            thoughts: shape.props.thoughts,
            sourceIndex: shape.props.sourceIndex
        }
    };
}

function setSelectedNodeForDetails(node) {
    activeNodeId = node ? node.id : null;
}

function clearSelection() {
    if (window.tldrawEditor) window.tldrawEditor.selectNone();
}

function addNode(label) {
    if (window.isMobile) {
        // Show choice overlay on mobile
        const overlay = ui.nodeCreationChoice;
        if (overlay) {
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.style.opacity = '1', 10);
            
            // Temporary storage for label to use in listeners
            overlay.dataset.label = label || 'New Notecard';
        }
    } else {
        // Desktop behavior (simple note for now or as per existing logic)
        if (window.tldrawEditor) {
            const { x, y } = window.tldrawEditor.getCamera();
            window.tldrawEditor.createShape({
                type: 'research-note',
                x: -x + 100, y: -y + 100,
                props: { label: label || 'New Notecard' }
            });
        }
    }
}

/**
 * Updates notification badges based on the current project state.
 */
function updateBadges() {
    if (!window.tldrawEditor) return;
    const notes = window.tldrawEditor.getCurrentPageShapes().filter(s => s.type === 'research-note');
    
    // 1. Outline Badge (Check for empty notecards)
    const emptyNotecards = notes.filter(n => !n.props.quote && !n.props.thoughts);
    if (ui.badges.outline) {
        ui.badges.outline.classList.toggle('hidden', emptyNotecards.length === 0);
        ui.badges.outline.classList.add('badge-pulse');
    }

    // 2. Sources Badge (Count of sources)
    if (ui.badges.sources) {
        ui.badges.sources.textContent = window.projectSources.length;
        ui.badges.sources.classList.toggle('hidden', window.projectSources.length === 0);
    }
}

/**
 * Opens a source in the dedicated viewer panel.
 */
function openSourceInViewer(sourceIndex) {
    const source = window.projectSources[sourceIndex];
    if (!source) return;

    if (ui.sourceViewerTitle) ui.sourceViewerTitle.textContent = source.title || 'Source Material';
    
    const url = source.url || '';
    const isPdf = url.toLowerCase().endsWith('.pdf');

    // Show loader
    if (ui.sourceViewerLoader) ui.sourceViewerLoader.classList.remove('hidden');
    
    if (isPdf) {
        if (ui.sourceIframe) ui.sourceIframe.classList.add('hidden');
        if (ui.pdfViewerContainer) ui.pdfViewerContainer.classList.remove('hidden');
        if (ui.sourcePdfObject) ui.sourcePdfObject.data = url;
    } else {
        if (ui.pdfViewerContainer) ui.pdfViewerContainer.classList.add('hidden');
        if (ui.sourceIframe) {
            ui.sourceIframe.classList.remove('hidden');
            ui.sourceIframe.src = url;
            ui.sourceIframe.onload = () => {
                if (ui.sourceViewerLoader) ui.sourceViewerLoader.classList.add('hidden');
            };
        }
    }

    if (ui.sourceExternalBtn) {
        ui.sourceExternalBtn.onclick = () => window.open(url, '_blank');
    }

    // Ensure mutually exclusive on mobile, but on desktop we can keep panels
    if (window.isMobile) {
        ui.aiPanel?.classList.remove('visible');
    }
    
    ui.sourceViewerPanel?.classList.add('visible');
    ui.sourceViewerPanel?.style.setProperty('opacity', '1');
    ui.sourceViewerPanel?.style.setProperty('pointer-events', 'auto');
    ui.sourceViewerPanel?.style.setProperty('transform', 'scale(1)');
    
    Effects.celebratePhase(); 
}

/**
 * Updates the bibliography list in the UI and notecard select dropdowns.
 */
function updateSourcesUI() {
    const list = ui.sourcesList;
    const select = ui.notecardSourceSelect;
    if (!list || !select) return;

    list.innerHTML = '';
    select.innerHTML = '<option value="">No source linked</option>';

    window.projectSources.forEach((source, index) => {
        // Update Bibliography List
        const item = document.createElement('div');
        item.className = 'group bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all hover:border-sky-500 hover:bg-white hover:shadow-lg flex items-center justify-between gap-4';
        item.innerHTML = `
            <button class="flex-grow text-left focus:outline-none rounded-xl p-1" onclick="window.viewSource(${index})" aria-label="View source">
                <div class="font-bold text-slate-900 text-sm">${source.title || 'Untitled Source'}</div>
                <div class="text-[10px] text-slate-400 mt-1 truncate max-w-[180px]">${source.url || 'No URL'}</div>
            </button>
            <button class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" onclick="window.removeSource(${index})">
                <span class="iconify w-5 h-5" data-icon="solar:trash-bin-trash-bold-duotone"></span>
            </button>
        `;
        list.appendChild(item);

        // Update Notecard Dropdown
        const option = document.createElement('option');
        option.value = index;
        option.textContent = source.title || source.url;
        select.appendChild(option);
    });

    updateBadges();
}

window.viewSource = (index) => openSourceInViewer(index);

window.removeSource = (index) => {
    window.projectSources.splice(index, 1);
    window.dispatchEvent(new CustomEvent('sources-updated'));
};

window.addEventListener('sources-updated', updateSourcesUI);

/**
 * Builds a structured outline from the graph hierarchy.
 */
function updateOutline() {
    if (!window.tldrawEditor) return;
    const tree = ui.outlineTree;
    if (!tree) return;

    tree.innerHTML = '';
    
    const editor = window.tldrawEditor;
    const shapes = editor.getCurrentPageShapes();
    const notes = shapes.filter(s => s.type === 'research-note');
    const arrows = shapes.filter(s => s.type === 'arrow');

    // Build adjacency map from arrows
    const childrenMap = new Map();
    const hasParent = new Set();

    arrows.forEach(arrow => {
        if (arrow.props.start.type === 'binding' && arrow.props.end.type === 'binding') {
            const sourceId = arrow.props.start.boundShapeId;
            const targetId = arrow.props.end.boundShapeId;
            if (sourceId && targetId) {
                if (!childrenMap.has(sourceId)) childrenMap.set(sourceId, []);
                childrenMap.get(sourceId).push(targetId);
                hasParent.add(targetId);
            }
        }
    });

    const roots = notes.filter(n => !hasParent.has(n.id));

    const renderLevel = (shapeId, depth) => {
        const shape = editor.getShape(shapeId);
        if (!shape) return;

        const div = document.createElement('div');
        div.className = 'outline-node transition-all hover:bg-slate-50 rounded-xl cursor-pointer p-2 mb-1';
        div.style.paddingLeft = `${depth * 16 + 8}px`;
        div.innerHTML = `
            <div class="outline-node-content">
                <strong class="text-xs text-slate-700">${shape.props.label || 'Note'}</strong>
                ${shape.props.thoughts ? `<p class="text-[10px] text-slate-400 italic line-clamp-1">${shape.props.thoughts}</p>` : ''}
            </div>
        `;
        div.onclick = () => {
            editor.select(shape.id);
            editor.zoomToSelection();
            showNodeDetailPanel({
                id: shape.id,
                label: shape.props.label,
                notecard: { quote: shape.props.quote, thoughts: shape.props.thoughts }
            });
        };
        tree.appendChild(div);

        const children = childrenMap.get(shapeId) || [];
        children.forEach(childId => renderLevel(childId, depth + 1));
    };

    roots.forEach(root => renderLevel(root.id, 0));
    updateBadges();
}

// --- Notecard Sync ---
const syncNotecardToUI = (node) => {
    if (!node) return;
    if (!node.notecard) node.notecard = {};
    if (ui.notecardSourceSelect) ui.notecardSourceSelect.value = node.notecard.sourceIndex !== undefined ? node.notecard.sourceIndex : "";
    if (ui.notecardQuote) ui.notecardQuote.innerHTML = node.notecard.quote || "";
    if (ui.notecardParaphrase) ui.notecardParaphrase.innerHTML = node.notecard.paraphrase || "";
    if (ui.notecardThoughts) ui.notecardThoughts.innerHTML = node.notecard.thoughts || "";
};

const syncUIToNotecard = () => {
    const editor = window.tldrawEditor;
    const node = getSelectedNodeForDetails();
    if (!editor || !node) return;

    editor.updateShape({
        id: node.id,
        props: {
            sourceIndex: ui.notecardSourceSelect.value,
            quote: ui.notecardQuote.innerHTML,
            thoughts: ui.notecardThoughts.innerHTML
        }
    });
};

// --- CONSTANTS ---
const TEMPLATES = {
    literature_review: {
        name: "Literature Review",
        graphData: {
            nodes: [
                { id: 'node-1', label: 'Central Research Topic', shape: 'rectangle', color: '#0ea5e9' },
                { id: 'node-2', label: 'Theory A', shape: 'rectangle', color: '#8b5cf6' },
                { id: 'node-3', label: 'Theory B', shape: 'rectangle', color: '#8b5cf6' },
                { id: 'node-4', label: 'Gap in Research', shape: 'diamond', color: '#f59e0b' },
                { id: 'node-5', label: 'Key Source 1', shape: 'ellipse', color: '#10b981' }
            ],
            links: [
                { source: 'node-1', target: 'node-2' },
                { source: 'node-1', target: 'node-3' },
                { source: 'node-2', target: 'node-4' },
                { source: 'node-3', target: 'node-4' },
                { source: 'node-2', target: 'node-5' }
            ],
            counter: 5, layout: 'mindmap', linkStyle: 'straight'
        }
    },
    essay_planner: {
        name: "Argument Essay",
        graphData: {
            nodes: [
                { id: 'node-1', label: 'Main Claim / Thesis', shape: 'rectangle', color: '#0ea5e9' },
                { id: 'node-2', label: 'Supporting Point 1', shape: 'rectangle', color: '#8b5cf6' },
                { id: 'node-3', label: 'Supporting Point 2', shape: 'rectangle', color: '#8b5cf6' },
                { id: 'node-4', label: 'Counter-Argument', shape: 'rectangle', color: '#f43f5e' },
                { id: 'node-5', label: 'Rebuttal', shape: 'rectangle', color: '#10b981' }
            ],
            links: [
                { source: 'node-1', target: 'node-2' },
                { source: 'node-1', target: 'node-3' },
                { source: 'node-1', target: 'node-4' },
                { source: 'node-4', target: 'node-5' }
            ],
            counter: 5, layout: 'mindmap', linkStyle: 'straight'
        }
    }
};

/**
 * Displays the landing page and hides the main application container. Renders the list of saved maps.
 */
function showLandingPage() {
    ui.landingPage?.classList.remove('hidden');
    ui.appContainer?.classList.add('hidden');
    renderLandingPage();
}

/**
 * Hides the landing page and shows the main application container.
 */
function showAppContainer() {
    ui.landingPage?.classList.add('hidden');
    ui.appContainer?.classList.remove('hidden');
}

/**
 * Fetches all saved maps from storage and dynamically populates the map list on the landing page.
 */
function renderLandingPage() {
    const maps = mapsManager.getAll();
    const mapIds = Object.keys(maps);
    if (!ui.mapList) return;
    
    ui.mapList.innerHTML = '';
    if (mapIds.length === 0) {
        ui.noMapsMessage?.classList.remove('hidden');
    } else {
        ui.noMapsMessage?.classList.add('hidden');
        mapIds.sort((a, b) => maps[b].lastModified - maps[a].lastModified).forEach(mapId => {
            const map = maps[mapId];
            const li = document.createElement('li');
            li.className = 'group bg-slate-950/40 backdrop-blur-md border border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 transition-all duration-300 flex items-center justify-between gap-4';
            li.innerHTML = `
                <button class="flex-grow text-left focus:outline-none rounded-xl p-1" data-action="open" data-id="${mapId}" aria-label="Open project">
                    <div class="font-bold text-slate-200 group-hover:text-sky-400 transition-colors">${map.name}</div>
                    <div class="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-1">Edited ${new Date(map.lastModified).toLocaleDateString()}</div>
                </button>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" data-action="rename" data-id="${mapId}" title="Rename">
                        <span class="iconify w-4 h-4" data-icon="solar:pen-new-square-bold-duotone"></span>
                    </button>
                    <button class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" data-action="delete" data-id="${mapId}" title="Delete">
                        <span class="iconify w-4 h-4" data-icon="solar:trash-bin-trash-bold-duotone"></span>
                    </button>
                </div>
            `;
            ui.mapList.appendChild(li);
        });
    }
    renderTemplateLibrary();
}

/**
 * Renders the built-in and custom templates on the landing page.
 */
function renderTemplateLibrary() {
    if (!ui.templateLibrary) return;
    ui.templateLibrary.innerHTML = ''; 
    const allTemplates = { ...TEMPLATES, ...templatesManager.getCustom() };

    ui.templateLibrary.innerHTML = Object.entries(allTemplates).map(([id, t]) => {
        return `
            <div class="group relative">
                <button class="w-full text-left bg-slate-950/40 backdrop-blur-md border border-slate-800 hover:border-orange-500/50 rounded-2xl p-4 transition-all duration-300 active:scale-[0.98] outline-none" data-template-id="${id}" aria-label="Template">
                    <div class="font-bold text-slate-200 group-hover:text-orange-400 transition-colors text-sm">${t.name}</div>
                </button>
            </div>`;
    }).join('');
}

/**
 * Loads the specified map's data from storage, initializes the graph and chat history, and displays the main app container.
 */
async function loadMap(mapId) {
    const maps = mapsManager.getAll();
    let mapData = maps[mapId];
    if (!mapData) { toast("Error: Map not found."); showLandingPage(); return; }
    
    const graph = mapData.graphData;
    currentMapId = mapId;
    if (ui.headerProjectName) ui.headerProjectName.textContent = mapData.name || 'Untitled Project';

    // Load Tldraw Snapshot
    if (graph.canvasData && window.tldrawEditor) {
        window.tldrawEditor.store.loadSnapshot(graph.canvasData);
    }
    
    window.projectSources = graph.sources || [];
    window.dispatchEvent(new CustomEvent('sources-updated'));

    const step = graph.researchStep || 1;
    window.dispatchEvent(new CustomEvent('research-step-changed', { detail: { step: step } }));
    
    await loadChatHistory(mapId);
    showAppContainer();
}

/**
 * Retrieves and displays the chat history for a specific map from IndexedDB.
 */
async function loadChatHistory(mapId) {
    if (!ui.aiChatHistory) return;
    ui.aiChatHistory.innerHTML = '';
    const messages = await dbManager.getMapMessages(mapId);

    if (messages.length > 0) {
        messages.forEach(msg => {
            addMessageToChatHistory(msg.role, msg.content, false); 
        });
    } else {
        addMessageToChatHistory('system', 'Chat with me to research topics and build your map!', false);
    }
    ui.aiChatHistory.scrollTop = ui.aiChatHistory.scrollHeight;
}

/**
 * Hides all context menus and popups.
 */
function hidePopups() {
    ui.contextMenu?.classList.add('hidden');
    ui.nodeSettingsPalette?.classList.add('hidden');
    ui.linkContextMenu?.classList.add('hidden');
    ui.canvasContextMenu?.classList.add('hidden');
}

/**
 * Hides all side panels to clear the workspace.
 */
function hideAllSidePanels() {
    ui.nodeDetailPanel?.classList.remove('visible');
    ui.nodeDetailPanel?.style.setProperty('transform', 'translateX(calc(-100% - 48px))');
    ui.sourceViewerPanel?.classList.remove('visible');
    ui.sourceViewerPanel?.style.setProperty('opacity', '0');
    ui.sourceViewerPanel?.style.setProperty('pointer-events', 'none');
    ui.sourceViewerPanel?.style.setProperty('scale', '0.95');
    setSelectedNodeForDetails(null);
}

/**
 * Opens the node detail panel, populates it with the selected node's data, and highlights the node on the graph.
 */
function showNodeDetailPanel(nodeData) {
    clearSelection();
    hideAllSidePanels();

    setSelectedNodeForDetails(nodeData);
    if (ui.nodeDetailTitle) ui.nodeDetailTitle.textContent = nodeData.label || 'Notecard Details';
    syncNotecardToUI(nodeData);
    
    ui.nodeDetailPanel?.classList.add('visible');
    ui.nodeDetailPanel?.style.setProperty('transform', 'translateX(0)');
}

/**
 * Closes the node detail panel and deselects the current node.
 */
function hideNodeDetailPanel() {
    setSelectedNodeForDetails(null);
    ui.nodeDetailPanel?.classList.remove('visible');
    ui.nodeDetailPanel?.style.setProperty('transform', 'translateX(calc(-100% - 48px))');
}

// --- SETUP FUNCTIONS ---
let settingsRoot = null;

function setupSettings() {
    const renderSettings = (isOpen) => {
        if (!settingsRoot) {
            const rootEl = document.getElementById('react-settings-root');
            if (rootEl) settingsRoot = ReactDOM.createRoot(rootEl);
        }
        if (settingsRoot && window.SettingsModal) {
            settingsRoot.render(React.createElement(window.SettingsModal, {
                isOpen: isOpen,
                onClose: () => renderSettings(false),
                onSave: async () => { await initializeAI(); toast('Settings saved.'); }
            }));
        } else if (isOpen) {
             setTimeout(() => renderSettings(isOpen), 100);
        }
    };

    ui.settingsBtn?.addEventListener('click', () => renderSettings(true));
    ui.landingSettingsBtn?.addEventListener('click', () => renderSettings(true));
}

let modalsRoot = null;

function renderModals(modalState = {}) {
    if (!modalsRoot) {
        const rootEl = document.getElementById('react-modals-root');
        if (rootEl) modalsRoot = ReactDOM.createRoot(rootEl);
    }
    if (modalsRoot && window.HelpModal && window.ExportModal) {
        modalsRoot.render(
            React.createElement(React.Fragment, null,
                React.createElement(window.HelpModal, {
                    isOpen: modalState.helpOpen || false,
                    onClose: () => renderModals({ helpOpen: false })
                }),
                React.createElement(window.ExportModal, {
                    isOpen: modalState.exportOpen || false,
                    onClose: () => renderModals({ exportOpen: false }),
                    onExportInteractive: () => { exportInteractiveViewer(); renderModals({ exportOpen: false }); },
                    onExportPrintable: () => { exportPrintableDocument(); renderModals({ exportOpen: false }); },
                    onExportJson: () => { exportAsJSON(); renderModals({ exportOpen: false }); }
                })
            )
        );
    } else {
         setTimeout(() => renderModals(modalState), 100);
    }
}

// --- STUBS FOR TLDRAW EXPORT ---
function exportInteractiveViewer() { toast("Interactive Viewer Exporting... (Coming Soon for Tldraw)"); }
function exportPrintableDocument() { toast("Printable Document Exporting... (Coming Soon for Tldraw)"); }
function exportAsJSON() {
    if (window.tldrawEditor) {
        const snapshot = window.tldrawEditor.store.getSnapshot();
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `project-${Date.now()}.json`; a.click();
    }
}

/**
 * The primary entry point for the application.
 */
async function main() {
    // Wait for Babel modules to load (initResearchCanvas)
    if (!window.initResearchCanvas) {
        setTimeout(main, 50);
        return;
    }

    // Setup Modals
    setupSettings();
    const helpBtn = ui.headerHelpBtn || ui.helpBtn;
    if (helpBtn) helpBtn.addEventListener('click', () => renderModals({ helpOpen: true }));
    const exportBtn = ui.headerExportBtn || ui.exportBtn;
    if (exportBtn) exportBtn.addEventListener('click', () => renderModals({ exportOpen: true }));
    
    // Initialize backend/storage components
    initializeAI();
    await dbManager.init();
    
    // Initialize Canvas
    if (window.initResearchCanvas) {
        window.initResearchCanvas('canvas-root');
    }

    // --- Baked-in AI: Canvas Handlers ---
    window.onCanvasDoubleClick = ({ x, y }) => {
        const label = prompt("What are you researching?");
        if (!label) return;

        // Choice Popover (Simulated with confirm)
        if (confirm("✨ Use Coached Start for '" + label + "'?")) {
            sendChatMessage(`I'm researching '${label}'. Please give me a 3-node starter pack including a definition, a key question, and a logical next step. Use the spawn_notecards tool with shape type 'research-note'.`, currentMapId);
        } else {
            // Simple Note
            if (window.tldrawEditor) {
                window.tldrawEditor.createShape({
                    type: 'research-note',
                    x, y,
                    props: { label }
                });
            }
        }
    };

    window.onNodeDoubleClick = (shape) => {
        if (shape.type === 'research-note') {
            showNodeDetailPanel({
                id: shape.id,
                label: shape.props.label,
                notecard: {
                    quote: shape.props.quote,
                    thoughts: shape.props.thoughts
                }
            });
        }
    };

    window.onNodeSelect = (selectedShapes) => {
        const bar = document.getElementById('strategy-bar');
        if (!bar) return;

        if (selectedShapes.length > 0) {
            bar.classList.remove('opacity-0', 'pointer-events-none');
        } else {
            bar.classList.add('opacity-0', 'pointer-events-none');
            hideNodeDetailPanel();
        }
    };

    // --- Strategy Bar Actions ---
    document.querySelectorAll('.strategy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const editor = window.tldrawEditor;
            if (!editor) return;

            const selected = editor.getSelectedShapes();
            if (selected.length === 0) return;

            const labels = selected.map(s => s.props.label || s.props.text || s.id).filter(Boolean).join(', ');

            switch(action) {
                case 'details':
                    if (selected.length === 1 && selected[0].type === 'research-note') {
                        const shape = selected[0];
                        showNodeDetailPanel({
                            id: shape.id,
                            label: shape.props.label,
                            notecard: {
                                quote: shape.props.quote,
                                thoughts: shape.props.thoughts
                            }
                        });
                    } else {
                        toast("Select a single research note to view details.");
                    }
                    break;
                case 'synthesize':                    sendChatMessage(`Please synthesize these concepts into a summary card: ${labels}`, currentMapId);
                    break;
                case 'gaps':
                    sendChatMessage(`Analyze the evidence gaps for these topics: ${labels}`, currentMapId);
                    break;
                case 'expand':
                    sendChatMessage(`Suggest 3 sub-topics to expand on: ${labels}`, currentMapId);
                    break;
            }
        });
    });

    // --- Desktop Dot Navigation ---
    const setupDesktopDots = () => {
        const dotContainer = document.getElementById('desktop-nav-dots');
        if (!dotContainer) return;

        const sections = [
            { id: 'left-sidebar', label: 'Sources' },
            { id: 'graph-container', label: 'Canvas' },
            { id: 'right-sidebar', label: 'Outline' }
        ];

        dotContainer.innerHTML = '';
        sections.forEach(s => {
            const dot = document.createElement('div');
            dot.className = 'nav-dot';
            dot.title = s.label;
            dot.onclick = () => {
                const el = document.getElementById(s.id);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            };
            dot.dataset.id = s.id;
            dotContainer.appendChild(dot);
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    dotContainer.querySelectorAll('.nav-dot').forEach(d => {
                        d.classList.toggle('active', d.dataset.id === entry.target.id);
                    });
                }
            });
        }, { threshold: 0.5 });

        sections.forEach(s => {
            const el = document.getElementById(s.id);
            if (el) observer.observe(el);
        });
    };

    if (!window.isMobile) {
        setupDesktopDots();
    }

    // Resize Observer for Graph
    const resizeObserver = new ResizeObserver(() => {
        if (!ui.appContainer.classList.contains('hidden')) {
            // Tldraw handles resize internally
        }
    });
    resizeObserver.observe(ui.workspaceLayout);

    // Center View Logic
    ui.centerViewBtn?.addEventListener('click', () => {
        if (window.tldrawEditor) {
            window.tldrawEditor.zoomToFit();
        }
    });

    // --- Sidebar Toggle Logic (Desktop) ---
    // (Removed AI side panel toggle)

    ui.settingsBtn?.addEventListener('click', () => {
        // Settings logic already handled by setupSettings
    });

    // --- Landing Page Event Listeners ---
    ui.newBlankMapBtn?.addEventListener('click', () => {
        const name = prompt("Project Name:", "Untitled Project");
        if (name) {
            const newMapId = mapsManager.create(name, { canvasData: null, sources: [], researchStep: 1 });
            loadMap(newMapId);
        }
    });

    ui.landingAiGenerateBtn?.addEventListener('click', async () => {
        const topic = ui.landingAiTopicInput?.value?.trim();
        if (!topic) { toast("Please enter a topic."); return; }
        const newMapId = mapsManager.create(topic, { canvasData: null, sources: [], researchStep: 1 });
        await loadMap(newMapId);
        
        // Guided Launch Overlay
        const overlay = document.getElementById('guided-launch-overlay');
        const input = document.getElementById('guided-question-input');
        if (overlay) {
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.style.opacity = '1', 10);
            if (input) input.value = `How does ${topic} affect...`;
        }
    });

    // --- Guided Launch Handlers ---
    document.getElementById('guided-launch-btn')?.addEventListener('click', () => {
        const question = document.getElementById('guided-question-input')?.value;
        const overlay = document.getElementById('guided-launch-overlay');
        if (question) {
            sendChatMessage(`I'm launching a new project. My driving question is: "${question}". Please set up my research canvas with a 5-node starter pack including core concepts and initial investigation paths using the spawn_notecards tool.`, currentMapId);
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.classList.add('hidden'), 500);
            }
        }
    });

    document.getElementById('guided-skip-btn')?.addEventListener('click', () => {
        const overlay = document.getElementById('guided-launch-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.classList.add('hidden'), 500);
        }
    });

    // --- Research Step Transition Handler ---
    window.addEventListener('research-step-changed', (e) => {
        const step = e.detail.step;
        document.querySelectorAll('.step-indicator').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.toggle('active', s === step);
            el.classList.toggle('completed', s < step);
        });
        if (ui.researchPhaseName) ui.researchPhaseName.textContent = `Step ${step}`;
    });

    ui.headerSaveBtn?.addEventListener('click', (e) => { mapsManager.saveCurrent(currentMapId); Effects.sparkleElement(e.currentTarget); });
    ui.headerHomeBtn?.addEventListener('click', () => { mapsManager.saveCurrent(currentMapId); hideNodeDetailPanel(); showLandingPage(); });

    ui.mapList?.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        const id = target.dataset.id;
        if (action === 'open') loadMap(id);
        else if (action === 'rename') { const n = prompt("New Name:", mapsManager.getAll()[id].name); mapsManager.rename(id, n, renderLandingPage); }
        else if (action === 'delete') { if (confirm("Delete project?")) mapsManager.delete(id, renderLandingPage); }
    });

    // --- Workspace Tabs ---
    document.querySelectorAll('.workspace-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.workspace-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const view = tab.dataset.tab;
            ui.sourcesView?.classList.toggle('hidden', view !== 'sources');
            ui.outlineView?.classList.toggle('hidden', view !== 'questions');
            if (view === 'questions') updateOutline();
        });
    });

    ui.addSourceBtn?.addEventListener('click', () => {
        const title = prompt("Source Title:");
        const url = prompt("Source URL:");
        if (title || url) {
            let domain = 'External Source';
            try { if (url) domain = new URL(url).hostname; } catch {}

            window.projectSources.push({ title, url, domain });
            window.dispatchEvent(new CustomEvent('sources-updated'));

            // Spawn on canvas
            if (window.tldrawEditor) {
                const { x, y } = window.tldrawEditor.getCamera();
                window.tldrawEditor.createShape({
                    type: 'source-card',
                    x: -x + 100 + (Math.random() * 50),
                    y: -y + 100 + (Math.random() * 50),
                    props: { title, url, domain }
                });
                toast("Source added to bibliography and canvas!");
            }
        }
    });

    ['input', 'blur', 'change'].forEach(evtType => {
        ui.notecardSourceSelect?.addEventListener(evtType, syncUIToNotecard);
        ui.notecardQuote?.addEventListener(evtType, syncUIToNotecard);
        ui.notecardParaphrase?.addEventListener(evtType, syncUIToNotecard);
        ui.notecardThoughts?.addEventListener(evtType, syncUIToNotecard);
    });

    // Re-add missing general listeners
    ui.selectModeBtn?.addEventListener('click', () => {
        isSelectModeActive = !isSelectModeActive;
        ui.selectModeBtn?.classList.toggle('active', isSelectModeActive);
        if (isSelectModeActive) {
            if (window.tldrawEditor) window.tldrawEditor.setCurrentTool('select');
            toast("Select Mode ON");
        } else {
            toast("Select Mode OFF");
        }
    });

    ui.addNodeBtn?.addEventListener('click', () => addNode('New Notecard'));

    // --- Coach HUD Listeners ---
    ui.aiChatSendBtn?.addEventListener('click', () => {
        if (ui.aiChatInput?.value.trim()) {
            sendChatMessage(ui.aiChatInput.value, currentMapId);
            ui.aiChatInput.value = '';
        }
    });

    ui.aiChatInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && ui.aiChatInput?.value.trim()) {
            sendChatMessage(ui.aiChatInput.value, currentMapId);
            ui.aiChatInput.value = '';
        }
    });

    // Handle suggestion chips and resend buttons in history
    ui.aiChatHistory?.addEventListener('click', (e) => {
        const chip = e.target.closest('.suggestion-chip');
        if (chip && chip.dataset.input) {
            sendChatMessage(chip.dataset.input, currentMapId);
            const container = chip.closest('.socratic-prompt-container');
            if (container) {
                container.style.opacity = '0.5';
                container.style.pointerEvents = 'none';
            }
            return;
        }

        const resendBtn = e.target.closest('.resend-btn');
        if (resendBtn && resendBtn.dataset.text) {
            sendChatMessage(resendBtn.dataset.text, currentMapId);
        }
    });
    
    ui.nodeDetailClose?.addEventListener('click', hideNodeDetailPanel);
    ui.sourceViewerClose?.addEventListener('click', hideAllSidePanels);
    ui.openSourceViewerBtn?.addEventListener('click', () => {
        const idx = ui.notecardSourceSelect?.value;
        if (idx !== "") openSourceInViewer(idx);
        else toast("Select a source first!");
    });

    ui.headerLayoutBtn?.addEventListener('click', () => {
        if (window.tldrawEditor) {
            window.tldrawEditor.zoomToFit();
            toast("Zoomed to Fit");
        }
    });

    // Global Click to close popups
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.popup-menu, .node, .sidebar-container, .modal-overlay, #node-creation-choice, #mobile-nav')) {
            hidePopups();
            if (!isSelectModeActive) clearSelection();
        }
    });

    // --- Mobile Bottom Navigation Logic ---
    if (window.isMobile) {
        const sections = [ui.leftSidebar, ui.graphContainer || document.getElementById('graph-container'), ui.rightSidebar];
        const navButtons = document.querySelectorAll('.mobile-nav-btn');

        const observerOptions = {
            root: ui.workspaceLayout,
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navButtons.forEach(btn => {
                        const targetSectionId = btn.dataset.section;
                        btn.classList.toggle('active', entry.target.id === targetSectionId);
                    });
                }
            });
        }, observerOptions);

        sections.forEach(section => {
            if (section) observer.observe(section);
        });

        // Wiring Nav Buttons to Scroll
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.section;
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Mobile Add Node Button
        ui.mobileAddNodeBtn?.addEventListener('click', () => {
            // Scroll to canvas first if not there
            const canvasEl = document.getElementById('graph-container');
            if (canvasEl) canvasEl.scrollIntoView({ behavior: 'smooth' });
            
            // Show creation choice
            addNode('New Notecard');
        });

        // Mobile Settings Button
        ui.mobileSettingsBtn?.addEventListener('click', () => {
             ui.settingsBtn?.click();
        });

        // Node Creation Choice Handlers
        ui.createSimpleNote?.addEventListener('click', () => {
            const label = ui.nodeCreationChoice.dataset.label;
            if (window.tldrawEditor) {
                const { x, y } = window.tldrawEditor.getCamera();
                window.tldrawEditor.createShape({
                    type: 'research-note',
                    x: -x + 100, y: -y + 100,
                    props: { label }
                });
            }
            ui.cancelNodeCreation.click();
        });

        ui.createCoachedNote?.addEventListener('click', () => {
            const label = ui.nodeCreationChoice.dataset.label;
            sendChatMessage(`I'm researching '${label}'. Please give me a 3-node starter pack including a definition, a key question, and a logical next step. Use the spawn_notecards tool with shape type 'research-note'.`, currentMapId);
            ui.cancelNodeCreation.click();
        });

        ui.cancelNodeCreation?.addEventListener('click', () => {
            ui.nodeCreationChoice.style.opacity = '0';
            setTimeout(() => ui.nodeCreationChoice.classList.add('hidden'), 500);
        });
    }

    showLandingPage();
}

main();