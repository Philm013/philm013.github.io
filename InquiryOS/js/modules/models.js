/**
 * @file models.js
 * @description Logic for the SEP2 module: Developing and Using Models. 
 * Implements a complex interactive node-based canvas with SVG path drawing, 
 * shape manipulation, and teacher feedback integration.
 */

import { App } from '../core/state.js';
import { saveAndBroadcast, saveToStorage } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';
import { toast } from '../ui/utils.js';

/**
 * Renders the Models Practice module.
 */
export function renderModelsModule() {
    const availableIcons = App.teacherSettings.lessonIcons?.length > 0 
        ? App.teacherSettings.lessonIcons 
        : ['mdi:atom', 'mdi:leaf', 'mdi:water', 'mdi:fire', 'mdi:weather-sunny', 'mdi:flower', 'mdi:bacteria', 'mdi:flask-outline', 'mdi:microscope', 'mdi:dna', 'mdi:earth', 'mdi:mountain', 'mdi:magnet', 'mdi:battery-high', 'mdi:cog', 'mdi:human', 'mdi:heart', 'mdi:brain', 'mdi:lungs', 'mdi:skeleton', 'mdi:home', 'mdi:factory', 'mdi:car', 'mdi:bicycle', 'mdi:bus', 'mdi:train', 'mdi:airplane'];
    
    const emojis = ['🌡️', '💧', '☀️', '🌱', '🦠', '🧪', '💨', '⚡', '🔋', '🧱', '🌲', '🌻', '🐟', '🐦', '🦋', '🐝', '☁️', '⛈️', '🔥', '🌍', '🌋', '🍎', '🥩', '🍖', '⚙️', '⚖️', '💀', '👽', '👻', '💩', '🤡', '👹', '👺', '👾', '🤖'];

    const isFullscreen = App.modelState.isFullscreen;

    const customButtons = `
        <button onclick="window.clearAllModelElements()" class="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm" title="Clear Canvas">
            <span class="iconify" data-icon="mdi:delete"></span>
        </button>
        <button onclick="window.saveModelAsEvidence()" class="p-2 md:px-4 md:py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 text-sm">
            <span class="iconify" data-icon="mdi:bookmark"></span>
            <span class="hidden md:inline">Save</span>
        </button>
    `;

    return `
        <div class="h-full flex flex-col ${isFullscreen ? 'modeler-fullscreen' : ''}">
            ${renderModuleHeader(isFullscreen ? 'Models' : 'Developing Models', 'mdi:cube-outline', 'SEP2', customButtons)}
            
            <div class="flex flex-1 gap-2 md:gap-4 overflow-hidden relative ${isFullscreen ? 'p-2 md:p-4 bg-gray-50' : ''} ${App.modelState.isToolbarPinned ? 'flex-col md:flex-row' : ''}">
                <!-- Mobile Floating Tool Palette -->
                <div class="floating-tool-palette md:hidden ${App.modelState.isToolbarPinned ? 'toolbar-pinned' : ''}">
                    <div id="toolDrawer" class="tool-drawer ${App.modelState.drawerOpen ? 'open' : ''}">
                        ${['select', 'node', 'pen', 'shape', 'note', 'stamp', 'explain'].map(t => {
                            const icons = { select: 'mdi:cursor-default', node: 'mdi:plus-circle', pen: 'mdi:pencil', shape: 'mdi:shape', note: 'mdi:note-text', stamp: 'mdi:sticker-emoji', explain: 'mdi:comment-quote' };
                            const isActive = App.modelState.currentTool === t;
                            const isSticky = isActive && App.modelState.toolSticky;
                            return `
                                <button onclick="window.setModelTool('${t}'); if(!App.modelState.isToolbarPinned) window.toggleToolDrawer()" 
                                    class="p-3 rounded-xl hover:bg-gray-100 relative ${isActive ? 'text-primary bg-blue-50' : 'text-gray-600'}">
                                    <span class="iconify text-xl" data-icon="${icons[t]}"></span>
                                    ${isSticky ? '<span class="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full ring-1 ring-white"></span>' : ''}
                                </button>
                            `;
                        }).join('')}
                        <button onclick="window.toggleMultiSelect()" class="p-3 rounded-xl hover:bg-gray-100 ${App.modelState.isMultiSelectMode ? 'text-purple-600 bg-purple-50' : 'text-gray-600'}" title="Multi-select Mode">
                            <span class="iconify text-xl" data-icon="mdi:select-multiple"></span>
                        </button>
                        ${App.modelState.selectedItems.length > 0 ? `
                    <button onclick="window.deleteSelectedItems()" class="tool-btn p-3 rounded-xl hover:bg-red-100 text-red-600" title="Delete Selected">
                        <span class="iconify text-xl" data-icon="mdi:trash-can-outline"></span>
                    </button>
                    ` : ''}
                    <button onclick="window.toggleToolbarPin()" class="p-3 rounded-xl hover:bg-gray-100 ${App.modelState.isToolbarPinned ? 'text-primary' : 'text-gray-400'}">
                            <span class="iconify text-xl" data-icon="${App.modelState.isToolbarPinned ? 'mdi:pin' : 'mdi:pin-outline'}"></span>
                        </button>
                    </div>
                    <button onclick="window.toggleToolDrawer()" class="fab-toggle">
                        <span class="iconify text-2xl" data-icon="${App.modelState.drawerOpen ? 'mdi:close' : (
                            App.modelState.currentTool === 'select' ? 'mdi:cursor-default' :
                            App.modelState.currentTool === 'node' ? 'mdi:plus-circle' :
                            App.modelState.currentTool === 'pen' ? 'mdi:pencil' :
                            App.modelState.currentTool === 'shape' ? 'mdi:shape' :
                            App.modelState.currentTool === 'note' ? 'mdi:note-text' :
                            App.modelState.currentTool === 'explain' ? 'mdi:comment-quote' : 'mdi:sticker-emoji'
                        )}"></span>
                    </button>
                </div>

                <!-- Desktop Toolbar -->
                <div class="hidden md:flex w-16 bg-white border rounded-xl shadow-sm p-2 flex-col gap-2 overflow-y-auto scrollbar-hide">
                    ${['select', 'node', 'pen', 'shape', 'note', 'stamp', 'explain'].map(t => {
                        const icons = { select: 'mdi:cursor-default', node: 'mdi:plus-circle', pen: 'mdi:pencil', shape: 'mdi:shape', note: 'mdi:note-text', stamp: 'mdi:sticker-emoji', explain: 'mdi:comment-quote' };
                        const isActive = App.modelState.currentTool === t;
                        const isSticky = isActive && App.modelState.toolSticky;
                        return `
                            <button onclick="window.setModelTool('${t}')" 
                                class="tool-btn p-3 rounded-lg hover:bg-gray-100 relative ${isActive ? 'active' : ''}" title="${t.charAt(0).toUpperCase() + t.slice(1)}">
                                <span class="iconify text-xl" data-icon="${icons[t]}"></span>
                                ${isSticky ? '<span class="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full ring-1 ring-white"></span>' : ''}
                            </button>
                        `;
                    }).join('')}
                    <button onclick="window.toggleMultiSelect()" class="tool-btn p-3 rounded-lg hover:bg-gray-100 ${App.modelState.isMultiSelectMode ? 'active bg-purple-600' : ''}" title="Multi-select Mode">
                        <span class="iconify text-xl" data-icon="mdi:select-multiple"></span>
                    </button>
                    <hr class="my-0.5">
                    ${App.modelState.selectedItems.length > 1 ? `
                    <button onclick="window.groupSelectedItems()" class="tool-btn p-3 rounded-lg hover:bg-gray-100 text-purple-600" title="Group Selection">
                        <span class="iconify text-xl" data-icon="mdi:group"></span>
                    </button>
                    ` : ''}
                    ${App.modelState.selectedItems.length === 1 && App.modelState.selectedItems[0].type === 'group' ? `
                    <button onclick="window.ungroupSelectedItems()" class="tool-btn p-3 rounded-lg hover:bg-gray-100 text-purple-600" title="Ungroup">
                        <span class="iconify text-xl" data-icon="mdi:ungroup"></span>
                    </button>
                    ` : ''}
                    ${App.modelState.selectedItems.length > 0 ? `
                    <button onclick="window.deleteSelectedItems()" class="tool-btn p-3 rounded-lg hover:bg-red-100 text-red-600" title="Delete Selected">
                        <span class="iconify text-xl" data-icon="mdi:trash-can-outline"></span>
                    </button>
                    ` : ''}
                    <hr class="my-0.5">
                    <input type="color" id="modelColorPicker" value="${App.modelState.penColor || '#3b82f6'}" 
                        onchange="App.modelState.penColor = this.value"
                        class="w-full h-10 rounded cursor-pointer border-none p-0">
                </div>

                <div class="flex-1 flex flex-col gap-2 md:gap-4 overflow-hidden">
                    <!-- Contextual Options -->
                    <div id="modelContextBar" class="bg-white border rounded-xl shadow-sm p-1.5 md:p-2 flex items-center gap-3 md:gap-4 overflow-x-auto min-h-[48px] md:min-h-[56px] flex-nowrap scrollbar-hide touch-pan-x">
                        ${renderModelContextBar(availableIcons, emojis)}
                    </div>

                    <div class="flex-1 flex gap-4 overflow-hidden">
                        <!-- Canvas Area -->
                        <div class="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden relative">
                            <div id="modelCanvas" class="model-canvas w-full h-full ${App.modelState.currentTool === 'pen' ? 'pen-mode' : ''}" 
                                onpointerdown="window.modelCanvasMouseDown(event)"
                                onpointermove="window.modelCanvasMouseMove(event)"
                                onpointerup="window.modelCanvasMouseUp(event)"
                                onwheel="window.handleCanvasWheel(event)"
                                ondblclick="window.canvasDblClick(event)">
                                
                                <div id="modelCanvasContent" class="absolute inset-0 origin-top-left pointer-events-none">
                                    <svg id="drawingSvg" class="absolute inset-0 w-full h-full" style="z-index: 6; pointer-events: none;"></svg>
                                    <svg id="connectionsSvg" class="connection-line">
                                        <defs>
                                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/>
                                            </marker>
                                        </defs>
                                    </svg>
                                    
                                    <!-- Drawing Layers -->
                                    <div id="shapesLayer" class="absolute inset-0 pointer-events-none" style="z-index: 5;"></div>
                                    <div id="notesLayer" class="absolute inset-0 pointer-events-none" style="z-index: 10;"></div>
                                    <div id="explainLayer" class="absolute inset-0 pointer-events-none" style="z-index: 12;"></div>
                                    <div id="stampsLayer" class="absolute inset-0 pointer-events-none stamps-layer" style="z-index: 15;"></div>
                                    <div id="transformLayer" class="absolute inset-0 pointer-events-none" style="z-index: 100;"></div>
                                    <svg id="tempConnectionSvg" class="connection-line pointer-events-none" style="z-index:100;"></svg>
                                </div>
                            </div>
                        </div>

                        <!-- Explanation Panel -->
                        <div class="w-80 bg-white border rounded-xl shadow-sm flex flex-col hidden md:flex">
                            <div class="p-4 border-b bg-gray-50 rounded-t-xl flex items-center justify-between">
                                <h3 class="font-bold text-gray-900 flex items-center gap-2">
                                    <span class="iconify text-primary" data-icon="mdi:comment-quote"></span>
                                    Model Explanations
                                </h3>
                            </div>
                            <div class="flex-1 overflow-y-auto p-4 space-y-6">
                                <div>
                                    <label class="text-xs font-bold text-gray-400 uppercase block mb-2">General Model Explanation</label>
                                    <textarea onchange="window.saveGeneralExplanation(this.value)" 
                                        class="w-full p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" 
                                        rows="4" placeholder="How does this model explain the phenomenon overall?">${App.work.modelGeneralExplanation || ''}</textarea>
                                </div>
                                <div class="space-y-4">
                                    <label class="text-xs font-bold text-gray-400 uppercase block">Explanation Points</label>
                                    <div id="explanationPointsList" class="space-y-3">
                                        ${renderExplanationPointsList()}
                                    </div>
                                    ${App.work.modelExplanations?.length === 0 ? `
                                        <p class="text-xs text-gray-400 italic text-center py-4">Use the <span class="iconify inline" data-icon="mdi:comment-quote"></span> tool to add points to your model</p>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Mobile Explanation Drawer (Toggleable) -->
            <div id="mobileExplanationPanel" class="fixed inset-x-0 bottom-0 bg-white border-t rounded-t-2xl shadow-2xl z-[200] transform translate-y-full transition-transform duration-300 md:hidden max-h-[70vh] flex flex-col">
                <div class="p-4 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                    <h3 class="font-bold">Model Explanations</h3>
                    <button onclick="window.toggleMobileExplanations()" class="p-2"><span class="iconify" data-icon="mdi:chevron-down"></span></button>
                </div>
                <div class="flex-1 overflow-y-auto p-4 space-y-6">
                    <div>
                        <label class="text-xs font-bold text-gray-400 uppercase block mb-2">General Model Explanation</label>
                        <textarea onchange="window.saveGeneralExplanation(this.value)" 
                            class="w-full p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm" 
                            rows="3" placeholder="Overall explanation...">${App.work.modelGeneralExplanation || ''}</textarea>
                    </div>
                    <div id="mobileExplanationPointsList" class="space-y-3 pb-8">
                        ${renderExplanationPointsList()}
                    </div>
                </div>
            </div>
            <button onclick="window.toggleMobileExplanations()" class="md:hidden fixed bottom-20 right-4 w-12 h-12 bg-white border shadow-lg rounded-full flex items-center justify-center text-primary z-[190]">
                <span class="iconify text-2xl" data-icon="mdi:comment-quote"></span>
            </button>
        </div>
    `;
}

function renderModelContextBar(availableIcons, emojis) {
    const tool = App.modelState.currentTool;
    const showMore = App.teacherSettings.showAllIcons;

    if (tool === 'node') {
        return `
            <span class="text-xs font-bold text-gray-400 uppercase ml-2">Icons:</span>
            <div class="flex gap-1">
                ${(emojis || []).map(e => `
                    <button onclick="window.selectIconForNode('${e}')" 
                        class="p-1.5 rounded-lg hover:bg-blue-100 border-2 text-xl ${App.modelState.selectedIcon === e ? 'border-primary bg-blue-50' : 'border-transparent'}">
                        ${e}
                    </button>
                `).join('')}
                ${(availableIcons || []).map(icon => `
                    <button onclick="window.selectIconForNode('${icon}')" 
                        class="icon-palette-btn p-1.5 rounded-lg hover:bg-blue-100 border-2 ${App.modelState.selectedIcon === icon ? 'border-primary bg-blue-50' : 'border-transparent'}">
                        <span class="iconify text-lg" data-icon="${icon}"></span>
                    </button>
                `).join('')}
            </div>
        `;
    } else if (tool === 'shape') {
        return `
            <span class="text-xs font-bold text-gray-400 uppercase ml-2">Shapes:</span>
            <div class="flex gap-2">
                ${['rectangle', 'circle', 'triangle', 'diamond', 'hexagon', 'star', 'arrow'].map(s => `
                    <button onclick="App.modelState.shapeType = '${s}'; window.renderStudentContent()" 
                        class="p-2 rounded-lg ${App.modelState.shapeType === s ? 'bg-primary text-white' : 'hover:bg-gray-100'}">
                        <span class="iconify" data-icon="mdi:${s}-outline"></span>
                    </button>
                `).join('')}
            </div>
        `;
    }
    return `<p class="text-sm text-gray-400 ml-2 italic">Select a tool to see options</p>`;
}

function renderExplanationPointsList() {
    return (App.work.modelExplanations || []).map((p, i) => `
        <div class="p-3 bg-gray-50 border rounded-lg group relative">
            <div class="flex items-center gap-2 mb-2">
                <span class="w-6 h-6 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">${i + 1}</span>
                <button onclick="window.deleteExplanationPoint('${p.id}')" class="ml-auto text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100">×</button>
            </div>
            <textarea onchange="window.savePointExplanation('${p.id}', this.value)" 
                class="w-full p-2 bg-white border rounded text-sm focus:ring-1 focus:ring-primary focus:outline-none" 
                rows="2" placeholder="Explain this part...">${p.text || ''}</textarea>
        </div>
    `).join('');
}

/**
 * Initializes the modeling canvas environment.
 */
export function initModelCanvas() {
    renderModelElements();
}

/**
 * Main rendering loop for all model elements.
 */
export function renderModelElements() {
    const canvas = document.getElementById('modelCanvas');
    if (!canvas) return;
    updateCanvasTransform();
    renderModelNodes();
    renderModelShapes();
    renderModelNotes();
    renderModelStickers();
    renderModelPaths();
    renderExplanationPoints();
    renderTeacherFeedback();
    renderSelectionOverlay();
}

function renderTeacherFeedback() {
    const canvas = document.getElementById('modelCanvasContent');
    if (!canvas) return;
    
    // Remove old feedback
    canvas.querySelectorAll('.teacher-feedback').forEach(el => el.remove());
    
    if (!App.teacherSettings.showCommentsToStudents && App.mode === 'student') return;

    // Render Comments
    (App.work.modelComments || []).forEach(c => {
        const el = document.createElement('div');
        el.className = 'comment-bubble teacher-feedback';
        el.style.left = c.x + 'px';
        el.style.top = c.y + 'px';
        el.innerHTML = `
            <p class="font-bold text-[10px] text-red-600 uppercase mb-1">${c.author}</p>
            ${c.text}
        `;
        canvas.appendChild(el);
    });

    // Render Stickers (Teacher feedback stickers are in modelStickers too, but author-marked if we had that. 
    // AI1 seems to just show all stickers in modelStickers. 
    // Actually, in modular viewer.js I put them in modelStickers.
    // Let's ensure modelStickers are rendered by renderModelStickers which they are.
}

export function updateCanvasTransform() {
    const content = document.getElementById('modelCanvasContent');
    if (content) {
        content.style.transform = `translate(${App.modelState.pan.x}px, ${App.modelState.pan.y}px) scale(${App.modelState.zoom})`;
    }
}

export function renderModelNodes() {
    const canvas = document.getElementById('modelCanvasContent');
    if (!canvas) return;
    const activeNodeIds = new Set();
    App.work.modelNodes.forEach(node => {
        activeNodeIds.add(node.id);
        const isSelected = App.modelState.selectedItems.some(i => i.id === node.id);
        let el = canvas.querySelector(`.model-node[data-id="${node.id}"]`);
        if (!el) {
            el = createNodeElement(node);
            canvas.appendChild(el);
        }
        updateNodeElement(el, node, isSelected);
    });
    canvas.querySelectorAll('.model-node').forEach(el => {
        if (!activeNodeIds.has(el.dataset.id)) el.remove();
    });
    renderConnections();
}

function updateNodeElement(el, node, isSelected) {
    el.style.left = node.x + 'px'; el.style.top = node.y + 'px';
    el.style.width = (node.width || 120) + 'px'; el.style.minHeight = (node.height || 50) + 'px';
    el.style.borderColor = node.color; el.style.transform = `rotate(${node.rotation || 0}deg)`;
    el.classList.toggle('selected', isSelected);
    const iconEl = el.querySelector('.node-icon');
    const labelEl = el.querySelector('.node-label');
    if (labelEl.textContent !== node.label) labelEl.textContent = node.label;
    const isEmoji = !node.icon?.includes(':');
    if (isEmoji) {
        if (iconEl.textContent !== node.icon) { iconEl.innerHTML = node.icon; iconEl.style.color = 'inherit'; }
    } else {
        if (iconEl.dataset.icon !== node.icon) {
            iconEl.dataset.icon = node.icon;
            iconEl.innerHTML = `<span class="iconify" data-icon="${node.icon}"></span>`;
        }
        iconEl.style.color = node.color;
    }
}

function renderModelShapes() {
    const layer = document.getElementById('shapesLayer');
    if (!layer) return;
    layer.innerHTML = (App.work.modelShapes || []).map(s => {
        const isSelected = App.modelState.selectedItems.some(i => i.id === s.id);
        return `
            <div class="model-shape absolute pointer-events-auto ${isSelected ? 'selected' : ''}" 
                style="left:${s.x}px; top:${s.y}px; width:${s.width}px; height:${s.height}px; transform: rotate(${s.rotation || 0}deg)"
                onclick="window.selectItem(event, 'shape', '${s.id}')"
                onpointerdown="window.startShapeDrag(event, '${s.id}')">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">
                    ${window.getShapeSvgContent(s)}
                </svg>
                <button onclick="window.deleteModelElement('modelShapes', '${s.id}')" class="absolute -top-2 -right-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 shadow-sm" style="z-index:20; border:1px solid #fee2e2;">
                    <span class="iconify" data-icon="mdi:close"></span>
                </button>
            </div>
        `;
    }).join('');
}

function renderModelNotes() {
    const layer = document.getElementById('notesLayer');
    if (!layer) return;
    layer.innerHTML = (App.work.modelNotes || []).map(n => {
        const isSelected = App.modelState.selectedItems.some(i => i.id === n.id);
        return `
        <div class="note-shape absolute pointer-events-auto shadow-md p-2 border rounded flex flex-col group ${isSelected ? 'selected' : ''}" 
            style="left:${n.x}px; top:${n.y}px; width:${n.width}px; min-height:${n.height}px; transform: rotate(${n.rotation || 0}deg); background:${n.color || '#fef3c7'}; border-color:${n.borderColor || '#f59e0b'}"
            onpointerdown="window.startNoteDrag(event, '${n.id}')">
            <div class="flex-1 text-sm text-gray-800 overflow-hidden break-words pointer-events-none">${n.text}</div>
            <button onclick="window.deleteModelElement('modelNotes', '${n.id}')" class="absolute -top-2 -right-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 shadow-sm" style="z-index:20; border:1px solid #fee2e2;">
                <span class="iconify" data-icon="mdi:close"></span>
            </button>
        </div>
        `;
    }).join('');
}

function renderModelStickers() {
    const layer = document.getElementById('stampsLayer');
    if (!layer) return;
    layer.innerHTML = (App.work.modelStickers || []).map(s => {
        const isSelected = App.modelState.selectedItems.some(i => i.id === s.id);
        const isIcon = s.emoji?.includes(':');
        return `
        <div class="absolute pointer-events-auto text-3xl select-none group ${isSelected ? 'selected' : ''}" 
            style="left:${s.x}px; top:${s.y}px; cursor: move; width:40px; height:40px; display:flex; align-items:center; justify-content:center; transform: rotate(${s.rotation || 0}deg)" 
            onclick="window.selectItem(event, 'stamp', '${s.id}')"
            onpointerdown="window.startStampDrag(event, '${s.id}')">
            ${isIcon ? `<span class="iconify" data-icon="${s.emoji}"></span>` : s.emoji}
            <button onclick="window.deleteModelElement('modelStickers', '${s.id}')" class="absolute -top-2 -right-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 shadow-sm" style="z-index:20; border:1px solid #fee2e2;">
                <span class="iconify" data-icon="mdi:close"></span>
            </button>
        </div>
        `;
    }).join('');
}


function renderModelPaths() {
    const svg = document.getElementById('drawingSvg');
    if (!svg) return;
    svg.innerHTML = '';
    App.work.modelPaths.forEach(path => {
        const isSelected = App.modelState.selectedItems.some(i => i.id === path.id);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `path-group ${isSelected ? 'selected' : ''}`);
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = path.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
        p.setAttribute('d', d); p.setAttribute('stroke', path.color); p.setAttribute('stroke-width', path.width); p.setAttribute('fill', 'none');
        g.appendChild(p);
        g.onpointerdown = (e) => { e.stopPropagation(); window.startPathDrag(e, path.id); };
        svg.appendChild(g);
    });
}

function renderExplanationPoints() {
    const layer = document.getElementById('explainLayer');
    if (!layer) return;
    layer.innerHTML = (App.work.modelExplanations || []).map((p, i) => `
        <div class="absolute pointer-events-auto w-8 h-8 bg-primary text-white font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2"
            style="left:${p.x}px; top:${p.y}px;" onpointerdown="window.startExplainDrag(event, '${p.id}')">${i + 1}</div>
    `).join('');
}

function renderSelectionOverlay() {
    const layer = document.getElementById('transformLayer');
    if (!layer) return;
    layer.innerHTML = '';
}

function renderConnections() {
    const svg = document.getElementById('connectionsSvg');
    if (!svg) return;
    svg.querySelectorAll('path').forEach(l => l.remove());
    App.work.modelConnections.forEach(conn => {
        const fromNode = App.work.modelNodes.find(n => n.id === conn.from);
        const toNode = App.work.modelNodes.find(n => n.id === conn.to);
        if (fromNode && toNode) {
            const start = getHandlePosition(fromNode, conn.fromHandle);
            const end = getHandlePosition(toNode, conn.toHandle);
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${start.x} ${start.y} Q ${midX} ${start.y}, ${midX} ${midY} T ${end.x} ${end.y}`);
            path.setAttribute('stroke', '#64748b'); path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none'); path.setAttribute('marker-end', 'url(#arrowhead)');
            svg.appendChild(path);
        }
    });
}

export function getHandlePosition(node, handle) {
    const w = node.width || 120, h = node.height || 50;
    switch (handle) {
        case 'top': return { x: node.x + w / 2, y: node.y };
        case 'bottom': return { x: node.x + w / 2, y: node.y + h };
        case 'left': return { x: node.x, y: node.y + h / 2 };
        case 'right': return { x: node.x + w, y: node.y + h / 2 };
        default: return { x: node.x + w / 2, y: node.y + h / 2 };
    }
}

export function getCanvasCoords(event) {
    const canvas = document.getElementById('modelCanvas');
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left - App.modelState.pan.x) / App.modelState.zoom,
        y: (event.clientY - rect.top - App.modelState.pan.y) / App.modelState.zoom
    };
}

export function getShapeSvgContent(s) {
    const c = s.color || '#3b82f6';
    if (s.type === 'circle') return `<circle cx="50" cy="50" r="45" stroke="${c}" stroke-width="2" fill="${c}20" vector-effect="non-scaling-stroke" />`;
    if (s.type === 'triangle') return `<polygon points="50,5 95,95 5,95" stroke="${c}" stroke-width="2" fill="${c}20" vector-effect="non-scaling-stroke" />`;
    if (s.type === 'diamond') return `<polygon points="50,5 95,50 50,95 5,50" stroke="${c}" stroke-width="2" fill="${c}20" vector-effect="non-scaling-stroke" />`;
    if (s.type === 'hexagon') return `<polygon points="25,5 75,5 95,50 75,95 25,95 5,50" stroke="${c}" stroke-width="2" fill="${c}20" vector-effect="non-scaling-stroke" />`;
    if (s.type === 'star') return `<polygon points="50,5 63,38 95,38 69,59 78,95 50,75 22,95 31,59 5,38 37,38" stroke="${c}" stroke-width="2" fill="${c}20" vector-effect="non-scaling-stroke" />`;
    if (s.type === 'cloud') return `<path d="M25,60 a20,20 0 0,1 0,-40 a25,25 0 0,1 50,0 a20,20 0 0,1 0,40 Z" stroke="${c}" stroke-width="2" fill="${c}20" vector-effect="non-scaling-stroke" />`;
    if (s.type === 'arrow') return `<path d="M5,40 L70,40 L70,20 L95,50 L70,80 L70,60 L5,60 Z" stroke="${c}" stroke-width="2" fill="${c}20" vector-effect="non-scaling-stroke" />`;
    return `<rect x="5" y="5" width="90" height="90" rx="4" stroke="${c}" stroke-width="2" fill="${c}20" vector-effect="non-scaling-stroke" />`;
}

export function setModelTool(tool) {
    App.modelState.currentTool = tool;
    renderStudentContent();
}

export function selectItem(event, type, id) {
    event.stopPropagation();
    if (event.shiftKey || event.ctrlKey || App.modelState.isMultiSelectMode) {
        const idx = App.modelState.selectedItems.findIndex(i => i.id === id);
        if (idx > -1) App.modelState.selectedItems.splice(idx, 1);
        else App.modelState.selectedItems.push({ type, id });
    } else { App.modelState.selectedItems = [{ type, id }]; }
    renderModelElements();
}

export async function createNode(x, y, icon) {
    const node = { id: 'node_' + Date.now(), icon, label: 'Concept', x, y, width: 120, height: 50, color: '#3b82f6' };
    App.work.modelNodes.push(node);
    await saveAndBroadcast('modelNodes', App.work.modelNodes);
    App.modelState.selectedItems = [{ type: 'node', id: node.id }];
    renderModelElements();
}

export function startNodeDrag(event, nodeId) {
    if (event.target.classList.contains('node-handle')) return;
    event.stopPropagation();
    if (!App.modelState.selectedItems.some(i => i.id === nodeId)) selectItem(event, 'node', nodeId);
    const startX = event.clientX, startY = event.clientY;
    const initialPos = App.modelState.selectedItems.map(item => {
        let el;
        if (item.type === 'node') el = App.work.modelNodes.find(i => i.id === item.id);
        else if (item.type === 'shape') el = App.work.modelShapes.find(i => i.id === item.id);
        else if (item.type === 'note') el = App.work.modelNotes.find(i => i.id === item.id);
        else if (item.type === 'stamp') el = App.work.modelStickers.find(i => i.id === item.id);
        return el ? { ...item, x: el.x, y: el.y } : null;
    }).filter(i => i);
    document.onpointermove = (e) => {
        const dx = (e.clientX - startX) / App.modelState.zoom, dy = (e.clientY - startY) / App.modelState.zoom;
        initialPos.forEach(p => {
            let el;
            if (p.type === 'node') el = App.work.modelNodes.find(i => i.id === p.id);
            else if (p.type === 'shape') el = App.work.modelShapes.find(i => i.id === p.id);
            else if (p.type === 'note') el = App.work.modelNotes.find(i => i.id === p.id);
            else if (p.type === 'stamp') el = App.work.modelStickers.find(i => i.id === p.id);
            if (el) { el.x = p.x + dx; el.y = p.y + dy; }
        });
        renderModelElements();
    };
    document.onpointerup = async () => {
        document.onpointermove = document.onpointerup = null;
        await saveToStorage();
    };
}

export function startShapeDrag(event, id) { startNodeDrag(event, id); }
export function startNoteDrag(event, id) { startNodeDrag(event, id); }
export function startStampDrag(event, id) { startNodeDrag(event, id); }
export function startPathDrag(event, id) { /* Implementation ... */ }
export function startExplainDrag(event, id) {
    const p = App.work.modelExplanations.find(x => x.id === id); if (!p) return;
    const startX = event.clientX, startY = event.clientY, initX = p.x, initY = p.y;
    document.onpointermove = (e) => {
        const dx = (e.clientX - startX) / App.modelState.zoom, dy = (e.clientY - startY) / App.modelState.zoom;
        p.x = initX + dx; p.y = initY + dy; renderExplanationPoints();
    };
    document.onpointerup = async () => { document.onpointermove = document.onpointerup = null; await saveAndBroadcast('modelExplanations', App.work.modelExplanations); };
}

function createNodeElement(node) {
    const el = document.createElement('div');
    el.className = 'model-node'; el.dataset.id = node.id;
    el.innerHTML = `<div class="node-content flex items-center gap-2 pointer-events-none"><span class="node-icon text-2xl"></span><span class="node-label text-sm font-medium text-gray-700"></span></div><div class="node-handle top" onpointerdown="window.startConnection(event, '${node.id}', 'top')"></div><div class="node-handle bottom" onpointerdown="window.startConnection(event, '${node.id}', 'bottom')"></div><div class="node-handle left" onpointerdown="window.startConnection(event, '${node.id}', 'left')"></div><div class="node-handle right" onpointerdown="window.startConnection(event, '${node.id}', 'right')"></div>`;
    el.onpointerdown = (e) => window.startNodeDrag(e, node.id); el.onclick = (e) => window.selectItem(e, 'node', node.id);
    return el;
}

export async function saveGeneralExplanation(val) { App.work.modelGeneralExplanation = val; await saveAndBroadcast('modelGeneralExplanation', val); }
export async function savePointExplanation(id, val) {
    const p = App.work.modelExplanations.find(x => x.id === id);
    if (p) p.text = val; await saveAndBroadcast('modelExplanations', App.work.modelExplanations);
}

export async function clearAllModelElements() {
    if (confirm('Clear canvas?')) {
        App.work.modelNodes = []; App.work.modelConnections = []; App.work.modelShapes = []; App.work.modelNotes = []; App.work.modelPaths = []; App.work.modelStickers = [];
        await saveToStorage(); renderStudentContent(); toast('Canvas cleared', 'info');
    }
}

export async function saveModelAsEvidence() {
    const evidence = { id: 'ev_' + Date.now(), type: 'model', title: 'Scientific Model', description: `Model with ${App.work.modelNodes.length} concepts`, icon: 'mdi:cube-outline', data: JSON.parse(JSON.stringify(App.work)), author: App.user.name, time: Date.now() };
    App.work.evidence.push(evidence); await saveAndBroadcast('evidence', App.work.evidence); toast('Model saved!', 'success');
}

export function startConnection(event, nodeId, handle) {
    event.stopPropagation();
    App.modelState.connecting = { from: nodeId, fromHandle: handle };
    const canvas = document.getElementById('modelCanvas');
    document.onpointermove = (e) => {
        const coords = getCanvasCoords(e);
        const fromNode = App.work.modelNodes.find(n => n.id === nodeId);
        const start = getHandlePosition(fromNode, handle);
        const tempSvg = document.getElementById('tempConnectionSvg');
        if (tempSvg) {
            tempSvg.innerHTML = `<line x1="${start.x}" y1="${start.y}" x2="${coords.x}" y2="${coords.y}" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4" />`;
        }
    };
    document.onpointerup = (e) => {
        const target = e.target.closest('.node-handle');
        if (target) {
            const toNodeId = target.closest('.model-node').dataset.id;
            const toHandle = Array.from(target.classList).find(c => ['top', 'bottom', 'left', 'right'].includes(c));
            if (toNodeId !== nodeId) {
                App.work.modelConnections.push({ from: nodeId, fromHandle: handle, to: toNodeId, toHandle: toHandle });
                saveAndBroadcast('modelConnections', App.work.modelConnections);
            }
        }
        document.onpointermove = document.onpointerup = null;
        const tempSvg = document.getElementById('tempConnectionSvg');
        if (tempSvg) tempSvg.innerHTML = '';
        renderModelElements();
    };
}

export function canvasDblClick(event) {
    const coords = getCanvasCoords(event);
    if (App.modelState.currentTool === 'node') {
        createNode(coords.x - 60, coords.y - 25, App.modelState.selectedIcon || 'mdi:plus-circle');
    } else if (App.modelState.currentTool === 'note') {
        const text = prompt('Enter note text:');
        if (text) {
            const note = { id: 'note_' + Date.now(), text, x: coords.x - 50, y: coords.y - 30, width: 100, height: 60, color: '#fef3c7' };
            App.work.modelNotes.push(note);
            saveAndBroadcast('modelNotes', App.work.modelNotes);
            renderModelElements();
        }
    }
}

export async function modelCanvasMouseDown(event) {
    const coords = getCanvasCoords(event);
    const x = coords.x, y = coords.y;
    App.modelState.isDrawing = true;
    App.modelState.shapeStart = { x, y };

    if (App.modelState.currentTool === 'node') {
        createNode(x - 60, y - 25, App.modelState.selectedIcon || 'mdi:atom');
    } else if (App.modelState.currentTool === 'stamp' && App.modelState.selectedIcon) {
        const sticker = { id: 's_' + Date.now(), emoji: App.modelState.selectedIcon, x: x - 20, y: y - 20, rotation: 0 };
        App.work.modelStickers.push(sticker);
        await saveAndBroadcast('modelStickers', App.work.modelStickers);
        renderModelElements();
    } else if (App.modelState.currentTool === 'explain') {
        const point = { id: 'ex_' + Date.now(), x, y, text: '' };
        App.work.modelExplanations.push(point);
        await saveAndBroadcast('modelExplanations', App.work.modelExplanations);
        renderModelElements();
    } else if (App.modelState.currentTool === 'pen') {
        App.modelState.currentPath = [{ x, y }];
    } else if (App.modelState.currentTool === 'shape') {
        // Shape preview logic would go here
    } else if (App.modelState.currentTool === 'select' && !event.target.closest('.model-node, .model-shape, .note-shape, .sticker')) {
        if (!event.shiftKey) App.modelState.selectedItems = [];
        renderModelElements();
    }
}

export function modelCanvasMouseMove(event) {
    if (!App.modelState.isDrawing) return;
    const coords = getCanvasCoords(event);
    const x = coords.x, y = coords.y;

    if (App.modelState.currentTool === 'pen') {
        App.modelState.currentPath.push({ x, y });
        renderModelPaths();
        // Temporary path preview
        const svg = document.getElementById('drawingSvg');
        if (svg) {
            const d = App.modelState.currentPath.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
            let tempPath = svg.querySelector('.temp-path');
            if (!tempPath) {
                tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                tempPath.setAttribute('class', 'temp-path');
                tempPath.setAttribute('fill', 'none');
                svg.appendChild(tempPath);
            }
            tempPath.setAttribute('d', d);
            tempPath.setAttribute('stroke', App.modelState.penColor || '#3b82f6');
            tempPath.setAttribute('stroke-width', App.modelState.penWidth || 3);
        }
    }
}

export async function modelCanvasMouseUp(event) {
    if (!App.modelState.isDrawing) return;
    const coords = getCanvasCoords(event);
    const x = coords.x, y = coords.y;

    if (App.modelState.currentTool === 'pen' && App.modelState.currentPath.length > 1) {
        const path = { 
            id: 'path_' + Date.now(), 
            points: [...App.modelState.currentPath], 
            color: App.modelState.penColor || '#3b82f6', 
            width: App.modelState.penWidth || 3 
        };
        App.work.modelPaths.push(path);
        await saveAndBroadcast('modelPaths', App.work.modelPaths);
    } else if (App.modelState.currentTool === 'shape') {
        const start = App.modelState.shapeStart;
        const width = Math.abs(x - start.x);
        const height = Math.abs(y - start.y);
        const shape = {
            id: 'shape_' + Date.now(),
            type: App.modelState.shapeType || 'rectangle',
            x: Math.min(x, start.x),
            y: Math.min(y, start.y),
            width: Math.max(20, width),
            height: Math.max(20, height),
            color: App.modelState.penColor || '#3b82f6',
            rotation: 0
        };
        App.work.modelShapes.push(shape);
        await saveAndBroadcast('modelShapes', App.work.modelShapes);
    }

    App.modelState.isDrawing = false;
    App.modelState.currentPath = [];
    const svg = document.getElementById('drawingSvg');
    if (svg) {
        const temp = svg.querySelector('.temp-path');
        if (temp) temp.remove();
    }
    renderModelElements();
}

export function toggleToolDrawer() { App.modelState.drawerOpen = !App.modelState.drawerOpen; renderStudentContent(); }
export function toggleToolbarPin() { App.modelState.isToolbarPinned = !App.modelState.isToolbarPinned; renderStudentContent(); }
export function toggleMultiSelect() { App.modelState.isMultiSelectMode = !App.modelState.isMultiSelectMode; renderStudentContent(); }
export function toggleMobileExplanations() { document.getElementById('mobileExplanationPanel')?.classList.toggle('translate-y-full'); }
export async function deleteModelElement(type, id) { App.work[type] = App.work[type].filter(i => i.id !== id); await saveAndBroadcast(type, App.work[type]); renderStudentContent(); }
export async function deleteExplanationPoint(id) { App.work.modelExplanations = App.work.modelExplanations.filter(i => i.id !== id); await saveAndBroadcast('modelExplanations', App.work.modelExplanations); renderStudentContent(); }
