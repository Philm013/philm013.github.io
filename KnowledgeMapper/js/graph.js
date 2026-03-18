/* global d3 */
import { ui, toast } from './ui.js';

// --- MODULE STATE ---
let nodes = [], links = [];
let nodeCounter = 0;
let selectedNodes = new Set();
let clipboard = null;
let currentLayout = 'sunburst';
let currentLinkStyle = 'straight';
let selectedNodeForDetails = null;

let simulation;

let g; // The main D3 group for graph elements
let zoom;
let lasso;

// Callbacks for interaction, to be set by main.js
let interactionCallbacks = {};

const layouts = {
    sunburst: { name: 'Sunburst', apply: () => {} },
    mindmap: { name: 'Mind Map', apply: () => { const laidOutNodes = layoutGeneratedMindMap([...nodes], [...links]); if (!laidOutNodes) return; laidOutNodes.forEach(layoutNode => { const originalNode = nodes.find(n => n.id === layoutNode.id); if (originalNode) { originalNode.fx = layoutNode.x; originalNode.fy = layoutNode.y; originalNode.x = layoutNode.x; originalNode.y = layoutNode.y; } }); simulation.force("charge", null).force("x", null).force("y", null).force("link").distance(150).strength(0.1); simulation.force("collision", d3.forceCollide().radius(d => Math.max(d.width, d.height) / 2 + 20).strength(1)); } },
    flowchart: { name: 'Flowchart', apply: () => { const laidOutNodes = layoutGeneratedFlowchart([...nodes], [...links]); if (!laidOutNodes) return; laidOutNodes.forEach(layoutNode => { const originalNode = nodes.find(n => n.id === layoutNode.id); if (originalNode) { originalNode.fx = layoutNode.x; originalNode.fy = layoutNode.y; originalNode.x = layoutNode.x; originalNode.y = layoutNode.y; } }); simulation.force("charge", null).force("x", null).force("y", null).force("link").distance(150).strength(0.1); simulation.force("collision", d3.forceCollide().radius(d => Math.max(d.width, d.height) / 2 + 20).strength(1)); } }
};

/**
 * Initializes the D3 simulation and sets up callbacks for user interactions like clicks, double-clicks, and context menu events on nodes and links.
 * @param {object} callbacks - An object containing callback functions for various graph interactions.
 */
export function initGraph(callbacks) {
    interactionCallbacks = callbacks;
    const svg = d3.select("#graph-canvas");
    const container = d3.select("#graph-container");
    g = svg.append("g");

    simulation = d3.forceSimulation().on("tick", ticked);

    zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", e => {
        if (currentLayout !== 'sunburst') {
            g.attr("transform", e.transform);
        }
    });

    lasso = d3.drag()
        .on('start', function(event) {
            if (!event.sourceEvent.shiftKey) return;
            lasso.started = true;
            const {x, y} = d3.pointer(event, g.node());
            g.append('rect').attr('class', 'lasso-box').attr('x', x).attr('y', y).attr('width', 0).attr('height', 0);
        })
        .on('drag', function(event) {
            if (!lasso.started) return;
            const lassoBox = g.select('.lasso-box');
            const [startX, startY] = [parseFloat(lassoBox.attr('x')), parseFloat(lassoBox.attr('y'))];
            const {x, y} = d3.pointer(event, g.node());
            lassoBox
                .attr('x', Math.min(startX, x))
                .attr('y', Math.min(startY, y))
                .attr('width', Math.abs(startX - x))
                .attr('height', Math.abs(startY - y));
        })
        .on('end', function(event) {
            if (!lasso.started) return;
            lasso.started = false;
            const lassoBox = g.select('.lasso-box');
            const [x, y, w, h] = [parseFloat(lassoBox.attr('x')), parseFloat(lassoBox.attr('y')), parseFloat(lassoBox.attr('width')), parseFloat(lassoBox.attr('height'))];
            
            if (!event.sourceEvent.ctrlKey && !event.sourceEvent.metaKey) {
                clearSelection();
            }

            nodes.forEach(node => {
                if (node.x >= x && node.x <= x + w && node.y >= y && node.y <= y + h) {
                    toggleNodeSelection(node.id, true); // force add
                }
            });
            lassoBox.remove();
        });

    svg.call(zoom).call(lasso);
    container.on('contextmenu', (e) => interactionCallbacks.onCanvasContextMenu(e));
}

/**
 * Returns the current state of the graph, including the nodes array, links array, and current layout settings.
 * @returns {object} The current graph state.
 */
export function getGraphState() {
    return {
        nodes,
        links,
        nodeCounter,
        selectedNodes,
        clipboard,
        currentLayout,
        currentLinkStyle
    };
}

/**
 * Gets the data object for the currently selected node for details view.
 * @returns {object|null}
 */
export function getSelectedNodeForDetails() {
    return selectedNodeForDetails;
}

/**
 * Sets the data object for the currently selected node for details view.
 * @param {object|null} node - The node data object.
 */
export function setSelectedNodeForDetails(node) {
    selectedNodeForDetails = node;
}

/**
 * Clears the current graph and loads a new set of nodes and links from a provided data object. Resets the view and simulation.
 * @param {object} graphData - The graph data to load.
 */
export function loadGraphData(graphData) {
    nodes = graphData.nodes.map(n => ({
        ...n, 
        shape: n.shape || 'rectangle', 
        color: n.color || 'var(--node-color)', 
        details: n.details || '',
        notecard: n.notecard || {}
    })) || [];
    links = (graphData.links || []).map(l => ({source: nodes.find(n => n.id === l.source), target: nodes.find(n => n.id === l.target), label: l.label || ''})).filter(l => l.source && l.target);
    nodeCounter = graphData.counter || 0;
    currentLayout = graphData.layout || 'sunburst';
    currentLinkStyle = graphData.linkStyle || 'straight';
    clearSelection();
}

/**
 * The main rendering function. It redraws all nodes and links based on the current data and applies the selected layout logic.
 * @param {boolean} [reapplyLayout=false] - Whether to force a recalculation of the layout.
 */
export function updateGraph(reapplyLayout = false) {
    g.selectAll("*").remove();
    const isForceGraph = currentLayout !== 'sunburst';
    ui.addNodeBtn.style.display = isForceGraph ? 'flex' : 'none';
    ui.linkStyleBtn.style.display = isForceGraph ? 'flex' : 'none';

    if (isForceGraph) {
        renderForceGraph(reapplyLayout);
    } else {
        simulation.stop();
        renderSunburst();
    }
}

/**
 * Adds a new node to the graph, optionally linking it to a parent. Returns the newly created node object.
 * @param {string} label - The text label for the new node.
 * @param {string|null} [parentId=null] - The ID of the parent node to connect to.
 * @param {object} [options={}] - Additional options like coordinates, shape, color, and details.
 * @returns {object} The newly created node object.
 */
export function addNode(label, parentId = null, options = {}) {
    const { coords, shape = 'rectangle', color = 'var(--node-color)', details = '', notecard = {} } = options;
    const transform = d3.zoomTransform(d3.select("#graph-canvas").node());
    const parentNode = nodes.find(n => n.id === parentId);
    let x, y;
    if (coords) {
        x = coords.x;
        y = coords.y;
    } else {
        const container = d3.select("#graph-container");
        const width = () => container.node().clientWidth;
        const height = () => container.node().clientHeight;
        x = parentNode ? parentNode.x + Math.random() * 80 - 40 : (width() / 2 - transform.x) / transform.k;
        y = parentNode ? parentNode.y + Math.random() * 80 - 40 : (height() / 2 - transform.y) / transform.k;
    }
    const newNode = { id: `node-${++nodeCounter}`, label, shape, color, x, y, fx: x, fy: y, details, notecard };
    nodes.push(newNode);
    if (parentId && parentNode) {
        links.push({ source: parentNode, target: newNode, label: '' });
    }
    updateGraph();
    return newNode;
}


/**
 * Deletes a specified node and all of its descendants from the graph.
 * @param {string} nodeId - The ID of the node to delete.
 */
export function deleteNodeById(nodeId) {
    if (selectedNodeForDetails && selectedNodeForDetails.id === nodeId) {
        interactionCallbacks.onHideDetails();
    }
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;
    const childrenToDelete = new Set();
    const queue = [nodeId];
    while (queue.length > 0) {
        const currentId = queue.shift();
        childrenToDelete.add(currentId);
        const childLinks = links.filter(l => l.source.id === currentId);
        for (const link of childLinks) {
            queue.push(link.target.id);
        }
    }
    nodes = nodes.filter(n => !childrenToDelete.has(n.id));
    links = links.filter(l => !childrenToDelete.has(l.source.id) && !childrenToDelete.has(l.target.id));
    selectedNodes.delete(nodeId);
    updateGraph(true);
}

/**
 * Updates the label of a specific node and re-renders the graph to reflect the change.
 * @param {string} nodeId - The ID of the node to edit.
 * @param {string} newLabel - The new label for the node.
 */
export function editNodeLabel(nodeId, newLabel) {
    const nodeToEdit = nodes.find(n => n.id === nodeId);
    if (nodeToEdit) {
        nodeToEdit.label = newLabel;
        if (selectedNodeForDetails && selectedNodeForDetails.id === nodeId) {
            ui.nodeDetailTitle.textContent = `Details for "${newLabel}"`;
        }
        updateGraph(true);
    }
}

/**
 * Creates a new link between two existing nodes.
 * @param {string} sourceId - The ID of the source node.
 * @param {string} targetId - The ID of the target node.
 */
export function connectNodesById(sourceId, targetId) {
    const source = nodes.find(n => n.id === sourceId);
    const target = nodes.find(n => n.id === targetId);
    if (source && target) {
        links.push({ source, target, label: '' });
        updateGraph(true);
    }
}

/**
 * Switches the active graph layout (e.g., 'mindmap', 'sunburst') and triggers a re-render.
 * @param {string} layoutName - The name of the layout to apply.
 * @param {boolean} [showToast=true] - Whether to show a notification toast.
 * @param {boolean} [force=false] - Whether to force the layout change even for non-tree graphs.
 */
export function changeLayout(layoutName, showToast = true, force = false) {
    if (layouts[layoutName]) {
        if (!force && (layoutName === 'mindmap' || layoutName === 'sunburst') && !isGraphTree(links)) {
            toast(`${layouts[layoutName].name} view not available for non-tree graphs. Right-click canvas to force.`);
            return;
        }
        currentLayout = layoutName;
        updateGraph(true);
        if (showToast) toast(`Layout changed to: ${layouts[layoutName].name}`);
    }
}

export function clearSelection() {
    selectedNodes.clear();
    if (g) {
        g.selectAll('.node.selected').classed('selected', false);
    }
}

export function toggleNodeSelection(nodeId, forceAdd = false) {
    const nodeEl = g.selectAll('.node').filter(d => d.id === nodeId);
    if (!nodeEl.empty()) {
        if (forceAdd || !selectedNodes.has(nodeId)) {
            selectedNodes.add(nodeId);
            nodeEl.classed('selected', true);
        } else {
            selectedNodes.delete(nodeId);
            nodeEl.classed('selected', false);
        }
    }
}

export function copySelection() {
    if (selectedNodes.size === 0) return;
    const nodesToCopy = nodes.filter(n => selectedNodes.has(n.id));
    const internalLinks = links.filter(l => selectedNodes.has(l.source.id) && selectedNodes.has(l.target.id));
    const clipboardData = {
        nodes: JSON.parse(JSON.stringify(nodesToCopy)),
        links: JSON.parse(JSON.stringify(internalLinks.map(l => ({ source: l.source.id, target: l.target.id, label: l.label }))))
    };
    clipboard = JSON.stringify(clipboardData);
    toast(`${selectedNodes.size} node(s) copied.`);
}

export function pasteSelection() {
    if (!clipboard) return;
    const data = JSON.parse(clipboard);
    const idMap = new Map();
    const transform = d3.zoomTransform(d3.select("#graph-canvas").node());
    const container = d3.select("#graph-container");
    const width = () => container.node().clientWidth;
    const height = () => container.node().clientHeight;
    const pasteX = (Math.random() * 200 - 100 + width() / 2 - transform.x) / transform.k;
    const pasteY = (Math.random() * 100 - 50 + height() / 2 - transform.y) / transform.k;
    let avgX = 0, avgY = 0;
    if (data.nodes.length > 0) {
        data.nodes.forEach(n => { avgX += n.x; avgY += n.y });
        avgX /= data.nodes.length;
        avgY /= data.nodes.length;
    }
    data.nodes.forEach(n => {
        const oldId = n.id;
        const newId = `node-${++nodeCounter}`;
        idMap.set(oldId, newId);
        const newNode = { ...n, id: newId, x: (n.x - avgX) + pasteX, y: (n.y - avgY) + pasteY };
        nodes.push(newNode);
    });
    data.links.forEach(l => {
        const newSourceId = idMap.get(l.source);
        const newTargetId = idMap.get(l.target);
        if (newSourceId && newTargetId) {
            links.push({ source: nodes.find(n => n.id === newSourceId), target: nodes.find(n => n.id === newTargetId), label: l.label });
        }
    });
    clearSelection();
    data.nodes.forEach(n => selectedNodes.add(idMap.get(n.id)));
    updateGraph(true);
    toast(`${data.nodes.length} node(s) pasted.`);
}

export function groupSelectedNodes() {
    if (selectedNodes.size < 2) return;
    const groupName = prompt("Enter a name for the new group:", "New Group");
    if (!groupName) return;
    const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
    const avgPos = selectedNodeObjects.reduce((acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y }), { x: 0, y: 0 });
    avgPos.x /= selectedNodeObjects.length;
    avgPos.y /= selectedNodeObjects.length;
    const groupNode = addNode(groupName, null, { coords: avgPos });
    selectedNodeObjects.forEach(n => connectNodesById(groupNode.id, n.id));
    clearSelection();
}

export function ungroupNode(nodeId) {
    links = links.filter(l => l.source.id !== nodeId);
    nodes = nodes.filter(n => n.id !== nodeId);
    updateGraph(true);
}


// --- INTERNAL HELPER FUNCTIONS ---

function calculateNodeDimensions() {
    nodes.forEach(d => {
        ui.textMeasurer.style.width = d.label.length > 30 ? '180px' : 'auto';
        ui.textMeasurer.textContent = d.label;
        const rect = ui.textMeasurer.getBoundingClientRect();
        d.width = Math.max(60, rect.width + 16);
        d.height = Math.max(40, rect.height + 16);
    });
}

function renderForceGraph(reapplyLayout = false) {
    calculateNodeDimensions();
    let link = g.append("g").attr("class", "links").selectAll(".link-group").data(links, d => `${d.source.id}-${d.target.id}`);
    link.exit().remove();
    const linkEnter = link.enter().append("g").attr("class", "link-group").on('contextmenu', (e, d) => interactionCallbacks.onLinkContextMenu(e, d));
    linkEnter.append("path").attr("class", "link-interaction-area");
    linkEnter.append("path").attr("class", "link");
    linkEnter.append("text").attr("class", "link-label").text(d => d.label || '');
    link = linkEnter.merge(link);
    link.select('.link-label').text(d => d.label || '');

    let node = g.append("g").attr("class", "nodes").selectAll("g").data(nodes, d => d.id);
    node.exit().remove();
    const nodeEnter = node.enter().append("g").attr("class", "node")
        .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended))
        .on('click', (e, d) => interactionCallbacks.onNodeClick(e, d))
        .on('dblclick', (e, d) => editText(d, d3.select(e.currentTarget)))
        .on('contextmenu', (e, d) => interactionCallbacks.onNodeContextMenu(e, d));
    
    nodeEnter.append('path').attr('class', 'node-shape');
    nodeEnter.append('foreignObject').attr('class', 'node-foreign-object').attr('pointer-events', 'none').append('xhtml:div').html(d => d.label);
    node = nodeEnter.merge(node);
    node.classed('selected', d => selectedNodes.has(d.id));
    node.select('.node-shape').attr('fill', d => d.color || 'var(--node-color)').attr('d', d => { const w = d.width; const h = d.height; const r = 8; switch(d.shape) { case 'ellipse': return `M ${-w/2},0 a ${w/2},${h/2} 0 1,0 ${w},0 a ${w/2},${h/2} 0 1,0 ${-w},0 Z`; case 'diamond': return `M 0,${-h/2} L ${w/2},0 L 0,${h/2} L ${-w/2},0 Z`; case 'hexagon': return `M ${-w/2+4},${-h/2} L ${w/2-4},${-h/2} L ${w/2},0 L ${w/2-4},${h/2} L ${-w/2+4},${h/2} L ${-w/2},0 Z`; default: return `M ${-w/2+r},${-h/2} h ${w-2*r} a ${r},${r} 0 0 1 ${r},${r} v ${h-2*r} a ${r},${r} 0 0 1 ${-r},${r} h ${-(w-2*r)} a ${r},${r} 0 0 1 ${-r},${-r} v ${-(h-2*r)} a ${r},${r} 0 0 1 ${r},${-r} z`; } });
    node.select('.node-foreign-object').attr('x', d => -d.width / 2).attr('y', d => -d.height / 2).attr('width', d => d.width).attr('height', d => d.height).select('div').html(d => d.label);
    
    node.selectAll('.add-handle').remove();
    const addHandle = node.append('g').attr('class', 'add-handle').attr('transform', d => `translate(${d.width / 2 + 15}, 0)`).call(addHandleDrag);
    addHandle.append('circle').attr('r', 10).attr('fill', 'var(--accent-primary)');
    addHandle.append('text').text('+').attr('fill', '#fff').attr('text-anchor', 'middle').attr('dy', '.35em').attr('font-size', '14px').attr('font-weight', 'bold').attr('pointer-events', 'none');
    
    simulation.nodes(nodes).force("link", d3.forceLink(links).id(d => d.id));
    if (reapplyLayout) { layouts[currentLayout].apply(); }
    simulation.alpha(1).restart();
}

function renderSunburst() {
    const container = d3.select("#graph-container");
    const width = () => container.node().clientWidth;
    const height = () => container.node().clientHeight;
    g.attr("transform", `translate(${width() / 2}, ${height() / 2})`);
    
    if (!isGraphTree(links)) {
        g.append("text")
         .attr("text-anchor", "middle")
         .attr("fill", "var(--text-secondary)")
         .text("Sunburst view is not available for non-tree graphs.");
        return;
    }

    const rootHierarchy = buildSunburstHierarchy(nodes, links);
    if (!rootHierarchy || !rootHierarchy.children || rootHierarchy.children.length === 0) {
        g.append("text")
         .attr("text-anchor", "middle")
         .attr("fill", "var(--text-secondary)")
         .text("No hierarchical data to display. Add child nodes to see the sunburst.");
        return;
    }

    const radius = Math.min(width(), height()) / 6;
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, rootHierarchy.children.length + 1));

    const partition = d3.partition().size([2 * Math.PI, rootHierarchy.height + 1]);
    const root = partition(rootHierarchy);
    root.each(d => d.current = d);

    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius * 1.5)
        .innerRadius(d => d.y0 * radius)
        .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));
    
    const path = g.append("g")
      .selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
        .attr("class", "sunburst-arc")
        .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.id); })
        .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.8 : 0.6) : 0)
        .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
        .attr("d", d => arc(d.current));
    
    path.on("click", clicked);
    path.on("contextmenu", (e, d) => interactionCallbacks.onNodeContextMenu(e, d.data));
    path.append("title").text(d => `${d.ancestors().map(d => d.data.label).reverse().join("/")}`);

    const label = g.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().slice(1))
      .join("text")
        .attr("class", "sunburst-text")
        .attr("dy", "0.35em")
        .attr("fill-opacity", d => +labelVisible(d.current))
        .attr("transform", d => labelTransform(d.current))
        .text(d => d.data.label);

    const parent = g.append("circle")
        .datum(root)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("click", clicked);

    const centerLabel = g.append("text")
        .attr("text-anchor", "middle")
        .attr("fill", "var(--text-primary)")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .attr("pointer-events", "none");

    centerLabel.text(root.data.label).call(wordWrap, radius * 1.8);

    function clicked(event, p) {
        if (!p.children && p.depth > 0) {
            interactionCallbacks.onNodeClick(event, p.data);
            return;
        }
        parent.datum(p.parent || root);
        centerLabel.selectAll("tspan").remove();
        centerLabel.text(p.data.label).call(wordWrap, radius * 1.8);
        root.each(d => d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth)
        });
        const t = g.transition().duration(750);
        path.transition(t)
            .tween("data", d => { const i = d3.interpolate(d.current, d.target); return t => d.current = i(t); })
            .filter(function(d) { return +this.getAttribute("fill-opacity") || arcVisible(d.target); })
            .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.8 : 0.6) : 0)
            .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none") 
            .attrTween("d", d => () => arc(d.current));
        label.filter(function(d) { return +this.getAttribute("fill-opacity") || labelVisible(d.target); }).transition(t)
            .attr("fill-opacity", d => +labelVisible(d.target))
            .attrTween("transform", d => () => labelTransform(d.current));
    }
    
    function arcVisible(d) { return d.y1 <= rootHierarchy.height + 2 && d.y0 >= 1 && d.x1 > d.x0; }
    function labelVisible(d) { return d.y1 <= rootHierarchy.height + 2 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03; }
    function labelTransform(d) { const x = (d.x0 + d.x1) / 2 * 180 / Math.PI; const y = (d.y0 + d.y1) / 2 * radius; return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`; }
}

function ticked() {
    g.selectAll(".link").attr("d", getLinkPath);
    g.selectAll(".link-interaction-area").attr("d", getLinkPath);
    g.selectAll(".link-label")
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);
    g.selectAll(".node")
        .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
}

const dragstarted = (e, d) => { if (!e.active) simulation.alphaTarget(0.1).restart(); interactionCallbacks.onHidePopups?.(); d.fx = d.x; d.fy = d.y; if (selectedNodes.has(d.id)) { selectedNodes.forEach(id => { const n = nodes.find(node => node.id === id); if(n) { n.startX = n.x; n.startY = n.y; } }); } };
const dragged = (e, d) => { if (selectedNodes.size > 1 && selectedNodes.has(d.id)) { const dx = e.x - d.startX; const dy = e.y - d.startY; selectedNodes.forEach(id => { const n = nodes.find(node => node.id === id); if(n) { n.fx = n.startX + dx; n.fy = n.startY + dy; } }); } else { d.fx = e.x; d.fy = e.y; } };
const dragended = (e, d) => { if (!e.active) simulation.alphaTarget(0); if(currentLayout === 'mindmap' || currentLayout === 'flowchart') { /* Keep fx/fy */ } else { if (selectedNodes.has(d.id)) { selectedNodes.forEach(id => { const n = nodes.find(node => node.id === id); if(n) { delete n.fx; delete n.fy; delete n.startX; delete n.startY;} }); } else { delete d.fx; delete d.fy; } }};
const editText = (d, el) => { interactionCallbacks.onHideDetails?.(); clearSelection(); el.select('.node-foreign-object').style('display', 'none'); const fo = el.append('foreignObject').attr('x', -d.width/2).attr('y', -d.height/2).attr('width', d.width).attr('height', d.height); const inp = fo.append('xhtml:textarea').attr('class','node-input').text(d.label).on('blur', function() { editNodeLabel(d.id, this.value); el.select('.node-foreign-object').style('display','block'); fo.remove(); }).on('keydown', function(e){ if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); this.blur(); }}); inp.node().focus(); inp.node().select(); };
const addHandleDrag = d3.drag()
    .on('start', function(e, d) { e.sourceEvent.stopPropagation(); interactionCallbacks.onHideDetails?.(); clearSelection(); g.selectAll('.link-interaction-area').style('pointer-events', 'none'); })
    .on('end', function(e, d) {
        g.selectAll('.link-interaction-area').style('pointer-events', 'auto');
        const dropTargetEl = e.sourceEvent.target.closest('.node');
        const dropTargetData = dropTargetEl ? d3.select(dropTargetEl).datum() : null;
        if (dropTargetData && dropTargetData.id !== d.id) { connectNodesById(d.id, dropTargetData.id); } 
        else { const [gx, gy] = d3.pointer(e.sourceEvent, g.node()); const coords = { x: gx, y: gy }; addNode('New Node', d.id, { coords }); }
    });

function getLinkPath(d) {
    switch (currentLinkStyle) {
        case 'curved': {
            const sourcePoint = getIntersectionPoint(d.target, d.source);
            const targetPoint = getIntersectionPoint(d.source, d.target);
            const dx = targetPoint.x - sourcePoint.x;
            const dy = targetPoint.y - sourcePoint.y;
            const dr = Math.sqrt(dx * dx + dy * dy);
            const sweepFlag = d.source.id > d.target.id ? 1 : 0;
            return `M${sourcePoint.x},${sourcePoint.y}A${dr},${dr} 0 0,${sweepFlag} ${targetPoint.x},${targetPoint.y}`;
        }
        case 'orthogonal': {
            const sx = d.source.x, sy = d.source.y;
            const tx = d.target.x, ty = d.target.y;
            const midX = (sx + tx) / 2;
            const midY = (sy + ty) / 2;
            const p_hv_1 = { x: midX, y: sy };
            const p_hv_2 = { x: midX, y: ty };
            const p_vh_1 = { x: sx, y: midY };
            const p_vh_2 = { x: tx, y: midY };

            let sourceIntersection, targetIntersection, path;
            if (Math.abs(tx - sx) > Math.abs(ty - sy)) {
                sourceIntersection = getIntersectionPoint(p_hv_1, d.source);
                targetIntersection = getIntersectionPoint(p_hv_2, d.target);
                path = `M${sourceIntersection.x},${sourceIntersection.y} L${p_hv_1.x},${sourceIntersection.y} L${p_hv_2.x},${targetIntersection.y} L${targetIntersection.x},${targetIntersection.y}`;
            } else {
                sourceIntersection = getIntersectionPoint(p_vh_1, d.source);
                targetIntersection = getIntersectionPoint(p_vh_2, d.target);
                path = `M${sourceIntersection.x},${sourceIntersection.y} L${sourceIntersection.x},${p_vh_1.y} L${targetIntersection.x},${p_vh_2.y} L${targetIntersection.x},${targetIntersection.y}`;
            }
            return path;
        }
        case 'straight':
        default: {
            const sourcePoint = getIntersectionPoint(d.target, d.source);
            const targetPoint = getIntersectionPoint(d.source, d.target);
            return `M${sourcePoint.x},${sourcePoint.y}L${targetPoint.x},${targetPoint.y}`;
        }
    }
}

function getIntersectionPoint(approachPoint, targetNode) {
    const w = targetNode.width / 2;
    const h = targetNode.height / 2;
    
    const dx = approachPoint.x - targetNode.x;
    const dy = approachPoint.y - targetNode.y;

    if (dx === 0 && dy === 0) return { x: targetNode.x, y: targetNode.y };

    let x, y;

    switch (targetNode.shape) {
        case 'ellipse': {
            const m = dy / dx;
            const m2 = m * m;
            const w2 = w * w;
            const h2 = h * h;
            if (Math.abs(dx) > 0.001) {
                x = Math.sqrt(w2 * h2 / (h2 + w2 * m2)) * (dx > 0 ? 1 : -1);
                y = m * x;
            } else { // Vertical line
                x = 0;
                y = h * (dy > 0 ? 1 : -1);
            }
            break;
        }
        case 'diamond': {
            const m = dy / dx;
            if (Math.abs(dx) > 0.001) {
                const abs_m = Math.abs(m);
                x = (w * h / (h + w * abs_m)) * (dx > 0 ? 1 : -1);
                y = m * x;
            } else { // Vertical line
                x = 0;
                y = h * (dy > 0 ? 1 : -1);
            }
            break;
        }
        case 'hexagon': // Approximating hexagon with a bounding box for simplicity
        case 'rectangle':
        default: {
            const angle = Math.atan2(dy, dx);
            const tan = Math.tan(angle);
            
            if (Math.abs(dy) * w > Math.abs(dx) * h) {
                y = h * Math.sign(dy);
                x = y / tan;
            } else {
                x = w * Math.sign(dx);
                y = x * tan;
            }
            break;
        }
    }
    
    return { x: targetNode.x + x, y: targetNode.y + y };
}

function buildHierarchy(nodes, links) {
    if (!links || !Array.isArray(links) || !nodes || !Array.isArray(nodes)) return null;
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
        if (!hasParent.has(node.id)) {
            roots.push(node);
        }
    });
    return roots.length > 0 ? roots[0] : (nodes.length > 0 ? nodeMap.get(nodes[0].id) : null);
}

function buildSunburstHierarchy(nodes, links) {
    const data = buildHierarchy(nodes, links);
    if (!data) return null;
    return d3.hierarchy(data).sum(d => d.value || 1);
}

function layoutGeneratedMindMap(nodesToLayout, linksToLayout) {
    if (!nodesToLayout || nodesToLayout.length === 0) return [];
    const hierarchicalData = buildHierarchy(nodesToLayout, linksToLayout);
    if (!hierarchicalData) return nodesToLayout; // Guard against malformed hierarchy
    const container = d3.select("#graph-container");
    const w = () => container.node().clientWidth;
    const h = () => container.node().clientHeight;
    const root = d3.hierarchy(hierarchicalData);
    const radius = Math.min(w(), h());
    const treeLayout = d3.tree().size([2 * Math.PI, radius]).separation((a, b) => (a.parent == b.parent ? 4 : 3) / a.depth);
    const treeRoot = treeLayout(root);
    const nodeMap = new Map(nodesToLayout.map(n => [n.id, n]));
    treeRoot.each(d => {
        const { x: angle, y: r } = d;
        const cartesianX = r * Math.cos(angle - Math.PI / 2) + w() / 2;
        const cartesianY = r * Math.sin(angle - Math.PI / 2) + h() / 2;
        const originalNode = nodeMap.get(d.data.id);
        if (originalNode) {
            originalNode.x = originalNode.fx = cartesianX;
            originalNode.y = originalNode.fy = cartesianY;
        }
    });
    return nodesToLayout;
}

function layoutGeneratedFlowchart(newNodes, newLinks) {
    if (!newNodes || newNodes.length === 0) return [];
    const container = d3.select("#graph-container");
    const w = () => container.node().clientWidth;
    const verticalSpacing = 180; const horizontalSpacing = 220;
    const adj = new Map(newNodes.map(n => [n.id, []]));
    const inDegree = new Map(newNodes.map(n => [n.id, 0]));
    (newLinks || []).forEach(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        if (adj.has(sourceId) && inDegree.has(targetId)) {
            adj.get(sourceId).push(targetId);
            inDegree.set(targetId, inDegree.get(targetId) + 1);
        }
    });
    const levels = [];
    let queue = newNodes.filter(n => inDegree.get(n.id) === 0);
    const visited = new Set(queue.map(n => n.id));
    while (queue.length > 0) {
        levels.push(queue);
        const nextQueue = [];
        for (const node of queue) {
            for (const neighborId of (adj.get(node.id) || [])) {
                const neighborNode = newNodes.find(n => n.id === neighborId);
                if (neighborNode && inDegree.has(neighborId)) {
                    inDegree.set(neighborId, inDegree.get(neighborId) - 1);
                    if (inDegree.get(neighborId) === 0 && !visited.has(neighborId)) {
                        nextQueue.push(neighborNode);
                        visited.add(neighborId);
                    }
                }
            }
        }
        queue = nextQueue;
    }
    let unvisitedNodes = newNodes.filter(n => !visited.has(n.id));
    if (unvisitedNodes.length > 0) levels.push(unvisitedNodes);
    levels.forEach((levelNodes, levelIndex) => {
        const levelWidth = levelNodes.length * horizontalSpacing;
        const startX = (w() / 2) - (levelWidth / 2) + (horizontalSpacing / 2);
        const y = levelIndex * verticalSpacing + 100;
        levelNodes.forEach((node, nodeIndex) => {
            const x = startX + nodeIndex * horizontalSpacing;
            node.x = node.fx = x;
            node.y = node.fy = y;
            node.level = levelIndex;
        });
    });
    return newNodes;
}

function isGraphTree(links) {
    const hasParent = new Set();
    for (const link of links) {
        if (!link || !link.target) continue;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (hasParent.has(targetId)) {
            return false; // Node has more than one parent, not a tree.
        }
        hasParent.add(targetId);
    }
    return true;
}

function wordWrap(textSelection, width) {
    textSelection.each(function() {
        let text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y") || 0,
            dy = parseFloat(text.attr("dy") || 0),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}