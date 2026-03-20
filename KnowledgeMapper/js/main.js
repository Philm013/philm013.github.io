/* global d3 */
import { ui, PRESET_COLORS, PRESET_SHAPES, toast, setAILoading, addMessageToChatHistory, Modal } from './ui.js';
import { initGraph, updateGraph, addNode, deleteNodeById, connectNodesById, changeLayout, fitView, getGraphState, loadGraphData, clearSelection, toggleNodeSelection, copySelection, pasteSelection, groupSelectedNodes, ungroupNode, getSelectedNodeForDetails, setSelectedNodeForDetails, editNodeLabel } from './graph.js';
import { dbManager, mapsManager, templatesManager } from './storage.js';
import { initializeAI, sendChatMessage, DEFAULT_STEP_PROMPTS, DEFAULT_PROMPTS } from './api.js';


// --- GLOBAL STATE & SETUP ---
let currentMapId = null;
let selectedNodeForContextMenu = null;
let selectedLinkForContextMenu = null;
let selectedNodeForSettings = null;
let isSelectModeActive = false;

/**
 * Updates the bibliography list in the UI and notecard select dropdowns.
 */
async function updateSourcesUI() {
    const list = ui.sourcesList;
    const select = ui.notecardSourceSelect;
    if (!list || !select || !currentMapId) return;

    const sources = await dbManager.getMapSources(currentMapId);
    list.innerHTML = '';
    select.innerHTML = '<option value="">No source linked</option>';

    if (sources.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary); font-style: italic;">No sources added yet.</div>';
    }

    sources.forEach((source) => {
        // Update Bibliography List
        const item = document.createElement('div');
        item.className = 'source-item';
        
        const icon = source.type === 'file' ? 'solar:file-bold-duotone' : 'solar:link-bold-duotone';
        
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:40px; height:40px; border-radius:10px; background:rgba(108, 92, 231, 0.1); display:flex; align-items:center; justify-content:center; color:var(--accent-primary);">
                    <span class="iconify" data-icon="${icon}" data-width="20"></span>
                </div>
                <div class="source-info" style="flex-grow:1;">
                    <h4 style="margin:0; font-size:14px;">${source.title || 'Untitled Source'}</h4>
                    <p style="margin:2px 0 0 0; font-size:11px; color:var(--text-secondary); opacity:0.8; word-break:break-all;">${source.type === 'file' ? source.fileType : source.url}</p>
                </div>
            </div>
            <div style="display:flex; gap:4px;">
                ${source.type === 'url' ? `<button class="icon-button" onclick="window.open('${source.url}', '_blank')" title="Open Link"><span class="iconify" data-icon="solar:arrow-right-up-bold-duotone"></span></button>` : ''}
                <button class="icon-button danger" data-id="${source.id}" data-action="delete-source" title="Delete Source">
                    <span class="iconify" data-icon="solar:trash-bin-trash-bold-duotone"></span>
                </button>
            </div>
        `;
        list.appendChild(item);

        // Update Notecard Dropdown
        const option = document.createElement('option');
        option.value = source.id;
        option.textContent = source.title;
        select.appendChild(option);
    });

    // Add event listeners to newly created delete buttons
    list.querySelectorAll('[data-action="delete-source"]').forEach(btn => {
        btn.onclick = async () => {
            const confirmed = await Modal.confirm("Delete Source", "Are you sure you want to remove this source from your bibliography?");
            if (confirmed) {
                await dbManager.deleteSource(parseInt(btn.dataset.id));
                updateSourcesUI();
                toast("Source removed.");
            }
        };
    });
}

window.addEventListener('sources-updated', updateSourcesUI);

/**
 * Builds a structured outline from the graph hierarchy.
 */
function updateOutline() {
    const { nodes, links } = getGraphState();
    const tree = ui.outlineTree;
    if (!tree) return;

    tree.innerHTML = '';

    const nodeMap = new Map(nodes.map(n => [n.id, { ...n, children: [] }]));
    const roots = [];
    const hasParent = new Set();

    links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);
        if (sourceNode && targetNode) {
            sourceNode.children.push(targetNode);
            hasParent.add(targetId);
        }
    });

    nodeMap.forEach(node => {
        if (!hasParent.has(node.id)) roots.push(node);
    });

    const renderLevel = (node, depth) => {
        const div = document.createElement('div');
        div.className = 'outline-node';
        div.style.paddingLeft = `${depth * 24}px`;
        div.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                <div class="outline-node-content" style="flex-grow:1; cursor:pointer;" data-id="${node.id}" data-action="focus-node">
                    <strong style="font-size:15px; color:var(--text-primary);">${node.label}</strong>
                    ${node.notecard?.paraphrase ? `<p style="margin:4px 0 0 0; font-size:12px; color:var(--text-secondary);">${node.notecard.paraphrase.substring(0, 100)}...</p>` : ''}
                </div>
                <div style="display:flex; gap:4px;">
                    <button class="icon-button" data-id="${node.id}" data-action="edit-node" title="Rename Node">
                        <span class="iconify" data-icon="solar:pen-new-square-bold-duotone"></span>
                    </button>
                    <button class="icon-button danger" data-id="${node.id}" data-action="delete-node" title="Delete Node">
                        <span class="iconify" data-icon="solar:trash-bin-trash-bold-duotone"></span>
                    </button>
                </div>
            </div>
        `;
        tree.appendChild(div);
        node.children.forEach(child => renderLevel(child, depth + 1));
    };

    roots.forEach(root => renderLevel(nodeMap.get(root.id), 0));

    // Outline CRUD Listeners
    tree.onclick = async (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        const nodeId = target.dataset.id;
        const node = nodes.find(n => n.id === nodeId);

        switch (action) {
            case 'focus-node':
                showNodeDetailPanel(node);
                loadChatHistory(currentMapId, nodeId);
                break;
            case 'edit-node':
                const newLabel = await Modal.prompt("Rename Node", "Enter a new label for this node:", node.label);
                if (newLabel) {
                    editNodeLabel(nodeId, newLabel);
                    updateOutline();
                }
                break;
            case 'delete-node':
                if (await Modal.confirm("Delete Node", `Delete "${node.label}" and all its descendants?`)) {
                    deleteNodeById(nodeId);
                    updateOutline();
                }
                break;
        }
    };
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
    const node = getSelectedNodeForDetails();
    if (!node) return;
    if (!node.notecard) node.notecard = {};
    
    if (ui.notecardSourceSelect) node.notecard.sourceIndex = ui.notecardSourceSelect.value;
    if (ui.notecardQuote) node.notecard.quote = ui.notecardQuote.innerHTML;
    if (ui.notecardParaphrase) node.notecard.paraphrase = ui.notecardParaphrase.innerHTML;
    if (ui.notecardThoughts) node.notecard.thoughts = ui.notecardThoughts.innerHTML;
    
    // Also update standard details for backward compatibility/export
    node.details = `
        ${node.notecard.quote ? `<h4>Quote</h4><blockquote>${node.notecard.quote}</blockquote>` : ''}
        ${node.notecard.paraphrase ? `<h4>Paraphrase</h4><p>${node.notecard.paraphrase}</p>` : ''}
        ${node.notecard.thoughts ? `<h4>My Thoughts</h4><p>${node.notecard.thoughts}</p>` : ''}
    `;
};

// --- CONSTANTS ---
const TEMPLATES = {
    scientific_inquiry: {
        name: "Scientific Inquiry Cycle",
        description: "A structured approach for experimental research.",
        graphData: {
            nodes: [
                { id: 'node-1', label: 'Driving Question', shape: 'rectangle', color: 'var(--accent-primary)', details: 'What is the specific, measurable question you are trying to answer?' },
                { id: 'node-2', label: 'Hypothesis', shape: 'rectangle', color: '#7ed321', details: 'If... then... because...' },
                { id: 'node-3', label: 'Variables', shape: 'rectangle', color: '#f5a623', details: 'Independent, Dependent, and Controlled variables.' },
                { id: 'node-4', label: 'Procedure', shape: 'rectangle', color: '#50e3c2', details: 'Step-by-step instructions for the experiment.' },
                { id: 'node-5', label: 'Data & Analysis', shape: 'rectangle', color: '#6c5ce7', details: 'Observations and statistical results.' },
                { id: 'node-6', label: 'Conclusion', shape: 'rectangle', color: '#e24a4a', details: 'Does the data support your hypothesis?' }
            ],
            links: [
                { source: 'node-1', target: 'node-2' },
                { source: 'node-2', target: 'node-3' },
                { source: 'node-3', target: 'node-4' },
                { source: 'node-4', target: 'node-5' },
                { source: 'node-5', target: 'node-6' },
                { source: 'node-6', target: 'node-1', label: 'Refine' }
            ],
            counter: 6, layout: 'mindmap', linkStyle: 'curved'
        }
    },
    cer_framework: {
        name: "CER Framework",
        description: "Claim, Evidence, Reasoning structure for arguments.",
        graphData: {
            nodes: [
                { id: 'node-1', label: 'Central Claim', shape: 'rectangle', color: 'var(--accent-primary)', details: 'A statement that answers your research question.' },
                { id: 'node-2', label: 'Evidence 1', shape: 'rectangle', color: '#74b9ff', details: 'Scientific data that supports your claim.' },
                { id: 'node-3', label: 'Evidence 2', shape: 'rectangle', color: '#74b9ff', details: 'More supporting data from a different source.' },
                { id: 'node-4', label: 'Reasoning', shape: 'rectangle', color: '#fdcb6e', details: 'Explain WHY the evidence supports your claim using scientific principles.' }
            ],
            links: [
                { source: 'node-1', target: 'node-2' },
                { source: 'node-1', target: 'node-3' },
                { source: 'node-2', target: 'node-4' },
                { source: 'node-3', target: 'node-4' }
            ],
            counter: 4, layout: 'mindmap', linkStyle: 'straight'
        }
    },
    literature_web: {
        name: "Literary Analysis",
        description: "Map out characters, themes, and symbolism.",
        graphData: {
            nodes: [
                { id: 'node-1', label: 'Core Theme', shape: 'rectangle', color: 'var(--accent-primary)' },
                { id: 'node-2', label: 'Protagonist', shape: 'ellipse', color: '#ff7675' },
                { id: 'node-3', label: 'Symbolism', shape: 'diamond', color: '#a29bfe' },
                { id: 'node-4', label: 'Key Quote', shape: 'rectangle', color: '#dfe6e9' }
            ],
            links: [
                { source: 'node-1', target: 'node-2' },
                { source: 'node-1', target: 'node-3' },
                { source: 'node-2', target: 'node-4' }
            ],
            counter: 4, layout: 'mindmap', linkStyle: 'curved'
        }
    }
};

const EXEMPLARS = {
    photosynthesis: {
        name: "Exemplar: Photosynthesis",
        description: "A complete research map on how plants create energy.",
        graphData: {
            nodes: [
                { id: 'node-1', label: 'Photosynthesis', shape: 'rectangle', color: '#00b894', details: 'The process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water.' },
                { id: 'node-2', label: 'Light-Dependent Reactions', shape: 'rectangle', color: '#ffeaa7', details: 'Occurs in the thylakoid membranes of chloroplasts.' },
                { id: 'node-3', label: 'Calvin Cycle', shape: 'rectangle', color: '#55efc4', details: 'A set of chemical reactions that take place in chloroplasts during photosynthesis.' },
                { id: 'node-4', label: 'Chlorophyll', shape: 'ellipse', color: '#00cec9', details: 'The green pigment responsible for the absorption of light.' },
                { id: 'node-5', label: 'Sunlight Energy', shape: 'diamond', color: '#fdcb6e', details: 'The primary energy source for the entire process.' }
            ],
            links: [
                { source: 'node-1', target: 'node-2' },
                { source: 'node-1', target: 'node-3' },
                { source: 'node-2', target: 'node-4' },
                { source: 'node-5', target: 'node-2' }
            ],
            counter: 5, layout: 'mindmap', linkStyle: 'curved'
        }
    },
    ai_impact: {
        name: "Exemplar: AI in Society",
        description: "Analysis of benefits and risks of Artificial Intelligence.",
        graphData: {
            nodes: [
                { id: 'node-1', label: 'AI Impact', shape: 'rectangle', color: '#6c5ce7' },
                { id: 'node-2', label: 'Economic Benefits', shape: 'rectangle', color: '#00cec9', details: 'Increased efficiency and new job categories.' },
                { id: 'node-3', label: 'Ethical Risks', shape: 'rectangle', color: '#ff7675', details: 'Algorithmic bias and loss of privacy.' },
                { id: 'node-4', label: 'Automation', shape: 'rectangle', color: '#fab1a0' },
                { id: 'node-5', label: 'Generative AI', shape: 'rectangle', color: '#74b9ff' }
            ],
            links: [
                { source: 'node-1', target: 'node-2' },
                { source: 'node-1', target: 'node-3' },
                { source: 'node-2', target: 'node-4' },
                { source: 'node-5', target: 'node-1' }
            ],
            counter: 5, layout: 'mindmap', linkStyle: 'curved'
        }
    }
};

/**
 * Triggers the device's vibration hardware for a specified duration, if supported by the browser.
 * @param {number} [duration=30] - The duration of the vibration in milliseconds.
 */
const vibrate = (duration = 30) => navigator.vibrate && navigator.vibrate(duration);

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
            li.className = 'map-list-item';
            li.innerHTML = `
                <div class="map-info" data-id="${mapId}" data-action="open" style="cursor:pointer;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <strong>${map.name}</strong>
                        <span style="font-size:10px; color:var(--text-secondary);">${new Date(map.lastModified).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="map-actions">
                    <button data-action="rename" data-id="${mapId}" title="Rename"><span class="iconify" data-icon="solar:pen-new-square-bold-duotone"></span></button>
                    <button data-action="duplicate" data-id="${mapId}" title="Duplicate"><span class="iconify" data-icon="solar:copy-bold-duotone"></span></button>
                    <button data-action="delete" data-id="${mapId}" class="danger" title="Delete"><span class="iconify" data-icon="solar:trash-bin-trash-bold-duotone"></span></button>
                </div>
            `;
            ui.mapList.appendChild(li);
        });
    }
    renderTemplateLibrary();
    renderExemplarLibrary();
}

/**
 * Renders the built-in and custom templates on the landing page.
 */
function renderTemplateLibrary() {
    const custom = templatesManager.getCustom();
    const all = { ...TEMPLATES, ...custom };
    const container = document.getElementById('template-library');
    if (!container) return;

    container.innerHTML = Object.entries(all).map(([id, t]) => `
        <div class="template-card" data-template-id="${id}">
            <div class="template-card-icon">
                <span class="iconify" data-icon="${t.icon || 'solar:document-bold-duotone'}"></span>
            </div>
            <div class="template-card-content">
                <h4>${t.name}</h4>
                <p>${t.description || 'Custom framework'}</p>
            </div>
            ${custom[id] ? `<div class="template-delete-btn" data-template-id="${id}">×</div>` : ''}
        </div>
    `).join('');

    // Add click listeners to cards
    container.querySelectorAll('.template-card').forEach(card => {
        card.onclick = () => {
            const tId = card.dataset.templateId;
            const template = all[tId];
            if (template) {
                const newMapId = mapsManager.create(template.name, JSON.parse(JSON.stringify(template.graphData)));
                loadMap(newMapId);
            }
        };
    });
}

/**
 * Renders the featured exemplars on the landing page.
 */
function renderExemplarLibrary() {
    const container = document.getElementById('exemplar-library');
    if (!container) return;

    container.innerHTML = Object.entries(EXEMPLARS).map(([id, e]) => `
        <div class="template-card exemplar" data-id="${id}">
            <div class="template-card-icon" style="background: rgba(253, 203, 110, 0.1); color: #f39c12;">
                <span class="iconify" data-icon="solar:star-bold-duotone"></span>
            </div>
            <div class="template-card-content">
                <h4>${e.name}</h4>
                <p>${e.description}</p>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.template-card.exemplar').forEach(card => {
        card.onclick = () => {
            const eId = card.dataset.id;
            const exemplar = EXEMPLARS[eId];
            if (exemplar) {
                const newMapId = mapsManager.create(exemplar.name, JSON.parse(JSON.stringify(exemplar.graphData)));
                loadMap(newMapId);
            }
        };
    });
}

/**
 * Loads a specific map by ID, updates the UI, and initializes the graph with the map's data.
 * @param {string} mapId - The ID of the map to load.
 */
async function loadMap(mapId) {
    const maps = mapsManager.getAll();
    const map = maps[mapId];
    if (!map || !map.graphData) {
        toast("Error: Map data is missing or corrupted.");
        return;
    }

    currentMapId = mapId;
    loadGraphData(map.graphData);
    showAppContainer();
    
    // Explicitly render and center the graph on load
    updateGraph(true);
    setTimeout(() => fitView(), 100);
    
    // Explicitly refresh all panels on load
    await loadChatHistory(mapId);
    await updateSourcesUI();
    updateOutline();
    
    const { nodes: currentNodes } = getGraphState();
    if (currentNodes.length > 0) {
        showNodeDetailPanel(currentNodes[0]);
        loadChatHistory(mapId, currentNodes[0].id);
    }

    if (map.graphData.researchStep) {
        window.dispatchEvent(new CustomEvent('research-step-changed', { detail: { step: map.graphData.researchStep } }));
    }

    // Force layout update to ensure panels are sized correctly on desktop
    window.dispatchEvent(new Event('resize'));
    addMessageToChatHistory('status', `Loaded world: ${map.name}`, false);
    toast(`World Loaded: ${map.name} 🚀`);
}

/**
 * Retrieves and displays the chat history for a specific map and optional node from IndexedDB.
 * @param {string} mapId - The ID of the map.
 * @param {string|null} nodeId - The ID of the node to load history for.
 */
async function loadChatHistory(mapId, nodeId = null) {
    if (!ui.aiChatHistory) return;
    ui.aiChatHistory.innerHTML = '';
    
    // Update Panel Title
    const panelTitle = ui.aiPanel?.querySelector('.side-panel-header span');
    if (panelTitle) {
        panelTitle.innerHTML = nodeId ? `<span>Branch Research 🧠</span>` : `<span>Map Strategy 🚀</span>`;
    }

    const messages = await dbManager.getMapMessages(mapId, nodeId);
    
    // Reset API state for the new context
    const apiModule = await import('./api.js');
    apiModule.clearConversationHistory();

    if (messages.length > 0) {
        messages.forEach(msg => {
            addMessageToChatHistory(msg.role, msg.content, false);
        });
        // Re-build API conversation history state
        apiModule.loadConversationHistory(messages);
    } else {
        const contextText = nodeId ? `✨ Let's chat about this node! ✨` : `💡 Chat with me to research topics and build your map! 🚀`;
        addMessageToChatHistory('system', contextText, false);
        
        // AUTO-PROMPT for nodes: If it's a node and no history, get suggestions immediately
        if (nodeId) {
            sendChatMessage("[SYSTEM: User just selected this node for the first time. Provide 3-5 choice-driven next steps or research paths for this specific concept.]", currentMapId, nodeId, true);
        }
    }
    ui.aiChatHistory.scrollTop = ui.aiChatHistory.scrollHeight;
}

/**
 * Hides all context menus and popups.
 */
function hidePopups() {
    ui.contextMenu?.classList.add('hidden');
    ui.canvasContextMenu?.classList.add('hidden');
    ui.nodeSettingsPalette?.classList.add('hidden');
    ui.linkContextMenu?.classList.add('hidden');
}

/**
 * Opens the node detail panel, populates it with the selected node's data, and highlights the node on the graph.
 * @param {object} nodeData - The data object for the node to display.
 */
function showNodeDetailPanel(nodeData) {
    if (getSelectedNodeForDetails() && getGraphState().currentLayout !== 'sunburst') {
        d3.selectAll('.node').filter(d => d.id === getSelectedNodeForDetails().id).classed('selected', false);
    }
    clearSelection();
    setSelectedNodeForDetails(nodeData);
    if (ui.nodeDetailTitle) ui.nodeDetailTitle.textContent = nodeData.label || 'Notecard Details';
    syncNotecardToUI(nodeData);
    ui.nodeDetailPanel?.classList.add('visible');
}

/**
 * Closes the node detail panel and deselects the current node.
 */
function hideNodeDetailPanel() {
    if (getSelectedNodeForDetails() && getGraphState().currentLayout !== 'sunburst') {
        d3.selectAll('.node').filter(n => n.id === getSelectedNodeForDetails().id).classed('selected', false);
    }
    setSelectedNodeForDetails(null);
    ui.nodeDetailPanel?.classList.remove('visible');
}

function showSettingsPalette(nodeData) {
    selectedNodeForSettings = nodeData;
    ui.nodeSettingsPalette.style.top = `${window.innerHeight / 2 - 100}px`;
    ui.nodeSettingsPalette.style.left = `${window.innerWidth / 2 - 110}px`;
    ui.nodeSettingsPalette.classList.remove('hidden');
}

// --- EXPORT FUNCTIONS ---
function generateDownload(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function exportInteractiveViewer() {
    if (!currentMapId) return;
    const maps = mapsManager.getAll();
    const mapName = maps[currentMapId]?.name || 'Untitled Map';
    const sanitizedName = mapName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${sanitizedName}-viewer.html`;
    
    // In a real implementation, this would fetch a template and inject the graph JSON.
    const data = mapsManager.getCurrentGraphData();
    const html = `<!DOCTYPE html><html><head><title>${mapName} Viewer</title><script>const graphData = ${JSON.stringify(data)};<\/script></head><body><h1>Interactive Viewer for ${mapName} (Coming Soon)</h1></body></html>`;
    generateDownload(filename, html, 'text/html');
    ui.exportModal?.classList.add('hidden');
}

function exportPrintableDocument() {
    if (!currentMapId) return;
    const maps = mapsManager.getAll();
    const mapName = maps[currentMapId]?.name || 'Untitled Map';
    const sanitizedName = mapName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${sanitizedName}-report.html`;
    const printCSS = `
        body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
        .node-block { margin-bottom: 2em; padding-left: 1em; border-left: 3px solid #eee; }
        .node-details { margin-top: 1em; } .node-details a { color: #0066cc; }
        .cross-links { margin-top: 1em; font-size: 0.9em; color: #555; }
        .cross-links ul { list-style: none; padding-left: 0; }
        .cross-links li { display: inline-block; background-color: #f0f0f0; padding: 2px 8px; border-radius: 4px; margin-right: 5px; }
        @media print { body { max-width: 100%; margin: 20px; font-size: 10pt; } a { text-decoration: none; color: #0066cc; } .node-block { page-break-inside: avoid; } }
    `;
    const { nodes, links } = getGraphState();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const childrenMap = new Map(nodes.map(n => [n.id, []]));
    const parentMap = new Map();
    links.forEach(l => {
        if (childrenMap.has(l.source.id)) childrenMap.get(l.source.id).push(l.target.id);
        parentMap.set(l.target.id, l.source.id);
    });
    const rootNodes = nodes.filter(n => !parentMap.has(n.id));
    let htmlContent = '';
    const visited = new Set();
    function traverseAndBuild(nodeId, level) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        const node = nodeMap.get(nodeId);
        if (!node) return;
        htmlContent += `<div class="node-block" style="margin-left: ${(level - 1) * 25}px;"><h${level}>${node.label}</h${level}>`;
        if (node.details) htmlContent += `<div class="node-details">${node.details}</div>`;
        const nodeLinks = links.filter(l => l.source.id === nodeId);
        const childIds = new Set(childrenMap.get(nodeId));
        const crossLinks = nodeLinks.filter(l => !childIds.has(l.target.id));
        if (crossLinks.length > 0) {
            htmlContent += `<div class="cross-links"><strong>Cross-references:</strong><ul>`;
            crossLinks.forEach(l => { htmlContent += `<li>${l.target.label}</li>`; });
            htmlContent += `</ul></div>`;
        }
        htmlContent += `</div>`;
        (childrenMap.get(nodeId) || []).forEach(childId => traverseAndBuild(childId, Math.min(6, level + 1)));
    }
    rootNodes.forEach(root => traverseAndBuild(root.id, 2));
    const fullHtml = `<!DOCTYPE html><html><head><title>${mapName} - Document</title><meta charset="UTF-8"><style>${printCSS}</style></head>
<body><h1>${mapName}</h1>${htmlContent}</body></html>`;
    generateDownload(filename, fullHtml, 'text/html');
    ui.exportModal?.classList.add('hidden');
}

function exportAsJSON() {
    if (!currentMapId) return;
    const maps = mapsManager.getAll();
    const mapName = maps[currentMapId]?.name || 'Untitled Map';
    const sanitizedName = mapName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${sanitizedName}.json`;
    const data = mapsManager.getCurrentGraphData();
    generateDownload(filename, JSON.stringify(data, null, 2), 'application/json');
    ui.exportModal?.classList.add('hidden');
}

// --- SETUP FUNCTIONS ---
function setupSettings() {
    // Tab Switching Logic
    ui.settingsTabs.forEach(tab => {
        tab.onclick = () => {
            ui.settingsTabs.forEach(t => t.classList.remove('active'));
            ui.settingsTabPanels.forEach(p => p.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
        };
    });

    const renderApiKeyList = () => {
        const list = ui.apiKeys.geminiKeysList;
        if (!list) return;
        const keys = JSON.parse(localStorage.getItem('gemini_api_keys') || '[]');
        list.innerHTML = '';

        if (keys.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding: 10px; color: var(--text-secondary); font-size: 13px;">No keys added yet.</div>';
            return;
        }

        keys.forEach((key, index) => {
            const isOnCooldown = window.aiHelper?.isKeyOnCooldown(key);
            const statusClass = isOnCooldown ? 'cooldown' : 'active';
            const statusText = isOnCooldown ? 'Cooldown' : 'Active';
            
            const card = document.createElement('div');
            card.className = 'api-key-card';
            card.innerHTML = `
                <div class="key-info">
                    <span class="key-masked">${key.substring(0, 6)}...${key.substring(key.length - 4)}</span>
                    <div class="status-badge ${statusClass}">${statusText}</div>
                </div>
                <button class="icon-button danger delete-key-btn" data-index="${index}" title="Remove Key">
                    <span class="iconify" data-icon="solar:trash-bin-trash-bold-duotone"></span>
                </button>
            `;
            list.appendChild(card);
        });

        list.querySelectorAll('.delete-key-btn').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.index);
                const currentKeys = JSON.parse(localStorage.getItem('gemini_api_keys') || '[]');
                currentKeys.splice(idx, 1);
                localStorage.setItem('gemini_api_keys', JSON.stringify(currentKeys));
                renderApiKeyList();
            };
        });
    };

    ui.apiKeys.addKeyBtn.onclick = () => {
        const newKey = ui.apiKeys.newGeminiKey.value.trim();
        if (newKey.length < 10) { toast("Please enter a valid API key."); return; }
        const currentKeys = JSON.parse(localStorage.getItem('gemini_api_keys') || '[]');
        if (currentKeys.includes(newKey)) { toast("Key already exists."); return; }
        currentKeys.push(newKey);
        localStorage.setItem('gemini_api_keys', JSON.stringify(currentKeys));
        ui.apiKeys.newGeminiKey.value = '';
        renderApiKeyList();
        toast("Key added! 🔑");
    };

    // Populate dropdowns
    const populateSelects = async () => {
        if (window.aiHelper) {
            await window.aiHelper.populateModelSelector(ui.modelSelectors.tool, localStorage.getItem('tool_model') || 'gemini-2.0-flash');
            await window.aiHelper.populateModelSelector(ui.modelSelectors.content, localStorage.getItem('content_model') || 'gemini-1.5-pro');
        }
    };
    
    // Load other keys
    ui.apiKeys.hf.value = localStorage.getItem('hf_key') || '';
    ui.apiKeys.newsapi.value = localStorage.getItem('newsapi_key') || '';
    if (ui.apiKeys.debugModeToggle) ui.apiKeys.debugModeToggle.checked = localStorage.getItem('debug_mode') === 'true';

    // Load custom prompts
    const customStepPrompts = JSON.parse(localStorage.getItem('custom_step_prompts') || '{}');
    Object.keys(ui.stepPrompts).forEach(key => {
        const el = ui.stepPrompts[key];
        if (!el) return;
        
        let defaultValue = "";
        if (key >= 1 && key <= 6) defaultValue = DEFAULT_STEP_PROMPTS[key];
        else if (DEFAULT_PROMPTS[key]) defaultValue = DEFAULT_PROMPTS[key];

        el.value = (key >= 1 && key <= 6) ? (customStepPrompts[key] || defaultValue) : (localStorage.getItem(`custom_prompt_${key}`) || defaultValue);
    });
    
    // Save handler
    ui.saveSettingsBtn.onclick = async () => {
        localStorage.setItem('hf_key', ui.apiKeys.hf.value.trim());
        localStorage.setItem('newsapi_key', ui.apiKeys.newsapi.value.trim());
        if (ui.apiKeys.debugModeToggle) localStorage.setItem('debug_mode', ui.apiKeys.debugModeToggle.checked);

        const newCustomStepPrompts = {};
        Object.keys(ui.stepPrompts).forEach(key => {
            const el = ui.stepPrompts[key];
            if (!el) return;

            if (key >= 1 && key <= 6) {
                newCustomStepPrompts[key] = el.value;
            } else {
                localStorage.setItem(`custom_prompt_${key}`, el.value);
            }
        });
        localStorage.setItem('custom_step_prompts', JSON.stringify(newCustomStepPrompts));
        
        localStorage.setItem('tool_model', ui.modelSelectors.tool.value);
        localStorage.setItem('content_model', ui.modelSelectors.content.value);
        
        await initializeAI();
        ui.settingsModal.classList.add('hidden');
        toast('Settings saved. ✨');
    };

    const openSettings = () => {
        renderApiKeyList();
        populateSelects();
        ui.settingsModal.classList.remove('hidden');
    };

    ui.settingsBtn.addEventListener('click', openSettings);
    ui.landingSettingsBtn.addEventListener('click', openSettings);
    ui.settingsModal.querySelector('.modal-close-btn').addEventListener('click', () => ui.settingsModal.classList.add('hidden'));
}

const HELP_CONTENT = `
    <div style="display:flex; flex-direction:column; gap:20px;">
        <section>
            <h4 style="color:var(--accent-primary);">🖱️ Desktop Controls</h4>
            <ul style="font-size:13px; line-height:1.6; color:var(--text-secondary);">
                <li><b>Pan:</b> Click and drag the background.</li>
                <li><b>Zoom:</b> Use the mouse wheel.</li>
                <li><b>Multi-Select (Lasso):</b> Hold <b>Shift</b> and drag.</li>
                <li><b>Connect:</b> Click 'Connect' tool, then click Source -> Target nodes.</li>
                <li><b>Context Menu:</b> Right-click nodes or canvas for more options.</li>
            </ul>
        </section>
        <section>
            <h4 style="color:var(--accent-primary);">🤖 Curiosity Coach</h4>
            <ul style="font-size:13px; line-height:1.6; color:var(--text-secondary);">
                <li><b>Google Search:</b> Ask me to "Search for [topic]".</li>
                <li><b>Map Building:</b> Say "Add a node for [topic]".</li>
                <li><b>Expansion:</b> Right-click a node and select "Expand Research".</li>
            </ul>
        </section>
    </div>
`;

function setupHelp() {
    ui.helpBtn?.addEventListener('click', () => {
        Modal.show("Curiosity Coach Tips", HELP_CONTENT);
    });
}

/**
 * The primary entry point for the application. It initializes the database, the graph, and sets up all major event listeners for UI elements.
 */
async function main() {
    // Initialize UI components
    if (ui.paletteColors) ui.paletteColors.innerHTML = PRESET_COLORS.map(c => `<div class="palette-color" data-color="${c}" style="background-color:${c};"></div>`).join('');
    if (ui.paletteShapes) ui.paletteShapes.innerHTML = PRESET_SHAPES.map(s => `<div class="palette-shape" data-shape="${s.id}" title="${s.id}"><svg viewBox="0 0 20 20">${s.svg}</svg></div>`).join('');
    
    // Setup Modals
    setupSettings();
    setupHelp();
    
    // Initialize backend/storage components
    initializeAI();
    await dbManager.init();
    
    let connectionSourceNode = null;
    let isConnectionModeActive = false;

    ui.linkStyleBtn?.addEventListener('click', () => {
        isConnectionModeActive = !isConnectionModeActive;
        isSelectModeActive = false; // Mutually exclusive
        ui.linkStyleBtn?.classList.toggle('active', isConnectionModeActive);
        ui.selectModeBtn?.classList.remove('active');
        
        if (isConnectionModeActive) {
            toast("Connection Mode ON. Click Source Node, then Target Node. 🔗");
            connectionSourceNode = null;
        } else {
            toast("Connection Mode OFF.");
            connectionSourceNode = null;
        }
    });

    // Initialize Graph with callbacks
    initGraph({
        onNodeClick: (e, d) => {
            if (isConnectionModeActive) {
                if (!connectionSourceNode) {
                    connectionSourceNode = d;
                    toast(`Source selected: ${d.label}. Now click target node.`);
                    // Visual hint on node?
                } else {
                    if (connectionSourceNode.id !== d.id) {
                        connectNodesById(connectionSourceNode.id, d.id);
                        toast(`Connected ${connectionSourceNode.label} to ${d.label}! 🔗`);
                        connectionSourceNode = null;
                        updateOutline();
                    } else {
                        toast("Cannot connect node to itself.");
                        connectionSourceNode = null;
                    }
                }
                return;
            }
            if (isSelectModeActive || e.ctrlKey || e.metaKey) {
                toggleNodeSelection(d.id);
                hideNodeDetailPanel();
                return;
            }
            if (getSelectedNodeForDetails() === d) {
                hideNodeDetailPanel();
                loadChatHistory(currentMapId); // Switch back to global chat
            } else {
                showNodeDetailPanel(d);
                loadChatHistory(currentMapId, d.id); // Switch to node-specific chat
                addMessageToChatHistory('status', `Focus shifted to: ${d.label}`, false);
            }
        },
        onCanvasClick: () => {
            hideNodeDetailPanel();
            loadChatHistory(currentMapId); // Back to global chat
            clearSelection();
        },
        onNodeContextMenu: (e, d) => {
            e.preventDefault();
            e.stopPropagation();
            hidePopups();
            hideNodeDetailPanel();
            if (!getGraphState().selectedNodes.has(d.id)) {
                clearSelection();
                toggleNodeSelection(d.id, true);
            }
            selectedNodeForContextMenu = d;
            const { links } = getGraphState();
            const hasChildren = links.some(l => l.source.id === d.id);
            const isGroup = hasChildren && d.label.toLowerCase().includes('group');
            if (ui.groupActionsMenu) {
                ui.groupActionsMenu.querySelector('[data-action="group"]').style.display = getGraphState().selectedNodes.size > 1 ? 'block' : 'none';
                ui.groupActionsMenu.querySelector('[data-action="ungroup"]').style.display = isGroup ? 'block' : 'none';
            }
            if (ui.contextMenu) {
                ui.contextMenu.style.top = `${e.pageY}px`;
                ui.contextMenu.style.left = `${e.pageX}px`;
                ui.contextMenu.classList.remove('hidden');
            }
        },
        onLinkContextMenu: (e, d) => {
            e.preventDefault();
            e.stopPropagation();
            hidePopups();
            hideNodeDetailPanel();
            clearSelection();
            selectedLinkForContextMenu = d;
            if (ui.linkContextMenu) {
                ui.linkContextMenu.style.top = `${e.pageY}px`;
                ui.linkContextMenu.style.left = `${e.pageX}px`;
                ui.linkContextMenu.classList.remove('hidden');
            }
        },
        onCanvasContextMenu: (e) => {
            e.preventDefault();
            hidePopups();
            const { x, y } = d3.pointer(e, d3.select("#graph-canvas").node());
            if (ui.canvasContextMenu) {
                ui.canvasContextMenu.dataset.x = x;
                ui.canvasContextMenu.dataset.y = y;
                const pasteItem = ui.canvasContextMenu.querySelector('[data-action="paste"]');
                if (pasteItem) pasteItem.style.display = getGraphState().clipboard ? 'block' : 'none';
                ui.canvasContextMenu.style.top = `${e.pageY}px`;
                ui.canvasContextMenu.style.left = `${e.pageX}px`;
                ui.canvasContextMenu.classList.remove('hidden');
            }
        },
        onGraphChanged: () => {
            updateOutline();
        },
        onHideDetails: () => {
            hideNodeDetailPanel();
        },
        onNodeExpand: (d) => {
            if (ui.aiPanel) ui.aiPanel.classList.add('visible');
            sendChatMessage(`Coach, can you help me brainstorm some sub-topics or angles to expand on "${d.label}"?`, currentMapId, d.id);
        },
    });

    // --- Landing Page Event Listeners ---
    ui.newBlankMapBtn?.addEventListener('click', async () => {
        const name = await Modal.prompt("New Map", "Enter a name for your new curiosity world:", "Untitled Map");
        if (name) {
            const clientWidth = ui.appContainer ? ui.appContainer.clientWidth : window.innerWidth;
            const clientHeight = ui.appContainer ? ui.appContainer.clientHeight : window.innerHeight;
            const initialNode = { id: 'node-1', label: 'Central Idea', x: clientWidth / 2, y: clientHeight / 2, fx: clientWidth / 2, fy: clientHeight / 2, shape: 'rectangle', color: 'var(--node-color)', details: 'This is the starting point of your map. Double-click to edit this label, or chat with the AI to expand on it.' };
            const newMapId = mapsManager.create(name, { nodes: [initialNode], links: [], counter: 1, layout: 'mindmap', linkStyle: 'straight' });
            loadMap(newMapId);
        }
    });

    ui.importJsonBtn?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async re => {
                try {
                    const data = JSON.parse(re.target.result);
                    if (data.nodes) {
                        const mapName = await Modal.prompt('Import Project', 'Enter a name for the imported map:', file.name.replace('.json', ''));
                        if (mapName) {
                            mapsManager.create(mapName, data);
                            renderLandingPage();
                            toast('Map imported successfully!');
                        }
                    } else {
                        toast('Error: Invalid JSON map file.');
                    }
                } catch (e) {
                    toast('Error: Could not parse file.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });

    ui.templateLibrary?.addEventListener('click', async e => {
        const deleteBtn = e.target.closest('.template-delete-btn');
        if (deleteBtn) {
            const tId = deleteBtn.dataset.templateId;
            if (await Modal.confirm("Delete Template", `Are you sure you want to delete this template?`)) {
                templatesManager.delete(tId);
                renderTemplateLibrary();
            }
            return;
        }
        const btn = e.target.closest('button[data-template-id]');
        if (btn) {
            const tId = btn.dataset.templateId;
            const allTemplates = { ...TEMPLATES, ...templatesManager.getCustom() };
            const template = allTemplates[tId];
            if (template) {
                const newMapId = mapsManager.create(template.name, JSON.parse(JSON.stringify(template.graphData)));
                loadMap(newMapId);
            }
        }
    });

    ui.landingAiGenerateBtn?.addEventListener('click', async () => {
        const topic = ui.landingAiTopicInput?.value?.trim();
        if (!topic) { toast("Please enter a topic."); return; }
        
        const clientWidth = ui.appContainer ? ui.appContainer.clientWidth : window.innerWidth;
        const clientHeight = ui.appContainer ? ui.appContainer.clientHeight : window.innerHeight;
        
        const initialNode = { 
            id: 'node-1', 
            label: topic, 
            x: clientWidth / 2, 
            y: clientHeight / 2, 
            fx: clientWidth / 2, 
            fy: clientHeight / 2, 
            shape: 'rectangle', 
            color: 'var(--accent-primary)', 
            details: `Research Topic: ${topic}` 
        };
        
        const newMapId = mapsManager.create(topic, { 
            nodes: [initialNode], 
            links: [], 
            counter: 1, 
            layout: 'mindmap', 
            linkStyle: 'straight',
            researchStep: 1 
        });
        
        await loadMap(newMapId);
        if (ui.aiPanel) ui.aiPanel.classList.add('visible');
        sendChatMessage(`Hi Coach! I want to start a guided research journey on the topic: "${topic}". Let's start with Step 1: Exploration.`, newMapId);
    });

    // --- Research Step Transition Handler ---
    window.addEventListener('research-step-changed', (e) => {
        const step = e.detail.step;
        document.querySelectorAll('.step-indicator').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.toggle('active', s === step);
            // Completed is just a visual hint now, not a blocker
        });
        const stepTitle = document.querySelector(`.step-indicator[data-step="${step}"]`)?.title || "Research";
        addMessageToChatHistory('status', `Research Phase: ${stepTitle}`, false);
        toast(`Research Phase: ${stepTitle} 🚀`);
    });

    // Make steps clickable for non-linear flow
    document.getElementById('research-progress-stepper')?.addEventListener('click', (e) => {
        const indicator = e.target.closest('.step-indicator');
        if (indicator) {
            const step = parseInt(indicator.dataset.step);
            window.dispatchEvent(new CustomEvent('research-step-changed', { detail: { step } }));
            const nodeId = getSelectedNodeForDetails()?.id || null;
            sendChatMessage(`[SYSTEM: The user manually switched to research step ${step} (${indicator.title}). Provide 3-5 choice-driven next steps for this phase.]`, currentMapId, nodeId, true);
        }
    });

    ui.mapList.addEventListener('click', async (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        const id = target.dataset.id;
        const mapName = mapsManager.getAll()[id]?.name || "this map";

        switch (action) {
            case 'open': loadMap(id); break;
            case 'rename': 
                const newName = await Modal.prompt("Rename Map", "Enter new name:", mapsManager.getAll()[id].name); 
                if (newName) {
                    mapsManager.rename(id, newName); 
                    renderLandingPage();
                }
                break;
            case 'duplicate': mapsManager.duplicate(id, renderLandingPage); break;
            case 'delete': 
                if (await Modal.confirm("Delete Map", `Are you sure you want to delete "${mapName}"? This cannot be undone.`)) { 
                    await mapsManager.delete(id, renderLandingPage); 
                } 
                break;
        }
    });

    // --- Main App Event Listeners ---
    ui.homeBtn?.addEventListener('click', () => { mapsManager.saveCurrent(currentMapId); hideNodeDetailPanel(); showLandingPage(); });
    ui.saveBtn?.addEventListener('click', () => mapsManager.saveCurrent(currentMapId));
    
    // --- Workspace Tabs ---
    document.querySelectorAll('.workspace-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.workspace-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const view = tab.dataset.tab;
            ui.chatView?.classList.toggle('hidden', view !== 'chat');
            ui.sourcesView?.classList.toggle('hidden', view !== 'sources');
            ui.outlineView?.classList.toggle('hidden', view !== 'questions');
            if (view === 'questions') updateOutline();
        });
    });

    // --- Enhanced Source Event Listeners ---
    ui.addUrlSourceBtn?.addEventListener('click', async () => {
        const title = await Modal.prompt("Add URL Source", "Source Title:", "Web Page");
        if (!title) return;
        const url = await Modal.prompt("Add URL Source", "Source URL:", "https://");
        if (url) {
            await dbManager.saveSource(currentMapId, { type: 'url', title, url });
            updateSourcesUI();
            toast("URL Source added!");
        }
    });

    ui.uploadFileSourceBtn?.addEventListener('click', () => ui.sourceFileInput?.click());

    ui.sourceFileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (re) => {
            const blob = re.target.result;
            await dbManager.saveSource(currentMapId, { 
                type: 'file', 
                title: file.name, 
                blob: blob, 
                fileType: file.type 
            });
            updateSourcesUI();
            toast(`File "${file.name}" uploaded!`);
        };
        reader.readAsArrayBuffer(file);
    });

    // --- Notecard Sync Listeners ---
    ['input', 'blur', 'change'].forEach(evtType => {
        ui.notecardSourceSelect?.addEventListener(evtType, syncUIToNotecard);
        ui.notecardQuote?.addEventListener(evtType, syncUIToNotecard);
        ui.notecardParaphrase?.addEventListener(evtType, syncUIToNotecard);
        ui.notecardThoughts?.addEventListener(evtType, syncUIToNotecard);
    });

    ui.addNodeBtn?.addEventListener('click', () => { vibrate(); addNode('New Notecard'); updateOutline(); });
    ui.toggleViewBtn?.addEventListener('click', () => {
        if (!ui.sourcesView?.classList.contains('hidden')) {
            document.querySelector('.workspace-tab[data-tab="questions"]')?.click();
        } else if (!ui.outlineView?.classList.contains('hidden')) {
            document.querySelector('.workspace-tab[data-tab="chat"]')?.click();
        } else {
            document.querySelector('.workspace-tab[data-tab="sources"]')?.click();
        }
    });

    ui.selectModeBtn?.addEventListener('click', () => {
        isSelectModeActive = !isSelectModeActive;
        isConnectionModeActive = false; // Mutually exclusive
        ui.selectModeBtn?.classList.toggle('active', isSelectModeActive);
        ui.linkStyleBtn?.classList.remove('active');
        connectionSourceNode = null;
        
        ui.appContainer?.querySelector('#graph-container')?.classList.toggle('select-mode-active', isSelectModeActive);
        if (isSelectModeActive) {
            toast("Select Mode ON. Tap nodes to select.");
            clearSelection();
            hideNodeDetailPanel();
        } else {
            toast("Select Mode OFF.");
        }
    });
    ui.layoutBtn?.addEventListener('click', () => {
        const layouts = ['sunburst', 'mindmap', 'flowchart'];
        const { currentLayout } = getGraphState();
        const currentIndex = layouts.indexOf(currentLayout);
        const nextIndex = (currentIndex + 1) % layouts.length;
        changeLayout(layouts[nextIndex]);
    });
    ui.fitViewBtn?.addEventListener('click', () => {
        fitView();
        toast("View Centered 🎯");
    });
    ui.aiPanelBtn.addEventListener('click', () => ui.aiPanel.classList.toggle('visible'));
    ui.aiPanelClose.addEventListener('click', () => ui.aiPanel.classList.remove('visible'));

    // Socratic Chip Interaction
    ui.aiChatHistory.addEventListener('click', async (e) => {
        const chip = e.target.closest('.suggestion-chip');
        if (chip) {
            const action = chip.dataset.action;
            const label = chip.dataset.label;
            const input = chip.dataset.input;
            const url = chip.dataset.url;
            const title = chip.dataset.title;
            const nodeId = getSelectedNodeForDetails()?.id || null;

            if (action === 'preview_source' && url) {
                const modal = document.getElementById('source-preview-modal');
                const iframe = document.getElementById('preview-iframe');
                const titleEl = document.getElementById('preview-title');
                if (modal && iframe && titleEl) {
                    titleEl.textContent = title || "Source Preview";
                    iframe.src = url;
                    modal.classList.remove('hidden');
                    // Store current preview data for the "Add" button in modal
                    modal.dataset.currentUrl = url;
                    modal.dataset.currentTitle = title;
                }
                return;
            }

            if (action === 'add_source' && url) {
                await dbManager.saveSource(currentMapId, { type: 'url', title: title || "Web Source", url });
                updateSourcesUI();
                toast("Source added to Bibliography! 📚");
                chip.classList.add('hidden'); // Hide the add button once added
                return;
            }

            if (action === 'add_node' && label) {
                // ADD INSTANTLY
                const newNode = addNode(label, nodeId);
                toast(`Success! Added "${label}" to your map! 🚀`);
                updateOutline();
                
                // UX Improvement: Auto-select and focus the new node
                showNodeDetailPanel(newNode);
                loadChatHistory(currentMapId, newNode.id);
                
                chip.remove();
                return;
            }

            if (input) {
                sendChatMessage(input, currentMapId, nodeId);
                const container = chip.closest('.socratic-prompt-container');
                if (container) {
                    container.style.opacity = '0.5';
                    container.style.pointerEvents = 'none';
                }
                return;
            }
        }

        const resendBtn = e.target.closest('.resend-btn');
        if (resendBtn && resendBtn.dataset.text) {
            const nodeId = getSelectedNodeForDetails()?.id || null;
            sendChatMessage(resendBtn.dataset.text, currentMapId, nodeId);
        }
    });

    const triggerChat = () => {
        const message = ui.aiChatInput.value;
        if (!message) return;
        const nodeId = getSelectedNodeForDetails()?.id || null;
        sendChatMessage(message, currentMapId, nodeId);
        ui.aiChatInput.value = '';
    };

    ui.aiChatSendBtn.addEventListener('click', triggerChat);
    ui.aiChatInput?.addEventListener('keydown', e => e.key === 'Enter' && triggerChat());

    ui.aiMoreOptionsBtn?.addEventListener('click', () => {
        const nodeId = getSelectedNodeForDetails()?.id || null;
        sendChatMessage("[SYSTEM: Suggest more research paths or ideas for the current focus using suggestion chips. Keep it brief and choice-driven.]", currentMapId, nodeId, true);
    });
    
    ui.nodeDetailClose?.addEventListener('click', hideNodeDetailPanel);
    
    ui.generateDetailsBtn?.addEventListener('click', async () => {
        const selectedNode = getSelectedNodeForDetails();
        if (selectedNode) {
            const quote = ui.notecardQuote?.innerText;
            if (!quote || !quote.trim()) {
                toast("Please add a quote first!");
                return;
            }
            setAILoading(true, "Coach is paraphrasing your quote...");
            const prompt = `Help me paraphrase this quote for my research notecard: "${quote}"`;
            await sendChatMessage(prompt, currentMapId, selectedNode.id);
            setAILoading(false);
        }
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.popup-menu, .node, .side-panel, .link-group, .sunburst-arc, .modal-overlay')) {
            hidePopups();
            if (!isSelectModeActive) clearSelection();
        }
    });
    ui.contextMenu?.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        if (action && selectedNodeForContextMenu) {
            const d = selectedNodeForContextMenu;
            switch (action) {
                case 'details': showNodeDetailPanel(d); break;
                case 'connect-to':
                    isConnectionModeActive = true;
                    connectionSourceNode = d;
                    ui.linkStyleBtn?.classList.add('active');
                    toast(`Source selected: ${d.label}. Now click target node. 🔗`);
                    break;
                case 'expand':
                    if (ui.aiPanel) ui.aiPanel.classList.add('visible');
                    sendChatMessage(`Coach, I want to expand on "${d.label}". Can you suggest some interesting angles or sub-topics?`, currentMapId, d.id);
                    break;
                case 'rephrase':
                    const rephraseInstruction = await Modal.prompt("Rephrase Label", "How to rephrase? (e.g., 'more concise')", "more concise");
                    if (rephraseInstruction) sendChatMessage(`Rephrase the label for node "${d.label}" (ID: ${d.id}) to be ${rephraseInstruction}.`, currentMapId, d.id);
                    break;
                case 'group': groupSelectedNodes(); break;
                case 'ungroup': if (await Modal.confirm("Ungroup", `Ungroup "${d.label}"? This will delete the group node but keep its children.`)) { ungroupNode(d.id); } break;
                case 'settings': if (getGraphState().currentLayout !== 'sunburst') { showSettingsPalette(d); } else { toast("Appearance settings not available in Sunburst view."); } break;
                case 'copy-map': navigator.clipboard.writeText(JSON.stringify(mapsManager.getCurrentGraphData(), null, 2)).then(() => toast("Map JSON data copied to clipboard.")); break;
                case 'delete': if (await Modal.confirm("Delete Node", `Delete "${d.label}" and all its children?`)) { deleteNodeById(d.id); updateOutline(); } break;
            }
        }
        if (action !== 'settings') hidePopups();
        else ui.contextMenu?.classList.add('hidden');
    });
    ui.canvasContextMenu?.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (!action) return;
        switch (action) {
            case 'add-node':
                const coords = { x: parseFloat(ui.canvasContextMenu.dataset.x), y: parseFloat(ui.canvasContextMenu.dataset.y) };
                addNode('New Node', null, { coords });
                updateOutline();
                break;
            case 'paste': pasteSelection(); updateOutline(); break;
            case 'force-mindmap': changeLayout('mindmap', true, true); break;
            case 'force-flowchart': changeLayout('flowchart', true, true); break;
        }
        hidePopups();
    });
    ui.nodeSettingsPalette?.addEventListener('click', (e) => {
        const target = e.target.closest('[data-color]') || e.target.closest('[data-shape]');
        if (target && selectedNodeForSettings) {
            if (target.dataset.color) { selectedNodeForSettings.color = target.dataset.color; }
            if (target.dataset.shape) { selectedNodeForSettings.shape = target.dataset.shape; }
            updateGraph();
        }
    });
    ui.rteToolbar?.addEventListener('mousedown', e => {
        e.preventDefault();
        const button = e.target.closest('.rte-button');
        if (button) { document.execCommand(button.dataset.command, false, null); }
    });
    ui.linkContextMenu?.addEventListener('click', async e => {
        const action = e.target.dataset.action;
        const d = selectedLinkForContextMenu;
        if (!action || !d) return;
        switch (action) {
            case 'edit-label':
                const newLabel = await Modal.prompt("Edit Link Label", "Enter link label:", d.label || "");
                if (newLabel !== null) { d.label = newLabel; updateGraph(); }
                break;
            case 'set-color':
                const newColor = await Modal.prompt("Link Color", "Enter a hex color or name:", d.color || "#b2bec3");
                if (newColor) { d.color = newColor; updateGraph(); }
                break;
            case 'toggle-dashed':
                d.dashed = !d.dashed;
                updateGraph();
                break;
            case 'insert-node':
                const { source, target } = d;
                const newX = (source.x + target.x) / 2;
                const newY = (source.y + target.y) / 2;
                const newNode = addNode('Intermediate', null, { coords: { x: newX, y: newY } });
                connectNodesById(source.id, newNode.id);
                connectNodesById(newNode.id, target.id);
                const { links } = getGraphState();
                const linkIndex = links.findIndex(l => l.source.id === d.source.id && l.target.id === d.target.id);
                if (linkIndex > -1) links.splice(linkIndex, 1);
                updateGraph();
                updateOutline();
                break;
            case 'delete':
                const { links: currentLinks } = getGraphState();
                const linkToDeleteIndex = currentLinks.findIndex(l => l.source.id === d.source.id && l.target.id === d.target.id);
                if (linkToDeleteIndex > -1) currentLinks.splice(linkToDeleteIndex, 1);
                updateGraph();
                break;
        }
        hidePopups();
    });
    
    const EXPORT_CONTENT = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="padding: 16px; background: rgba(108, 92, 231, 0.05); border-radius: 16px; border: 1px solid var(--border-color);">
                <h4 style="margin:0 0 8px 0;">🌐 Interactive Viewer</h4>
                <p style="margin:0 0 12px 0; font-size:12px; color:var(--text-secondary);">A standalone HTML file with a read-only interactive map.</p>
                <button class="primary-button" style="width:100%;" onclick="window.exportInteractiveViewer()">Export Viewer</button>
            </div>
            <div style="padding: 16px; background: rgba(108, 92, 231, 0.05); border-radius: 16px; border: 1px solid var(--border-color);">
                <h4 style="margin:0 0 8px 0;">📄 Printable Document</h4>
                <p style="margin:0 0 12px 0; font-size:12px; color:var(--text-secondary);">A linear report containing all titles and detailed notes.</p>
                <button class="primary-button" style="width:100%;" onclick="window.exportPrintableDocument()">Export Report</button>
            </div>
            <div style="padding: 16px; background: rgba(108, 92, 231, 0.05); border-radius: 16px; border: 1px solid var(--border-color);">
                <h4 style="margin:0 0 8px 0;">🛠️ JSON Data</h4>
                <p style="margin:0 0 12px 0; font-size:12px; color:var(--text-secondary);">Raw graph data for backups or re-importing.</p>
                <button class="secondary-button" style="width:100%;" onclick="window.exportAsJSON()">Export JSON</button>
            </div>
        </div>
    `;

    ui.exportBtn?.addEventListener('click', () => {
        Modal.show("Export Map", EXPORT_CONTENT);
    });

    // Make export functions global for modal access
    window.exportInteractiveViewer = exportInteractiveViewer;
    window.exportPrintableDocument = exportPrintableDocument;
    window.exportAsJSON = exportAsJSON;

    // Source Preview Modal Logic
    const previewAddBtn = document.getElementById('preview-add-source-btn');
    if (previewAddBtn) {
        previewAddBtn.onclick = async () => {
            const modal = document.getElementById('source-preview-modal');
            const url = modal.dataset.currentUrl;
            const title = modal.dataset.currentTitle;
            if (url) {
                await dbManager.saveSource(currentMapId, { type: 'url', title: title || "Web Source", url });
                updateSourcesUI();
                toast("Source added to Bibliography! 📚");
                modal.classList.add('hidden');
                document.getElementById('preview-iframe').src = 'about:blank';
            }
        };
    }

    window.addEventListener('keydown', e => {
        if (ui.appContainer?.classList.contains('hidden')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isCtrl = isMac ? e.metaKey : e.ctrlKey;
        if (isCtrl && e.key === 'c') { e.preventDefault(); copySelection(); }
        if (isCtrl && e.key === 'v') { e.preventDefault(); pasteSelection(); }
    });

    showLandingPage();

    document.addEventListener('click', (e) => {
        if (e.target.closest('.tool-button, .primary-button, .secondary-button, .context-menu-item, .map-list-item, .icon-button')) {
            vibrate(10);
        }
    }, { passive: true });
}

main();
