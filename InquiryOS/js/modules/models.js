/**
 * @file models.js
 * @description Logic for the SEP2 module: Developing and Using Models. 
 * Implements a complex interactive node-based canvas with SVG path drawing, 
 * shape manipulation, and teacher feedback integration.
 */

/* global Fuse */

import { App } from '../core/state.js';
import { saveAndBroadcast, saveToStorage } from '../core/sync.js';
import { renderStudentContent, renderModuleHeader } from '../ui/renderer.js';
import { toast, deepClone, renderInfoTip } from '../ui/utils.js';

/**
 * Renders the Models Practice module.
 */
export function renderModelsModule() {
    const defaultIcons = App.teacherSettings.showDefaultIcons ? (App.teacherSettings.defaultIcons || []) : [];
    const lessonIcons = App.teacherSettings.lessonIcons || [];
    const availableIcons = [...new Set([...defaultIcons, ...lessonIcons])];
    
    let availableEmojis = [];
    if (App.teacherSettings.showDefaultEmojis) {
        const activeSets = App.teacherSettings.activeEmojiSets || ['general'];
        activeSets.forEach(set => {
            if (App.teacherSettings.emojiSets[set]) availableEmojis = [...availableEmojis, ...App.teacherSettings.emojiSets[set]];
        });
        if (App.teacherSettings.defaultEmojis) availableEmojis = [...new Set([...availableEmojis, ...App.teacherSettings.defaultEmojis])];
    }
    const lessonEmojis = App.teacherSettings.lessonEmojis || [];
    availableEmojis = [...new Set([...availableEmojis, ...lessonEmojis])];

    const isFullscreen = App.modelState.isFullscreen;

    return `
        <div class="panels-container">
            <!-- Canvas Panel -->
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Model Canvas">
                ${renderModuleHeader(isFullscreen ? 'Models' : 'Developing Models', 'mdi:cube-outline', 'SEP2', `
                    <button onclick="window.clearAllModelElements()" class="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all" title="Clear Canvas">
                        <span class="iconify" data-icon="mdi:trash-can-outline" data-width="18" data-height="18"></span>
                    </button>
                    <button onclick="window.saveModelAsEvidence()" class="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="Save Evidence">
                        <span class="iconify" data-icon="mdi:star-outline" data-width="18" data-height="18"></span>
                    </button>
                    <button onclick="window.toggleCanvasFullscreen()" class="p-2 text-primary hover:bg-blue-50 rounded-lg transition-all" title="Fullscreen Canvas">
                        <span class="iconify" data-icon="mdi:arrow-expand-all" data-width="18" data-height="18"></span>
                    </button>
                `, 'A scientific model shows components and how they interact to explain why something happens.')}

                <div id="modelContextBar" class="bg-white border-b p-1.5 md:p-2 flex items-center gap-3 md:gap-4 overflow-x-auto min-h-[48px] md:min-h-[56px] flex-nowrap scrollbar-hide touch-pan-x shrink-0">
                    ${renderModelContextBar(availableIcons, availableEmojis)}
                </div>

                <div class="flex-1 relative overflow-hidden bg-slate-50 min-h-0">
                    <!-- Floating Palette - Now Always Visible on both mobile and desktop if not overlapping -->
                    <div class="absolute left-3 top-3 z-[60] flex flex-col gap-2">
                        <button onclick="window.toggleToolDrawer()" class="w-10 h-10 bg-primary text-white rounded-full shadow-lg flex items-center justify-center">
                            <span class="iconify" data-icon="${App.modelState.drawerOpen ? 'mdi:close' : 'mdi:pencil'}"></span>
                        </button>
                        <div id="toolDrawer" class="flex flex-col gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-white/20 transition-all ${App.modelState.drawerOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}">
                            ${['select', 'node', 'pen', 'shape', 'note', 'stamp', 'explain'].map(t => `
                                <button onclick="window.setModelTool('${t}'); window.toggleToolDrawer();" class="w-10 h-10 rounded-xl flex items-center justify-center ${App.modelState.currentTool === t ? 'bg-primary text-white' : 'text-gray-600'}">
                                    <span class="iconify" data-icon="${t==='select'?'mdi:cursor-default':t==='node'?'mdi:plus-circle':t==='pen'?'mdi:pencil':t==='shape'?'mdi:shape':t==='note'?'mdi:note-text':t==='stamp'?'mdi:sticker-emoji':'mdi:comment-quote'}"></span>
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div id="modelCanvas" class="model-canvas w-full h-full" 
                        onpointerdown="window.modelCanvasMouseDown(event)"
                        onpointermove="window.modelCanvasMouseMove(event)"
                        onpointerup="window.modelCanvasMouseUp(event)">
                        <div id="modelCanvasContent" class="absolute inset-0 origin-top-left pointer-events-none">
                            <svg id="drawingSvg" class="absolute inset-0 w-full h-full" style="z-index: 6; pointer-events: none;"></svg>
                            <svg id="connectionsSvg" class="connection-line"></svg>
                            <svg id="tempConnectionSvg" class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 100;"></svg>
                            <div id="shapesLayer" class="absolute inset-0 pointer-events-none" style="z-index: 5;"></div>
                            <div id="notesLayer" class="absolute inset-0 pointer-events-none" style="z-index: 10;"></div>
                            <div id="stampsLayer" class="absolute inset-0 pointer-events-none" style="z-index: 15;"></div>
                            <div id="explainLayer" class="absolute inset-0 pointer-events-none" style="z-index: 80;"></div>
                            <div id="transformLayer" class="absolute inset-0 pointer-events-none" style="z-index: 100;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Explanation Panel -->
            <div class="bg-white border-b flex flex-col h-full" data-card-title="Model Explanations">
                ${renderModuleHeader('Model Explanations', 'mdi:comment-quote', 'SEP2', '', 'Use this space to write down exactly how the relationships in your model explain the phenomenon.')}
                
                <div class="panel-content space-y-6 md:space-y-8 md:!p-6 overflow-y-auto">
                    <div class="space-y-2">
                        <label class="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest ml-1">The Big Picture</label>
                        <textarea onchange="window.saveGeneralExplanation(this.value)" 
                            class="w-full p-4 md:p-5 bg-blue-50/50 border-2 border-blue-100 rounded-2xl text-sm md:text-base font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white outline-none transition-all shadow-inner" 
                            rows="4" placeholder="How does this model explain the phenomenon?">${App.work.modelGeneralExplanation || ''}</textarea>
                    </div>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between px-1">
                            <label class="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">Evidence Points</label>
                            <span class="text-[10px] font-black text-purple-500 uppercase tracking-widest">Markers: ${App.work.modelExplanations?.length || 0}</span>
                        </div>
                        <div id="explanationPointsList" class="space-y-3 md:space-y-4 max-h-[40vh] md:max-h-none overflow-y-auto pr-1 no-scrollbar">
                            ${renderExplanationPointsList() || `<p class="text-[10px] text-gray-300 italic text-center py-6 uppercase font-bold tracking-[0.2em]">Add markers to the canvas to describe specific interactions.</p>`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderModelContextBar(availableIcons, emojis) {
    const tool = App.modelState.currentTool;
    const showMore = App.teacherSettings.showAllIcons;
    const selectedNode = App.modelState.selectedItems.length === 1 && App.modelState.selectedItems[0].type === 'node' ? 
        App.work.modelNodes.find(n => n.id === App.modelState.selectedItems[0].id) : null;

    if (tool === 'select' && selectedNode) {
        return `
            <span class="text-xs font-bold text-gray-400 uppercase ml-2">Node Options:</span>
            <div class="flex gap-2 items-center">
                <button onclick="window.openNodeTagPicker('${selectedNode.id}')" 
                    class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 border border-blue-100 flex items-center gap-2">
                    <span class="iconify" data-icon="mdi:tag-plus"></span>
                    ${selectedNode.ngssTag ? 'Change Tag: ' + selectedNode.ngssTag : 'Add NGSS Tag'}
                </button>
                <div class="h-6 w-px bg-gray-200 mx-1"></div>
                <input type="color" value="${selectedNode.color}" onchange="window.updateNodeColor('${selectedNode.id}', this.value)" class="w-8 h-8 rounded-lg cursor-pointer border-none p-0 bg-transparent">
            </div>
        `;
    }

    if (tool === 'explain') {
        return `
            <span class="text-xs font-bold text-gray-400 uppercase ml-2">Explanation Points:</span>
            <p class="text-[10px] text-gray-500 font-medium">Click on the canvas to place numbered explanation markers.</p>
        `;
    }

    if (tool === 'node' || tool === 'stamp') {
        return `
            <span class="text-xs font-bold text-gray-400 uppercase ml-2">${tool === 'node' ? 'Icons' : 'Stamps'}:</span>
            <div class="flex gap-1 items-center">
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
                ${showMore ? `
                    <div class="h-6 w-px bg-gray-200 mx-2"></div>
                    <button onclick="window.openIconPicker()" class="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                        <span class="iconify" data-icon="mdi:magnify"></span>
                        Search All
                    </button>
                ` : ''}
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

export function initModelCanvas() { renderModelElements(); }

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
    canvas.querySelectorAll('.teacher-feedback').forEach(el => el.remove());
    if (!App.teacherSettings.showFeedbackToStudents && App.mode === 'student') return;
    (App.work.modelComments || []).forEach(c => {
        const el = document.createElement('div');
        el.className = 'comment-bubble teacher-feedback';
        el.style.left = c.x + 'px'; el.style.top = c.y + 'px';
        el.innerHTML = `<p class="font-bold text-[10px] text-red-600 uppercase mb-1">${c.author}</p>${c.text}`;
        canvas.appendChild(el);
    });
}

export function updateCanvasTransform() {
    const content = document.getElementById('modelCanvasContent');
    if (content) content.style.transform = `translate(${App.modelState.pan.x}px, ${App.modelState.pan.y}px) scale(${App.modelState.zoom})`;
}

export function renderModelNodes() {
    const canvas = document.getElementById('modelCanvasContent');
    if (!canvas) return;
    const activeNodeIds = new Set();
    App.work.modelNodes.forEach(node => {
        activeNodeIds.add(node.id);
        const isSelected = App.modelState.selectedItems.some(i => i.id === node.id);
        let el = canvas.querySelector(`.model-node[data-id="${node.id}"]`);
        if (!el) { el = createNodeElement(node); canvas.appendChild(el); }
        updateNodeElement(el, node, isSelected);
    });
    canvas.querySelectorAll('.model-node').forEach(el => { if (!activeNodeIds.has(el.dataset.id)) el.remove(); });
    renderConnections();
}

function updateNodeElement(el, node, isSelected) {
    el.style.left = node.x + 'px'; el.style.top = node.y + 'px';
    el.style.width = (node.width || 120) + 'px'; el.style.height = (node.height || 80) + 'px';
    el.style.borderColor = node.color; el.style.transform = `rotate(${node.rotation || 0}deg)`;
    el.classList.toggle('selected', isSelected);
    const iconEl = el.querySelector('.node-icon');
    const labelInput = el.querySelector('.node-label-input');
    if (labelInput.value !== node.label) labelInput.value = node.label;
    const isEmoji = !node.icon?.includes(':');
    if (isEmoji) { iconEl.innerHTML = node.icon || '❓'; iconEl.style.color = 'inherit'; }
    else { iconEl.innerHTML = `<span class="iconify" data-icon="${node.icon}"></span>`; iconEl.style.color = node.color; }
    let tagEl = el.querySelector('.node-ngss-tag');
    if (node.ngssTag) {
        if (!tagEl) { tagEl = document.createElement('div'); tagEl.className = 'node-ngss-tag absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded-full shadow-lg border border-white whitespace-nowrap z-20'; el.appendChild(tagEl); }
        tagEl.textContent = node.ngssTag;
    } else if (tagEl) { tagEl.remove(); }
}

export async function updateNodeLabel(id, label) { const node = App.work.modelNodes.find(n => n.id === id); if (node) { node.label = label; await saveAndBroadcast('modelNodes', App.work.modelNodes); } }

function renderModelShapes() {
    const layer = document.getElementById('shapesLayer'); if (!layer) return;
    layer.innerHTML = (App.work.modelShapes || []).map(s => {
        const isSelected = App.modelState.selectedItems.some(i => i.id === s.id);
        return `<div class="model-shape absolute pointer-events-auto ${isSelected ? 'selected' : ''}" style="left:${s.x}px; top:${s.y}px; width:${s.width}px; height:${s.height}px; transform: rotate(${s.rotation || 0}deg)" onclick="window.selectItem(event, 'shape', '${s.id}')" onpointerdown="window.startShapeDrag(event, '${s.id}')"><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">${window.getShapeSvgContent(s)}</svg><button onclick="window.deleteModelElement('modelShapes', '${s.id}')" class="absolute -top-2 -right-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 shadow-sm" style="z-index:20; border:1px solid #fee2e2;"><span class="iconify" data-icon="mdi:close"></span></button></div>`;
    }).join('');
}

function renderModelNotes() {
    const layer = document.getElementById('notesLayer'); if (!layer) return;
    layer.innerHTML = (App.work.modelNotes || []).map(n => {
        const isSelected = App.modelState.selectedItems.some(i => i.id === n.id);
        return `<div class="note-shape absolute pointer-events-auto shadow-md p-2 border rounded flex flex-col group ${isSelected ? 'selected' : ''}" style="left:${n.x}px; top:${n.y}px; width:${n.width}px; min-height:${n.height}px; transform: rotate(${n.rotation || 0}deg); background:${n.color || '#fef3c7'}; border-color:${n.borderColor || '#f59e0b'}" onclick="window.selectItem(event, 'note', '${n.id}')" onpointerdown="window.startNoteDrag(event, '${n.id}')"><div class="flex-1 text-sm text-gray-800 overflow-hidden break-words pointer-events-none">${n.text}</div><button onclick="window.deleteModelElement('modelNotes', '${n.id}')" class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm transition-opacity z-20">×</button></div>`;
    }).join('');
}

function renderModelStickers() {
    const layer = document.getElementById('stampsLayer'); if (!layer) return;
    layer.innerHTML = (App.work.modelStickers || []).map(s => {
        const isSelected = App.modelState.selectedItems.some(i => i.id === s.id); const isIcon = s.emoji?.includes(':'); const w = s.width || 60; const h = s.height || 60;
        return `<div class="absolute pointer-events-auto select-none group/sticker ${isSelected ? 'selected ring-2 ring-primary ring-offset-4 rounded-xl' : ''}" style="left:${s.x}px; top:${s.y}px; width:${w}px; height:${h}px; cursor: move; display:flex; align-items:center; justify-content:center; transform: rotate(${s.rotation || 0}deg)" onclick="window.selectItem(event, 'stamp', '${s.id}')" onpointerdown="window.startStampDrag(event, '${s.id}')" data-id="${s.id}"><div class="w-full h-full flex items-center justify-center p-1">${isIcon ? `<span class="iconify" style="width: 100%; height: 100%;" data-icon="${s.emoji}"></span>` : `<span style="font-size: ${Math.min(w, h) * 0.8}px; line-height: 1;">${s.emoji}</span>`}</div><button onclick="window.deleteModelElement('modelStickers', '${s.id}')" class="absolute -top-3 -right-3 w-7 h-7 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/sticker:opacity-100 transition-all z-20 shadow-xl pointer-events-auto hover:bg-red-500 hover:text-white" onpointerdown="event.stopPropagation()"><span class="iconify text-xs" data-icon="mdi:close"></span></button></div>`;
    }).join('');
}

function renderModelPaths() {
    const svg = document.getElementById('drawingSvg'); if (!svg) return;
    svg.innerHTML = '';
    App.work.modelPaths.forEach(path => {
        const isSelected = App.modelState.selectedItems.some(i => i.id === path.id); const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', `path-group pointer-events-auto ${isSelected ? 'selected' : ''}`); g.setAttribute('data-id', path.id);
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); const d = path.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' '); p.setAttribute('d', d); p.setAttribute('stroke', path.color); p.setAttribute('stroke-width', path.width); p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
        g.appendChild(p); g.onpointerdown = (e) => { e.stopPropagation(); window.startPathDrag(e, path.id); }; g.onclick = (e) => { e.stopPropagation(); window.selectItem(e, 'path', path.id); }; svg.appendChild(g);
    });
}

function renderExplanationPoints() {
    const layer = document.getElementById('explainLayer'); if (!layer) return;
    layer.innerHTML = (App.work.modelExplanations || []).map((p, i) => `<div class="absolute pointer-events-auto w-8 h-8 bg-primary text-white font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2" style="left:${p.x}px; top:${p.y}px;" onpointerdown="window.startExplainDrag(event, '${p.id}')" data-id="${p.id}">${i + 1}</div>`).join('');
}

function renderSelectionOverlay() {
    const layer = document.getElementById('transformLayer'); if (!layer) return; layer.innerHTML = '';
    if (App.modelState.selectedItems.length === 1) {
        const item = App.modelState.selectedItems[0]; let el;
        if (item.type === 'node') el = App.work.modelNodes.find(i => i.id === item.id); else if (item.type === 'shape') el = App.work.modelShapes.find(i => i.id === item.id); else if (item.type === 'note') el = App.work.modelNotes.find(i => i.id === item.id); else if (item.type === 'stamp') el = App.work.modelStickers.find(i => i.id === item.id);
        if (el && item.type !== 'path') {
            const w = el.width || (item.type === 'stamp' ? 60 : 120), h = el.height || (item.type === 'stamp' ? 60 : 80);
            const overlay = document.createElement('div'); overlay.className = 'selection-handles pointer-events-none'; overlay.style.left = (el.x - 4) + 'px'; overlay.style.top = (el.y - 4) + 'px'; overlay.style.width = (w + 8) + 'px'; overlay.style.height = (h + 8) + 'px'; overlay.style.transform = `rotate(${el.rotation || 0}deg)`;
            ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].forEach(hType => { const handle = document.createElement('div'); handle.className = `handle ${hType} pointer-events-auto`; handle.onpointerdown = (e) => { e.stopPropagation(); window.startResize(e, item.id, item.type, hType); }; overlay.appendChild(handle); });
            const rot = document.createElement('div'); rot.className = 'handle rot pointer-events-auto'; rot.innerHTML = '<span class="iconify" data-icon="mdi:rotate-right"></span>'; rot.onpointerdown = (e) => { e.stopPropagation(); window.startRotate(e, item.id, item.type); }; overlay.appendChild(rot); layer.appendChild(overlay);
        }
    }
}

export function startResize(event, id, type, handle) {
    event.stopPropagation(); const startX = event.clientX, startY = event.clientY;
    const item = (type === 'node' ? App.work.modelNodes : type === 'shape' ? App.work.modelShapes : type === 'stamp' ? App.work.modelStickers : App.work.modelNotes).find(i => i.id === id); if (!item) return;
    const initW = item.width || (type === 'stamp' ? 60 : 120), initH = item.height || (type === 'stamp' ? 60 : 80), initX = item.x, initY = item.y;
    document.onpointermove = (e) => { const dx = (e.clientX - startX) / App.modelState.zoom, dy = (e.clientY - startY) / App.modelState.zoom; if (handle.includes('e')) item.width = Math.max(20, initW + dx); if (handle.includes('s')) item.height = Math.max(20, initH + dy); if (handle.includes('w')) { item.width = Math.max(20, initW - dx); item.x = initX + dx; } if (handle.includes('n')) { item.height = Math.max(20, initH - dy); item.y = initY + dy; } renderModelElements(); };
    document.onpointerup = async () => { document.onpointermove = document.onpointerup = null; await saveToStorage(); };
}

export function startRotate(event, id, type) {
    event.stopPropagation(); const item = (type === 'node' ? App.work.modelNodes : type === 'shape' ? App.work.modelShapes : type === 'stamp' ? App.work.modelStickers : App.work.modelNotes).find(i => i.id === id); if (!item) return;
    const rect = document.querySelector(`[data-id="${id}"]`)?.getBoundingClientRect(); if (!rect) return; const centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2;
    document.onpointermove = (e) => { const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI; item.rotation = angle + 90; renderModelElements(); };
    document.onpointerup = async () => { document.onpointermove = document.onpointerup = null; await saveToStorage(); };
}

function renderConnections() {
    const svg = document.getElementById('connectionsSvg'); if (!svg) return; svg.querySelectorAll('path').forEach(l => l.remove());
    const allObjects = [...App.work.modelNodes, ...App.work.modelShapes, ...App.work.modelNotes, ...App.work.modelStickers];
    App.work.modelConnections.forEach((conn) => {
        const fromObj = allObjects.find(n => n.id === conn.from), toObj = allObjects.find(n => n.id === conn.to);
        if (fromObj && toObj) {
            const isSelected = App.modelState.selectedItems.some(i => i.id === conn.id), start = getHandlePosition(fromObj, conn.fromHandle), end = getHandlePosition(toObj, conn.toHandle), midX = (start.x + end.x) / 2;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`); path.setAttribute('stroke', isSelected ? '#7c3aed' : '#64748b'); path.setAttribute('stroke-width', isSelected ? '4' : '2'); path.setAttribute('fill', 'none'); path.setAttribute('marker-end', 'url(#arrowhead)'); path.setAttribute('class', isSelected ? 'selected' : ''); path.setAttribute('data-id', conn.id); path.onclick = (e) => { e.stopPropagation(); window.selectItem(e, 'connection', conn.id); }; svg.appendChild(path);
        }
    });
}

export function getHandlePosition(node, handle) {
    if (!node) return { x: 0, y: 0 }; const w = node.width || 120, h = node.height || (node.label ? 80 : 60);
    switch (handle) { case 'top': return { x: node.x + w / 2, y: node.y }; case 'bottom': return { x: node.x + w / 2, y: node.y + h }; case 'left': return { x: node.x, y: node.y + h / 2 }; case 'right': return { x: node.x + w, y: node.y + h / 2 }; default: return { x: node.x + w / 2, y: node.y + h / 2 }; }
}

export function getCanvasCoords(event) { const canvas = document.getElementById('modelCanvas'); if (!canvas) return { x: 0, y: 0 }; const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left - App.modelState.pan.x) / App.modelState.zoom, y: (event.clientY - rect.top - App.modelState.pan.y) / App.modelState.zoom }; }

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

export function setModelTool(tool) { if (App.modelState.currentTool === tool) App.modelState.toolSticky = !App.modelState.toolSticky; else { App.modelState.currentTool = tool; App.modelState.toolSticky = false; } renderStudentContent(); }
export function selectItem(event, type, id) {
    if (event) event.stopPropagation(); const isMulti = App.modelState.isMultiSelectMode || (event && (event.shiftKey || event.ctrlKey));
    if (!isMulti) { if (App.modelState.selectedItems.length === 1 && App.modelState.selectedItems[0].id === id) return; App.modelState.selectedItems = [{ type, id }]; }
    else { const idx = App.modelState.selectedItems.findIndex(i => i.id === id); if (idx > -1) App.modelState.selectedItems.splice(idx, 1); else App.modelState.selectedItems.push({ type, id }); }
    renderModelElements();
}

export async function deleteSelectedItems() {
    if (App.modelState.selectedItems.length === 0) return; if (!confirm(`Delete ${App.modelState.selectedItems.length} item(s)?`)) return;
    App.modelState.selectedItems.forEach(item => { if (item.type === 'node') App.work.modelNodes = App.work.modelNodes.filter(i => i.id !== item.id); else if (item.type === 'shape') App.work.modelShapes = App.work.modelShapes.filter(i => i.id !== item.id); else if (item.type === 'note') App.work.modelNotes = App.work.modelNotes.filter(i => i.id !== item.id); else if (item.type === 'stamp') App.work.modelStickers = App.work.modelStickers.filter(i => i.id !== item.id); else if (item.type === 'path') App.work.modelPaths = App.work.modelPaths.filter(i => i.id !== item.id); else if (item.type === 'connection') App.work.modelConnections = App.work.modelConnections.filter(i => i.id !== item.id); });
    const allObjIds = new Set([...App.work.modelNodes.map(n => n.id), ...App.work.modelShapes.map(n => n.id), ...App.work.modelNotes.map(n => n.id), ...App.work.modelStickers.map(n => n.id), ...App.work.modelPaths.map(n => n.id)]);
    App.work.modelConnections = App.work.modelConnections.filter(c => allObjIds.has(c.from) && allObjIds.has(c.to)); App.modelState.selectedItems = []; await saveToStorage(); renderStudentContent();
}

export async function createNode(x, y, icon) { const node = { id: 'node_' + Date.now(), icon, label: 'Concept', x, y, width: 140, height: 90, color: '#3b82f6' }; App.work.modelNodes.push(node); await saveAndBroadcast('modelNodes', App.work.modelNodes); App.modelState.selectedItems = [{ type: 'node', id: node.id }]; renderModelElements(); }

export function startNodeDrag(event, nodeId) {
    if (event.target.classList.contains('node-handle')) return; event.stopPropagation();
    let type = 'node'; if (App.work.modelShapes.some(i => i.id === nodeId)) type = 'shape'; else if (App.work.modelNotes.some(i => i.id === nodeId)) type = 'note'; else if (App.work.modelStickers.some(i => i.id === nodeId)) type = 'stamp'; else if (App.work.modelPaths.some(i => i.id === nodeId)) type = 'path';
    if (!App.modelState.selectedItems.some(i => i.id === nodeId)) selectItem(event, type, nodeId);
    const startX = event.clientX, startY = event.clientY;
    const initialStates = App.modelState.selectedItems.map(item => { let el; if (item.type === 'node') el = App.work.modelNodes.find(i => i.id === item.id); else if (item.type === 'shape') el = App.work.modelShapes.find(i => i.id === item.id); else if (item.type === 'note') el = App.work.modelNotes.find(i => i.id === item.id); else if (item.type === 'stamp') el = App.work.modelStickers.find(i => i.id === item.id); else if (item.type === 'path') el = App.work.modelPaths.find(i => i.id === item.id); if (el) { if (item.type === 'path') return { ...item, points: deepClone(el.points) }; return { ...item, x: el.x, y: el.y }; } return null; }).filter(i => i);
    document.onpointermove = (e) => { const dx = (e.clientX - startX) / App.modelState.zoom, dy = (e.clientY - startY) / App.modelState.zoom; initialStates.forEach(p => { let el; if (p.type === 'node') el = App.work.modelNodes.find(i => i.id === p.id); else if (p.type === 'shape') el = App.work.modelShapes.find(i => i.id === p.id); else if (p.type === 'note') el = App.work.modelNotes.find(i => i.id === p.id); else if (p.type === 'stamp') el = App.work.modelStickers.find(i => i.id === p.id); else if (p.type === 'path') el = App.work.modelPaths.find(i => i.id === p.id); if (el) { if (p.type === 'path') el.points = p.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy })); else { el.x = p.x + dx; el.y = p.y + dy; } } }); renderModelElements(); };
    document.onpointerup = async () => { document.onpointermove = document.onpointerup = null; await saveToStorage(); };
}

export function startShapeDrag(event, id) { startNodeDrag(event, id); }
export function startNoteDrag(event, id) { startNodeDrag(event, id); }
export function startStampDrag(event, id) { startNodeDrag(event, id); }
export function startPathDrag(event, id) { startNodeDrag(event, id); }
export function startExplainDrag(event, id) {
    const p = App.work.modelExplanations.find(x => x.id === id); if (!p) return;
    const startX = event.clientX, startY = event.clientY, initX = p.x, initY = p.y;
    document.onpointermove = (e) => { const dx = (e.clientX - startX) / App.modelState.zoom, dy = (e.clientY - startY) / App.modelState.zoom; p.x = initX + dx; p.y = initY + dy; renderExplanationPoints(); };
    document.onpointerup = async () => { document.onpointermove = document.onpointerup = null; await saveAndBroadcast('modelExplanations', App.work.modelExplanations); };
}

export function toggleCanvasFullscreen() {
    const canvasContainer = document.querySelector('[data-card-title="Model Canvas"]');
    if (!canvasContainer) return;
    
    if (!document.fullscreenElement) {
        if (canvasContainer.requestFullscreen) {
            canvasContainer.requestFullscreen().catch(err => {
                toast(`Error attempting to enable full-screen mode: ${err.message}`, 'error');
            });
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function createNodeElement(node) {
    const el = document.createElement('div'); el.className = 'model-node group/node transition-all pointer-events-auto'; el.dataset.id = node.id;
    el.innerHTML = `<div class="node-content flex flex-col items-center justify-center gap-3 h-full w-full pointer-events-none select-none"><div class="node-icon-container w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl shadow-inner group-hover/node:bg-white transition-all group-hover/node:scale-110 overflow-hidden border border-slate-100"><span class="node-icon text-4xl"></span></div><div class="w-full px-2"><input type="text" class="node-label-input text-center text-[11px] font-black uppercase tracking-tight text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full pointer-events-auto" value="${node.label}" onchange="window.updateNodeLabel('${node.id}', this.value)" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation()"></div></div><div class="node-handle top pointer-events-auto shadow-sm" onpointerdown="window.startConnection(event, '${node.id}', 'top')"></div><div class="node-handle bottom pointer-events-auto shadow-sm" onpointerdown="window.startConnection(event, '${node.id}', 'bottom')"></div><div class="node-handle left pointer-events-auto shadow-sm" onpointerdown="window.startConnection(event, '${node.id}', 'left')"></div><div class="node-handle right pointer-events-auto shadow-sm" onpointerdown="window.startConnection(event, '${node.id}', 'right')"></div><button onclick="window.deleteModelElement('modelNodes', '${node.id}')" class="absolute -top-4 -right-4 w-8 h-8 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-all z-30 shadow-xl pointer-events-auto hover:bg-red-500 hover:text-white" onpointerdown="event.stopPropagation()"><span class="iconify" data-icon="mdi:close"></span></button>`;
    el.onpointerdown = (e) => { if (e.target.classList.contains('node-label-input') || e.target.closest('button') || e.target.classList.contains('node-handle')) return; e.preventDefault(); window.startNodeDrag(e, node.id); };
    el.onclick = (e) => { if (e.target.classList.contains('node-label-input') || e.target.closest('button')) return; window.selectItem(e, 'node', node.id); };
    return el;
}

export async function saveGeneralExplanation(val) { App.work.modelGeneralExplanation = val; await saveAndBroadcast('modelGeneralExplanation', val); }
export async function savePointExplanation(id, val) { const p = App.work.modelExplanations.find(x => x.id === id); if (p) p.text = val; await saveAndBroadcast('modelExplanations', App.work.modelExplanations); }
export async function clearAllModelElements() { if (confirm('Clear canvas?')) { App.work.modelNodes = []; App.work.modelConnections = []; App.work.modelShapes = []; App.work.modelNotes = []; App.work.modelPaths = []; App.work.modelStickers = []; await saveToStorage(); renderStudentContent(); toast('Canvas cleared', 'info'); } }
export async function saveModelAsEvidence() { const evidence = { id: 'ev_' + Date.now(), type: 'model', title: 'Scientific Model', description: `Model with ${App.work.modelNodes.length} concepts`, icon: 'mdi:cube-outline', data: deepClone(App.work), author: App.user.name, time: Date.now() }; App.work.evidence.push(evidence); await saveAndBroadcast('evidence', App.work.evidence); toast('Model saved!', 'success'); }

export function startConnection(event, nodeId, handle) {
    event.stopPropagation(); App.modelState.connecting = { from: nodeId, fromHandle: handle };
    const allObjects = [...App.work.modelNodes, ...App.work.modelShapes, ...App.work.modelNotes, ...App.work.modelStickers];
    document.onpointermove = (e) => { const coords = getCanvasCoords(e), fromObj = allObjects.find(n => n.id === nodeId), start = getHandlePosition(fromObj, handle), tempSvg = document.getElementById('tempConnectionSvg'); if (tempSvg) tempSvg.innerHTML = `<line x1="${start.x}" y1="${start.y}" x2="${coords.x}" y2="${coords.y}" stroke="#3b82f6" stroke-width="3" stroke-dasharray="6" />`; };
    document.onpointerup = (e) => { const targetEl = e.target.closest('.model-node, .model-shape, .note-shape, .model-sticker'), handleEl = e.target.closest('.node-handle'), targetParent = targetEl || handleEl?.closest('.model-node, .model-shape, .note-shape, .model-sticker'), toId = targetParent?.dataset.id, toHandle = handleEl ? Array.from(handleEl.classList).find(c => ['top', 'bottom', 'left', 'right'].includes(c)) : 'center'; if (toId && toId !== nodeId) { App.work.modelConnections.push({ id: 'conn_' + Date.now(), from: nodeId, fromHandle: handle, to: toId, toHandle: toHandle }); saveAndBroadcast('modelConnections', App.work.modelConnections); } document.onpointermove = document.onpointerup = null; const tempSvg = document.getElementById('tempConnectionSvg'); if (tempSvg) tempSvg.innerHTML = ''; renderModelElements(); };
}

export async function modelCanvasMouseDown(event) {
    const coords = getCanvasCoords(event), x = coords.x, y = coords.y; App.modelState.isDrawing = true; App.modelState.shapeStart = { x, y };
    if (App.modelState.currentTool === 'node') createNode(x - 70, y - 45, App.modelState.selectedIcon || 'mdi:atom');
    else if (App.modelState.currentTool === 'stamp' && App.modelState.selectedIcon) { const size = 60, sticker = { id: 's_' + Date.now(), emoji: App.modelState.selectedIcon, x: x - size / 2, y: y - size / 2, width: size, height: size, rotation: 0 }; App.work.modelStickers.push(sticker); await saveAndBroadcast('modelStickers', App.work.modelStickers); renderModelElements(); App.modelState.selectedItems = [{ type: 'stamp', id: sticker.id }]; renderSelectionOverlay(); }
    else if (App.modelState.currentTool === 'explain') { const point = { id: 'ex_' + Date.now(), x, y, text: '' }; App.work.modelExplanations.push(point); await saveAndBroadcast('modelExplanations', App.work.modelExplanations); renderModelElements(); }
    else if (App.modelState.currentTool === 'pen') App.modelState.currentPath = [{ x, y }];
    else if (App.modelState.currentTool === 'select' && !event.target.closest('.model-node, .model-shape, .note-shape, .model-sticker')) { if (!event.shiftKey) App.modelState.selectedItems = []; renderModelElements(); }
}

export function modelCanvasMouseMove(event) {
    if (!App.modelState.isDrawing) return;
    const coords = getCanvasCoords(event), x = coords.x, y = coords.y;
    if (App.modelState.currentTool === 'pen') {
        App.modelState.currentPath.push({ x, y }); renderModelPaths();
        const svg = document.getElementById('drawingSvg'); if (svg) { const d = App.modelState.currentPath.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' '); let tempPath = svg.querySelector('.temp-path'); if (!tempPath) { tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tempPath.setAttribute('class', 'temp-path'); tempPath.setAttribute('fill', 'none'); svg.appendChild(tempPath); } tempPath.setAttribute('d', d); tempPath.setAttribute('stroke', App.modelState.penColor || '#3b82f6'); tempPath.setAttribute('stroke-width', App.modelState.penWidth || 3); }
    }
}

export async function modelCanvasMouseUp(event) {
    if (!App.modelState.isDrawing) return;
    const coords = getCanvasCoords(event), x = coords.x, y = coords.y;
    if (App.modelState.currentTool === 'pen' && App.modelState.currentPath.length > 1) { const path = { id: 'path_' + Date.now(), points: [...App.modelState.currentPath], color: App.modelState.penColor || '#3b82f6', width: App.modelState.penWidth || 3 }; App.work.modelPaths.push(path); await saveAndBroadcast('modelPaths', App.work.modelPaths); }
    else if (App.modelState.currentTool === 'shape') { const start = App.modelState.shapeStart, width = Math.abs(x - start.x), height = Math.abs(y - start.y), shape = { id: 'shape_' + Date.now(), type: App.modelState.shapeType || 'rectangle', x: Math.min(x, start.x), y: Math.min(y, start.y), width: Math.max(20, width), height: Math.max(20, height), color: App.modelState.penColor || '#3b82f6', rotation: 0 }; App.work.modelShapes.push(shape); await saveAndBroadcast('modelShapes', App.work.modelShapes); }
    App.modelState.isDrawing = false; App.modelState.currentPath = []; const svg = document.getElementById('drawingSvg'); if (svg) { const temp = svg.querySelector('.temp-path'); if (temp) temp.remove(); } renderModelElements();
}

export function toggleToolDrawer() { App.modelState.drawerOpen = !App.modelState.drawerOpen; renderStudentContent(); }
export function toggleToolbarPin() { App.modelState.isToolbarPinned = !App.modelState.isToolbarPinned; renderStudentContent(); }
export function toggleMultiSelect() { App.modelState.isMultiSelectMode = !App.modelState.isMultiSelectMode; renderStudentContent(); }
export function toggleMobileExplanations() { document.getElementById('mobileExplanationPanel')?.classList.toggle('translate-y-full'); }
export async function deleteModelElement(type, id) { if (confirm('Delete this element?')) { App.work[type] = App.work[type].filter(i => i.id !== id); if (type === 'modelNodes' || type === 'modelShapes' || type === 'modelNotes' || type === 'modelStickers') { const targetId = id; App.work.modelConnections = App.work.modelConnections.filter(c => c.from !== targetId && c.to !== targetId); await saveAndBroadcast('modelConnections', App.work.modelConnections); } await saveAndBroadcast(type, App.work[type]); renderStudentContent(); } }
export async function updateNodeColor(id, color) { const node = App.work.modelNodes.find(n => n.id === id); if (node) { node.color = color; await saveAndBroadcast('modelNodes', App.work.modelNodes); renderModelElements(); } }

export function openNodeTagPicker(nodeId) { const node = App.work.modelNodes.find(n => n.id === nodeId); if (!node) return; window.openGenericInput('Tag Concept', 'Enter NGSS Code (e.g. SEP2, PS1.A)...', node.ngssTag || '', async (tag) => { if (tag !== null) { node.ngssTag = tag.toUpperCase().trim(); await saveAndBroadcast('modelNodes', App.work.modelNodes); renderModelElements(); toast(`Tagged as ${node.ngssTag}`, 'success'); } }); }
export async function deleteExplanationPoint(id) { App.work.modelExplanations = App.work.modelExplanations.filter(i => i.id !== id); await saveAndBroadcast('modelExplanations', App.work.modelExplanations); renderStudentContent(); }

export async function openIconPicker() { const modal = document.getElementById('iconPickerModal'); if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); document.getElementById('iconSearchInput')?.focus(); if (!App.availableIconSets || App.availableIconSets.length === 0) await loadIconCollections(); } }
async function loadIconCollections() { try { const res = await fetch('https://api.iconify.design/collections'), data = await res.json(), categories = {}; App.availableIconSets = Object.keys(data).map(prefix => { const set = { prefix, name: data[prefix].name, total: data[prefix].total, category: data[prefix].category || 'Other' }; if (!categories[set.category]) categories[set.category] = []; categories[set.category].push(set); return set; }); App.iconCategories = categories; const catSelect = document.getElementById('iconCategorySelect'); if (catSelect) catSelect.innerHTML = '<option value="">All Categories</option>' + Object.keys(categories).sort().map(cat => `<option value="${cat}">${cat}</option>`).join(''); window.onIconCategoryChange(); } catch (e) { console.error(e); } }
window.onIconCategoryChange = () => { const catSelect = document.getElementById('iconCategorySelect'), prefSelect = document.getElementById('iconPrefixSelect'); if (!catSelect || !prefSelect) return; const category = catSelect.value; let sets = App.availableIconSets || []; if (category) sets = App.iconCategories?.[category] || []; prefSelect.innerHTML = '<option value="">All Collections</option>' + sets.sort((a,b) => b.total - a.total).map(s => `<option value="${s.prefix}">${s.name} (${(s.total/1000).toFixed(1)}k)</option>`).join(''); window.searchIcons(); };
window.clearCollections = () => { const catSelect = document.getElementById('iconCategorySelect'), prefSelect = document.getElementById('iconPrefixSelect'), input = document.getElementById('iconSearchInput'); if (catSelect) catSelect.value = ''; if (prefSelect) prefSelect.value = ''; if (input) input.value = ''; window.onIconCategoryChange(); document.getElementById('iconGrid').innerHTML = ''; document.getElementById('iconResultCount').textContent = '0 icons found'; };
export function closeIconPicker() { const modal = document.getElementById('iconPickerModal'); if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } }
export async function searchIcons() {
    const input = document.getElementById('iconSearchInput'), catSelect = document.getElementById('iconCategorySelect'), prefSelect = document.getElementById('iconPrefixSelect'), grid = document.getElementById('iconGrid'), status = document.getElementById('iconPickerStatus'), countDisplay = document.getElementById('iconResultCount');
    if (!input || !grid) return; const query = input.value.trim(), prefix = prefSelect?.value, category = catSelect?.value;
    if (query.length < 2 && !prefix) { if (query.length === 0 && !category) { grid.innerHTML = ''; if (countDisplay) countDisplay.textContent = '0 icons found'; } return; }
    status?.classList.remove('hidden'); grid.innerHTML = '';
    try {
        let icons = [];
        if (query) {
            const topicExpansion = { 'biology': 'cell nature life dna organism evolution plant animal ecology', 'chemistry': 'molecule atom reaction lab beaker substance periodic', 'physics': 'energy force motion electricity magnet wave particle gravity', 'space': 'planet galaxy star telescope rocket astronaut cosmos moon orbit', 'earth': 'weather climate geology volcano ocean river mountain rock', 'engineering': 'design structure machine robot tools construction blueprint' };
            let searchUrl = query; const lowerQuery = query.toLowerCase();
            for (const [topic, expansion] of Object.entries(topicExpansion)) if (lowerQuery.includes(topic)) { searchUrl += ' ' + expansion; break; }
            let url = `https://api.iconify.design/search?query=${encodeURIComponent(searchUrl)}&limit=150`;
            if (prefix) url += `&prefix=${prefix}`; else if (category && App.iconCategories?.[category]) url += `&prefixes=${App.iconCategories[category].map(s => s.prefix).join(',')}`;
            const response = await fetch(url), data = await response.json(); icons = data.icons || [];
            if (typeof Fuse !== 'undefined' && icons.length > 0) { const fuse = new Fuse(icons, { threshold: 0.4 }); const result = fuse.search(query); if (result.length > 0) icons = result.map(r => r.item); }
        } else if (prefix) { const response = await fetch(`https://api.iconify.design/collection?prefix=${prefix}`), data = await response.json(); if (data.uncategorized) icons = data.uncategorized.slice(0, 150).map(name => `${prefix}:${name}`); else if (data.categories) Object.values(data.categories).forEach(catIcons => { if (icons.length < 150) icons = [...icons, ...catIcons.slice(0, 30).map(name => `${prefix}:${name}`)]; }); }
        if (countDisplay) countDisplay.textContent = `${icons.length} icons found`; status?.classList.add('hidden');
        grid.innerHTML = icons.map(icon => `<button onclick="window.selectIcon('${icon}')" class="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-primary hover:bg-blue-50 transition-all flex flex-col items-center justify-center group gap-1" title="${icon}"><span class="iconify text-3xl text-gray-600 group-hover:text-primary group-hover:scale-110 transition-all" data-icon="${icon}"></span><span class="text-[7px] text-gray-400 uppercase tracking-tighter truncate w-full group-hover:text-primary">${icon.split(':')[0]}</span></button>`).join('');
    } catch { status?.classList.add('hidden'); toast('Search unavailable', 'error'); }
}
export function selectIcon(icon) { App.modelState.selectedIcon = icon; closeIconPicker(); renderStudentContent(); toast(`Icon selected: ${icon.split(':').pop()}`, 'success'); }
export function selectIconForNode(icon) { App.modelState.selectedIcon = icon; renderStudentContent(); }
