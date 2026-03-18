/* global d3 */
import { ui, PRESET_COLORS, PRESET_SHAPES, toast, setAILoading, addMessageToChatHistory } from './ui.js';
import { initGraph, updateGraph, addNode, deleteNodeById, connectNodesById, changeLayout, getGraphState, loadGraphData, clearSelection, toggleNodeSelection, copySelection, pasteSelection, groupSelectedNodes, ungroupNode, getSelectedNodeForDetails, setSelectedNodeForDetails } from './graph.js';
import { dbManager, mapsManager, templatesManager } from './storage.js';
import { initializeAI, sendChatMessage, _internal_expandNodeWithAI } from './api.js';


// --- GLOBAL STATE & SETUP ---
let currentMapId = null;
let selectedNodeForContextMenu = null;
let selectedLinkForContextMenu = null;
let selectedNodeForSettings = null;
let isSelectModeActive = false;

window.projectSources = []; // Global bibliography for the current map

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
        item.className = 'source-item';
        item.innerHTML = `
            <div class="source-info">
                <h4>${source.title || 'Untitled Source'}</h4>
                <p>${source.url || 'No URL'}</p>
            </div>
            <button class="icon-button danger" onclick="window.removeSource(${index})">
                <span class="iconify" data-icon="solar:trash-bin-trash-bold-duotone"></span>
            </button>
        `;
        list.appendChild(item);

        // Update Notecard Dropdown
        const option = document.createElement('option');
        option.value = index;
        option.textContent = source.title || source.url;
        select.appendChild(option);
    });
}

window.removeSource = (index) => {
    window.projectSources.splice(index, 1);
    window.dispatchEvent(new CustomEvent('sources-updated'));
};

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
            <div class="outline-node-content">
                <strong>${node.label}</strong>
                ${node.notecard?.paraphrase ? `<p>${node.notecard.paraphrase}</p>` : ''}
            </div>
        `;
        tree.appendChild(div);
        node.children.forEach(child => renderLevel(child, depth + 1));
    };

    roots.forEach(root => renderLevel(nodeMap.get(root.id), 0));
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
    swot: {
        name: "SWOT Analysis",
        graphData: {
            nodes: [
                { id: 'node-1', label: 'Analysis Subject', shape: 'rectangle', color: '#4a90e2' },
                { id: 'node-2', label: 'Strengths', shape: 'rectangle', color: '#7ed321' },
                { id: 'node-3', label: 'Weaknesses', shape: 'rectangle', color: '#f5a623' },
                { id: 'node-4', label: 'Opportunities', shape: 'rectangle', color: '#50e3c2' },
                { id: 'node-5', label: 'Threats', shape: 'rectangle', color: '#e24a4a' }
            ],
            links: [
                { source: 'node-1', target: 'node-2' },
                { source: 'node-1', target: 'node-3' },
                { source: 'node-1', target: 'node-4' },
                { source: 'node-1', target: 'node-5' }
            ],
            counter: 5, layout: 'mindmap', linkStyle: 'curved'
        }
    },
    pros_cons: {
        name: "Pros & Cons List",
        graphData: {
            nodes: [
                { id: 'node-1', label: 'Decision Topic', shape: 'rectangle' },
                { id: 'node-2', label: 'Pros', shape: 'rectangle', color: '#7ed321' },
                { id: 'node-3', label: 'Cons', shape: 'rectangle', color: '#e24a4a' }
            ],
            links: [ { source: 'node-1', target: 'node-2' }, { source: 'node-1', target: 'node-3' } ],
            counter: 3, layout: 'mindmap', linkStyle: 'straight'
        }
    },
    decision_tree: {
        name: "Decision Tree",
        graphData: {
            nodes: [
                { id: 'node-1', label: 'Decision?', shape: 'diamond' },
                { id: 'node-2', label: 'Option A', shape: 'rectangle' },
                { id: 'node-3', label: 'Option B', shape: 'rectangle' }
            ],
            links: [
                { source: 'node-1', target: 'node-2', label: 'Condition 1' },
                { source: 'node-1', target: 'node-3', label: 'Condition 2' }
            ],
            counter: 3, layout: 'flowchart', linkStyle: 'orthogonal'
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
                <div class="map-info" data-action="open" data-id="${mapId}">
                    <strong>${map.name}</strong>
                    <span>Last modified: ${new Date(map.lastModified).toLocaleString()}</span>
                </div>
                <div class="map-actions">
                    <button data-action="rename" data-id="${mapId}">Rename</button>
                    <button data-action="duplicate" data-id="${mapId}">Duplicate</button>
                    <button data-action="delete" data-id="${mapId}" class="danger">Delete</button>
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
    ui.templateLibrary.innerHTML = ''; // Clear existing
    const allTemplates = { ...TEMPLATES, ...templatesManager.getCustom() };

    ui.templateLibrary.innerHTML = Object.entries(allTemplates).map(([id, t]) => {
        const isCustom = id.startsWith('template_');
        const deleteBtnHtml = isCustom ? `<button class="template-delete-btn" data-template-id="${id}" title="Delete Template">×</button>` : '';
        return `<div class="template-item-wrapper">
                    ${deleteBtnHtml}
                    <button class="secondary-button" data-template-id="${id}">${t.name}</button>
                </div>`;
    }).join('');
}

/**
 * Loads the specified map's data from storage, initializes the graph and chat history, and displays the main app container.
 * @param {string} mapId - The ID of the map to load.
 */
async function loadMap(mapId) {
    const maps = mapsManager.getAll();
    let mapData = maps[mapId];
    if (!mapData) {
        toast("Error: Map not found.");
        showLandingPage();
        return;
    }
    const graph = mapData.graphData;
    if (!graph || !graph.nodes) {
        toast("Error: Map data is corrupted.");
        return;
    }
    currentMapId = mapId;
    
    loadGraphData(graph);
    
    // Restore sources
    window.projectSources = graph.sources || [];
    window.dispatchEvent(new CustomEvent('sources-updated'));

    if (graph.researchStep) {

        window.dispatchEvent(new CustomEvent('research-step-changed', { detail: { step: graph.researchStep } }));
    }
    
    await loadChatHistory(mapId);
    showAppContainer();
    updateGraph(true);
    
    const svg = d3.select("#graph-canvas");
    const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => {
        if (getGraphState().currentLayout !== 'sunburst') {
            d3.select("#graph-canvas g").attr("transform", e.transform);
        }
    });
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
}

/**
 * Retrieves and displays the chat history for a specific map from IndexedDB.
 * @param {string} mapId - The ID of the map whose chat history to load.
 */
async function loadChatHistory(mapId) {
    if (!ui.aiChatHistory) return;
    ui.aiChatHistory.innerHTML = '';
    const messages = await dbManager.getMapMessages(mapId);
    const conversationHistory = [];

    if (messages.length > 0) {
        messages.forEach(msg => {
            addMessageToChatHistory(msg.role, msg.content, false); // Don't re-save
            conversationHistory.push({ role: msg.role, parts: [{ text: msg.content }] });
        });
    } else {
        addMessageToChatHistory('system', 'Chat with me to research topics and build your map!', false);
    }
    // The API module will manage its own history state
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
    const transform = d3.zoomTransform(d3.select("#graph-canvas").node());
    const screenX = transform.applyX(nodeData.x);
    const screenY = transform.applyY(nodeData.y);
    if (ui.nodeSettingsPalette) {
        ui.nodeSettingsPalette.style.left = `${screenX + nodeData.width / 2 + 10}px`;
        ui.nodeSettingsPalette.style.top = `${screenY - 20}px`;
        ui.nodeSettingsPalette.classList.remove('hidden');
    }
}

// --- EXPORT FUNCTIONS ---
function generateDownload(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`${filename} exported!`);
}

function exportInteractiveViewer() {
    if (!currentMapId) return;

    const maps = mapsManager.getAll();
    const mapName = maps[currentMapId]?.name || 'Untitled Map';
    const sanitizedName = mapName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${sanitizedName}-viewer.html`;

    const { nodes, links, currentLayout } = getGraphState();
    const exportNodes = JSON.parse(JSON.stringify(nodes));
    const exportLinks = links.map(l => ({ source: l.source.id, target: l.target.id, label: l.label || '' }));
    const exportLayout = currentLayout === 'sunburst' ? 'mindmap' : currentLayout;

    const dataScript = `const graphData = ${JSON.stringify({ nodes: exportNodes, links: exportLinks, layout: exportLayout }, null, 2)};`;

    const viewerCSS = `
        :root { --background: #1a1a1a; --canvas-bg: #212121; --text-primary: #f0f0f0; --text-secondary: #a0a0a0; --node-color: #4a90e2; --node-text: #ffffff; }
        html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; overflow: hidden; height: 100%; width: 100%; background-color: var(--background); color: var(--text-primary); }
        .node { cursor: pointer; } .node-shape { stroke: rgba(0,0,0,0.4); stroke-width: 2px; }
        .node-foreign-object div { font-size: 14px; font-weight: 600; color: var(--node-text); text-align: center; padding: 8px; box-sizing: border-box; height: 100%; display: flex; align-items: center; justify-content: center; line-height: 1.3; word-break: break-word; }
        .link { stroke: #777; stroke-opacity: 0.8; stroke-width: 2.5px; pointer-events: none; }
        .link-label { font-size: 12px; fill: var(--text-secondary); text-anchor: middle; pointer-events: none; paint-order: stroke; stroke: var(--canvas-bg); stroke-width: 3px; stroke-linejoin: round; }
        .details-panel { position: absolute; top: 15px; left: 15px; width: 350px; max-width: 90vw; background: #2c2c2c; border-radius: 12px; border: 1px solid #444; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 50; display: flex; flex-direction: column; max-height: calc(100vh - 40px); transition: transform 0.4s ease; transform: translateX(-120%); }
        .details-panel.visible { transform: translateX(0); }
        .details-header { padding: 10px 15px; font-weight: 600; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center; }
        .details-close { cursor: pointer; font-size: 20px; line-height: 1; }
        .details-content { padding: 15px; overflow-y: auto; flex-grow: 1; }
        .details-content h3, .details-content h4 { margin-top: 1em; margin-bottom: 0.5em; color: #50e3c2; border-bottom: 1px solid #4a4a4a; padding-bottom: 4px; }
        .details-content a { color: #4a90e2; }
    `;

    const fullViewerScript = `
        const svg = d3.select("#graph-canvas"); const g = svg.append("g");
        const detailsPanel = document.getElementById('details-panel'); const detailsTitle = document.getElementById('details-title'); const detailsContent = document.getElementById('details-content');
        document.getElementById('details-close').addEventListener('click', () => detailsPanel.classList.remove('visible'));
        let { nodes, links, layout } = graphData;
        links = links.map(l => ({ source: nodes.find(n => n.id === l.source), target: nodes.find(n => n.id === l.target), label: l.label || '' })).filter(l => l.source && l.target);
        const width = () => document.body.clientWidth; const height = () => document.body.clientHeight;
        function showDetails(node) { detailsTitle.textContent = "Details for \"" + node.label + "\""; detailsContent.innerHTML = node.details || '<p>No details available.</p>'; detailsPanel.classList.add('visible');}
        const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => g.attr("transform", e.transform));
        svg.call(zoom);
        const textMeasurer = document.getElementById('text-measurer');
        nodes.forEach(d => { textMeasurer.style.width = d.label.length > 30 ? '180px' : 'auto'; textMeasurer.textContent = d.label; const rect = textMeasurer.getBoundingClientRect(); d.width = Math.max(60, rect.width + 16); d.height = Math.max(40, rect.height + 16); });
        g.append("g").attr("class", "links").selectAll("line").data(links).enter().append("line").attr("class", "link");
        g.append("g").selectAll("text").data(links).enter().append("text").attr("class", "link-label").text(d => d.label || '');
        const node = g.append("g").attr("class", "nodes").selectAll("g").data(nodes, d => d.id).enter().append("g").attr("class", "node").on('click', (e,d) => showDetails(d));
        node.append('path').attr('fill', d => d.color || 'var(--node-color)').attr('d', d => { const w = d.width; const h = d.height; const r = 8; switch(d.shape) { case 'ellipse': return \`M \${\\-w/2},0 a \${w/2},\${h/2} 0 1,0 \${w},0 a \${w/2},\${h/2} 0 1,0 \${\\-w},0 Z\`; case 'diamond': return \`M 0,\${\\-h/2} L \${w/2},0 L 0,\${h/2} L \${\\-w/2},0 Z\`; case 'hexagon': return \`M \${\\-w/2+4},\\\${\\-h/2} L \${w/2-4},\\\${\\-h/2} L \${w/2},0 L \${w/2-4},\\\${h/2} L \${\\-w/2+4},\\\${h/2} L \${\\-w/2},0 Z\`; default: return \`M \${\\-w/2+r},\\\${\\-h/2} h \${w-2*r} a \${r},\\\${r} 0 0 1 \${r},\${r} v \${h-2*r} a \${r},\\\${r} 0 0 1 \${\\-r},\${r} h \${\\-(w-2*r)} a \${r},\\\${r} 0 0 1 \${\\-r},\\\${\\-r} v \${\\-(h-2*r)} a \${r},\\\${r} 0 0 1 \${r},\\\${\\-r} z\`; } });
        node.append('foreignObject').attr('pointer-events', 'none').attr('x', d => -d.width / 2).attr('y', d => -d.height / 2).attr('width', d => d.width).attr('height', d => d.height).append('xhtml:div').html(d => d.label);
        function buildHierarchy(nodes, links) { const nm = new Map(nodes.map(n=>[n.id,{...n,children:[]}])); const rts=[]; const hp=new Set(); links.forEach(l=>{const s=nm.get(l.source.id); const t=nm.get(l.target.id); if(s&&t){s.children.push(t);hp.add(t.id);}});nm.forEach(n=>{if(!hp.has(n.id))rts.push(n);}); return rts.length > 0 ? rts[0] : (nodes.length > 0 ? nm.get(nodes[0].id) : null);}
        function layoutMindmap(ns, ls) { const h=buildHierarchy(ns,ls); if(!h)return ns; const r=d3.hierarchy(h); const tl=d3.tree().size([2*Math.PI,Math.min(width(),height()) + 240]).separation((a,b)=>(a.parent==b.parent?4:3)/a.depth);const tr=tl(r);const nm=new Map(ns.map(n=>[n.id,n])); tr.each(d=>{ const{x:a,y:rd}=d; const cx=rd*Math.cos(a-Math.PI/2)+width()/2;const cy=rd*Math.sin(a-Math.PI/2)+height()/2; const o=nm.get(d.data.id); if(o){o.x=o.fx=cx;o.y=o.fy=cy;}}); return ns; }
        function layoutFlowchart(ns, ls) { const w=width();const vs=180;const hs=220;const adj = new Map(ns.map(n=>[n.id,[]])); const id = new Map(ns.map(n=>[n.id,0]));(ls||[]).forEach(l=>{const si=l.source.id;const ti=l.target.id;if(adj.has(si)&&id.has(ti)){adj.get(si).push(ti);id.set(ti,id.get(ti)+1);}});const lvs=[];let q=ns.filter(n=>id.get(n.id)===0);while(q.length>0){lvs.push(q); const nq=[]; for(const nd of q){for(const ni of(adj.get(nd.id)||[])){const nn=ns.find(n=>n.id===ni);if(nn&&id.has(ni)){id.set(ni,id.get(ni)-1);if(id.get(ni)===0)nq.push(nn);}}}q=nq;}lvs.forEach((ln,li)=>{const lw=ln.length*hs;const sx=(w/2)-(lw/2)+(hs/2);const y=li*vs+100;ln.forEach((nd,ni)=>{const x=sx+ni*hs;nd.x=nd.fx=x;nd.y=nd.fy=y;});}); return ns;}
        if (layout === 'mindmap') layoutMindmap(nodes, links); else if (layout === 'flowchart') layoutFlowchart(nodes, links);
        const sim = d3.forceSimulation(nodes).on("tick",()=>{g.selectAll(".link").attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);g.selectAll(".link-label").attr("x",d=>(d.source.x+d.target.x)/2).attr("y",d=>(d.source.y+d.target.y)/2);g.selectAll(".node").attr("transform",d=>"translate(" + d.x + "," + d.y + ")");});
        sim.force("link",d3.forceLink(links).id(d=>d.id).distance(150).strength(layout==='flowchart'?0:0.1)).force("collision",d3.forceCollide().radius(d=>Math.max(d.width,d.height)/2+20)); if(layout==='flowchart'){sim.force("charge",null)}
    `;

    const fullHtml = `<!DOCTYPE html>
<html><head><title>${mapName} - Viewer</title><meta charset="UTF-8">
<script src="https://d3js.org/d3.v7.min.js"></script><style>${viewerCSS}</style></head>
<body>
<div style="width:100vw; height:100vh;"><svg id="graph-canvas" width="100%" height="100%"></svg></div>
<div id="details-panel" class="details-panel"><div class="details-header"><span id="details-title"></span><span id="details-close">×</span></div><div id="details-content" class="details-content"></div></div>
<div id="text-measurer" style="position:absolute; visibility:hidden; height:auto; width:auto; white-space:pre-wrap; font-size:14px; font-weight:600;"></div>
<script>${dataScript}</script><script>${fullViewerScript}</script></body></html>`;
    generateDownload(filename, fullHtml, 'text/html');
    ui.exportModal?.classList.add('hidden');
}

function exportPrintableDocument() {
    if (!currentMapId) return;
    const maps = mapsManager.getAll();
    const mapName = maps[currentMapId]?.name || 'Untitled Map';
    const sanitizedName = mapName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${sanitizedName}-document.html`;
    const printCSS = `
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; }
        h1, h2, h3, h4, h5, h6 { color: #111; line-height: 1.2; margin-top: 1.5em; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        h1 { font-size: 2.5em; border-bottom: 2px solid #ccc; }
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
    // Populate dropdowns
    const populateSelect = async (selectEl, defaultValue) => {
        if (window.aiHelper) {
            await window.aiHelper.populateModelSelector(selectEl, defaultValue);
        } else {
            selectEl.innerHTML = '<option value="gemini-2.0-flash">Gemini 2.0 Flash</option>';
        }
    };
    
    const savedToolModel = localStorage.getItem('tool_model') || 'gemini-2.0-flash';
    const savedContentModel = localStorage.getItem('content_model') || 'gemini-1.5-pro';
    
    populateSelect(ui.modelSelectors.tool, savedToolModel);
    populateSelect(ui.modelSelectors.content, savedContentModel);

    // Load saved values
    Object.keys(ui.apiKeys).forEach(key => {
        if (key === 'gemini') {
            const keysArray = JSON.parse(localStorage.getItem('gemini_api_keys') || '[]');
            ui.apiKeys[key].value = keysArray.join(', ');
        } else {
            ui.apiKeys[key].value = localStorage.getItem(`${key}_key`) || '';
        }
    });
    
    // Save handler
    ui.saveSettingsBtn.onclick = async () => {
        Object.keys(ui.apiKeys).forEach(key => {
            const val = ui.apiKeys[key].value.trim();
            if (key === 'gemini') {
                const keysArray = val.split(',').map(k => k.trim()).filter(k => k.length > 5);
                localStorage.setItem('gemini_api_keys', JSON.stringify(keysArray));
                
                // Clear cooldowns for newly saved keys to allow immediate testing
                if (window.aiHelper) {
                    keysArray.forEach(k => window.aiHelper.removeCooldown(k));
                }
                
                // Set the primary key for legacy compatibility if needed
                if (keysArray.length > 0) localStorage.setItem('gemini_key', keysArray[0]);
            } else {
                localStorage.setItem(`${key}_key`, val);
            }
        });
        
        localStorage.setItem('tool_model', ui.modelSelectors.tool.value);
        localStorage.setItem('content_model', ui.modelSelectors.content.value);
        
        await initializeAI();
        ui.settingsModal.classList.add('hidden');
        toast('Settings saved.');
    };

    ui.settingsBtn.addEventListener('click', () => ui.settingsModal.classList.remove('hidden'));
    ui.landingSettingsBtn.addEventListener('click', () => ui.settingsModal.classList.remove('hidden'));
    ui.settingsModal.querySelector('.modal-close-btn').addEventListener('click', () => ui.settingsModal.classList.add('hidden'));
}

function setupHelp() {
    ui.helpBtn.addEventListener('click', () => ui.helpModal.classList.remove('hidden'));
    ui.helpModal.querySelector('.modal-close-btn').addEventListener('click', () => ui.helpModal.classList.add('hidden'));
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
    
    // Initialize Graph with callbacks
    initGraph({
        onNodeClick: (e, d) => {
            if (isSelectModeActive || e.ctrlKey || e.metaKey) {
                toggleNodeSelection(d.id);
                hideNodeDetailPanel();
                return;
            }
            if (getSelectedNodeForDetails() === d) {
                hideNodeDetailPanel();
            } else {
                showNodeDetailPanel(d);
            }
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
        }
    });

    // --- Landing Page Event Listeners ---
    ui.newBlankMapBtn?.addEventListener('click', () => {
        const name = prompt("Enter a name for your new map:", "Untitled Map");
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
            reader.onload = re => {
                try {
                    const data = JSON.parse(re.target.result);
                    if (data.nodes) {
                        const mapName = prompt('Enter a name for the imported map:', file.name.replace('.json', ''));
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

    ui.templateLibrary?.addEventListener('click', e => {
        const deleteBtn = e.target.closest('.template-delete-btn');
        if (deleteBtn) {
            const tId = deleteBtn.dataset.templateId;
            if (confirm(`Are you sure you want to delete this template?`)) {
                templatesManager.delete(tId);
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
            el.classList.toggle('completed', s < step);
        });
        toast(`Research Phase: ${document.querySelector(`.step-indicator[data-step="${step}"]`).title}`);
    });

    ui.mapList.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        const id = target.dataset.id;
        switch (action) {
            case 'open': loadMap(id); break;
            case 'rename': const newName = prompt("Enter new name:", mapsManager.getAll()[id].name); mapsManager.rename(id, newName); break;
            case 'duplicate': mapsManager.duplicate(id); break;
            case 'delete': if (confirm(`Are you sure you want to delete "${mapsManager.getAll()[id].name}"? This cannot be undone.`)) { mapsManager.delete(id); } break;
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

            // Graph is always background, handled via z-index
        });
    });

    ui.addSourceBtn?.addEventListener('click', () => {
        const title = prompt("Source Title:");
        const url = prompt("Source URL:");
        if (title || url) {
            window.projectSources.push({ title, url });
            window.dispatchEvent(new CustomEvent('sources-updated'));
        }
    });

    // --- Notecard Sync ---
    const syncNotecardToUI = (node) => {
        if (!node) return;
        if (!node.notecard) node.notecard = {};
        ui.notecardSourceSelect.value = node.notecard.sourceIndex !== undefined ? node.notecard.sourceIndex : "";
        ui.notecardQuote.innerHTML = node.notecard.quote || "";
        ui.notecardParaphrase.innerHTML = node.notecard.paraphrase || "";
        ui.notecardThoughts.innerHTML = node.notecard.thoughts || "";
    };

    const syncUIToNotecard = () => {
        const node = getSelectedNodeForDetails();
        if (!node) return;
        if (!node.notecard) node.notecard = {};
        
        node.notecard.sourceIndex = ui.notecardSourceSelect.value;
        node.notecard.quote = ui.notecardQuote.innerHTML;
        node.notecard.paraphrase = ui.notecardParaphrase.innerHTML;
        node.notecard.thoughts = ui.notecardThoughts.innerHTML;
        
        // Also update standard details for backward compatibility/export
        node.details = `
            ${node.notecard.quote ? `<h4>Quote</h4><blockquote>${node.notecard.quote}</blockquote>` : ''}
            ${node.notecard.paraphrase ? `<h4>Paraphrase</h4><p>${node.notecard.paraphrase}</p>` : ''}
            ${node.notecard.thoughts ? `<h4>My Thoughts</h4><p>${node.notecard.thoughts}</p>` : ''}
        `;
    };

    ['input', 'blur', 'change'].forEach(evtType => {
        ui.notecardSourceSelect?.addEventListener(evtType, syncUIToNotecard);
        ui.notecardQuote?.addEventListener(evtType, syncUIToNotecard);
        ui.notecardParaphrase?.addEventListener(evtType, syncUIToNotecard);
        ui.notecardThoughts?.addEventListener(evtType, syncUIToNotecard);
    });

    ui.addNodeBtn?.addEventListener('click', () => { vibrate(); addNode('New Notecard'); });
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
        ui.selectModeBtn?.classList.toggle('active', isSelectModeActive);
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
    ui.aiPanelBtn.addEventListener('click', () => ui.aiPanel.classList.toggle('visible'));
    ui.aiPanelClose.addEventListener('click', () => ui.aiPanel.classList.remove('visible'));

    // Socratic Chip Interaction
    ui.aiChatHistory.addEventListener('click', (e) => {
        const chip = e.target.closest('.suggestion-chip');
        if (chip && chip.dataset.input) {
            sendChatMessage(chip.dataset.input, currentMapId);
            // Optional: disable or remove other chips in the same container after use
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

    ui.aiChatSendBtn.addEventListener('click', () => sendChatMessage(ui.aiChatInput.value, currentMapId));
    ui.aiChatInput?.addEventListener('keydown', e => e.key === 'Enter' && sendChatMessage(ui.aiChatInput?.value, currentMapId));
    
    // --- Hint Logic ---
    const hintBtn = document.getElementById('ai-hint-btn');
    if (hintBtn) {
        hintBtn.addEventListener('click', () => {
            sendChatMessage(`[SYSTEM: User requested a hint for their current project state.]`, currentMapId);
        });
    }

    ui.nodeDetailClose?.addEventListener('click', hideNodeDetailPanel);
    
    ui.generateDetailsBtn?.addEventListener('click', async () => {
        const selectedNode = getSelectedNodeForDetails();
        if (selectedNode) {
            setAILoading(true);
            const quote = ui.notecardQuote?.innerText;
            if (!quote) {
                toast("Please add a quote first!");
                setAILoading(false);
                return;
            }
            const prompt = `Help me paraphrase this quote for my research notecard: "${quote}"`;
            sendChatMessage(prompt, currentMapId);
            setAILoading(false);
        }
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.popup-menu, .node, .side-panel, .link-group, .sunburst-arc, .modal-overlay')) {
            hidePopups();
            if (!isSelectModeActive) clearSelection();
        }
    });
    ui.contextMenu?.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action && selectedNodeForContextMenu) {
            const d = selectedNodeForContextMenu;
            switch (action) {
                case 'details': showNodeDetailPanel(d); break;
                case 'expand':
                    const expandInstruction = prompt("How should I expand on this node?", "Generate 3-5 related ideas");
                    if (expandInstruction) { _internal_expandNodeWithAI(d, expandInstruction); }
                    break;
                case 'rephrase':
                    const rephraseInstruction = prompt("How to rephrase? (e.g., 'more concise')", "more concise");
                    if (rephraseInstruction) sendChatMessage(`Rephrase the label for node "${d.label}" (ID: ${d.id}) to be ${rephraseInstruction}.`, currentMapId);
                    break;
                case 'group': groupSelectedNodes(); break;
                case 'ungroup': if (confirm(`Ungroup "${d.label}"? This will delete the group node but keep its children.`)) { ungroupNode(d.id); } break;
                case 'settings': if (getGraphState().currentLayout !== 'sunburst') { showSettingsPalette(d); } else { toast("Appearance settings not available in Sunburst view."); } break;
                case 'copy-map': navigator.clipboard.writeText(JSON.stringify(mapsManager.getCurrentGraphData(), null, 2)).then(() => toast("Map JSON data copied to clipboard.")); break;
                case 'delete': if (confirm(`Delete "${d.label}" and all its children?`)) { deleteNodeById(d.id); } break;
            }
        }
        if (action !== 'settings') {
            hidePopups();
        } else {
            ui.contextMenu?.classList.add('hidden');
        }
    });
    ui.canvasContextMenu?.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (!action) return;
        switch (action) {
            case 'add-node':
                const coords = { x: parseFloat(ui.canvasContextMenu.dataset.x), y: parseFloat(ui.canvasContextMenu.dataset.y) };
                addNode('New Node', null, { coords });
                break;
            case 'paste': pasteSelection(); break;
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
    ui.linkContextMenu?.addEventListener('click', e => {
        const action = e.target.dataset.action;
        const d = selectedLinkForContextMenu;
        if (!action || !d) return;
        switch (action) {
            case 'edit-label':
                const newLabel = prompt("Enter link label:", d.label || "");
                if (newLabel !== null) { d.label = newLabel; updateGraph(true); }
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
    
    // Export event listeners
    ui.exportBtn?.addEventListener('click', () => ui.exportModal?.classList.remove('hidden'));
    ui.exportModal?.querySelector('.modal-close-btn')?.addEventListener('click', () => ui.exportModal?.classList.add('hidden'));
    ui.exportInteractiveBtn?.addEventListener('click', exportInteractiveViewer);
    ui.exportPrintableBtn?.addEventListener('click', exportPrintableDocument);
    ui.exportJsonBtn?.addEventListener('click', exportAsJSON);

    // Global keydown listener
    window.addEventListener('keydown', e => {
        if (ui.appContainer?.classList.contains('hidden')) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isCtrl = isMac ? e.metaKey : e.ctrlKey;
        if (isCtrl && e.key === 'c') { e.preventDefault(); copySelection(); }
        if (isCtrl && e.key === 'v') { e.preventDefault(); pasteSelection(); }
    });

    // Initial Page Load
    showLandingPage();

    // Global Haptic Feedback for Mobile
    document.addEventListener('click', (e) => {
        if (e.target.closest('.tool-button, .primary-button, .secondary-button, .context-menu-item, .map-list-item, .icon-button')) {
            vibrate(10);
        }
    }, { passive: true });
}

// Start the application
main();