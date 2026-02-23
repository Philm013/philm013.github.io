/**
 * @file CaptureService.js
 * @description Annotation and canvas logic for the MarkedUp tool in NexusIDE. 
 * Handles drawing, state management, history, and library persistence.
 */

import { VisualEngine } from './VisualEngine.js';
import { uid } from '../utils.js';

/**
 * Service managing the canvas-based annotation environment.
 */
export class CaptureService {
    /**
     * Creates a new CaptureService instance.
     * @param {AssetService} assetService - The service for handling icon/emoji/image assets.
     */
    constructor(assetService) {
        /** @type {HTMLCanvasElement} */
        this.canvas = document.getElementById('markup-canvas');
        /** @type {CanvasRenderingContext2D} */
        this.ctx = this.canvas.getContext('2d');
        /** @type {HTMLElement} The parent container for scroll and pan management. */
        this.container = document.getElementById('markup-canvas-container');
        this.assets = assetService;
        
        /** @type {string} Current active tool ('select', 'rect', 'circle', 'arrow', 'line', 'text', 'pan'). */
        this.currentTool = 'select';
        /** @type {Array<Object>} List of all capture sessions in the current project. */
        this.sessions = [];
        /** @type {number} The index of the currently active session. */
        this.activeSessionIndex = -1;
        
        this.isDrawing = false;
        this.isDragging = false;
        this.isPanning = false;
        this.startPos = { x: 0, y: 0 };
        this.activeShape = null;
        this.selectedShape = null;
        this.activeHandle = null; // 'nw', 'ne', 'sw', 'se'
        this.activeVertex = null; // 'start', 'end'
        this.pointerCache = [];
        this.lastMidpoint = null;
        /** @type {Map<string, HTMLImageElement>} Local cache for images used in the canvas. */
        this.loadedImages = new Map();
        
        // Undo/Redo History
        /** @type {Array<string>} Array of JSON strings representing session states. */
        this.history = [];
        /** @type {number} Current position in the history array. */
        this.historyIndex = -1;
        
        // Pan/Zoom State
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        
        // Style State
        this.strokeColor = localStorage.getItem('nexus_markup_color') || '#6366f1';
        this.strokeWidth = parseInt(localStorage.getItem('nexus_markup_width')) || 4;

        this.setupListeners();
        this.syncUI();
    }

    /**
     * Gets the currently active capture session object.
     * @returns {Object|null}
     */
    get activeSession() {
        return this.sessions[this.activeSessionIndex] || null;
    }

    /**
     * Captures a DOM element and loads it as the background of a new session.
     * @param {string} elementId - The ID of the element to capture.
     * @returns {Promise<string|null>} The captured data URL if successful.
     */
    async captureElement(elementId) {
        const el = document.getElementById(elementId);
        console.log(`CaptureService: Capturing ${elementId}...`);
        
        try {
            const capturePromise = el ? VisualEngine.renderElement(el) : VisualEngine.captureScreen();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Capture timed out after 10s")), 10000)
            );

            const data = await Promise.race([capturePromise, timeoutPromise]);
            
            if (data) {
                console.log("CaptureService: Success");
                await this.loadIntoCanvas(data);
                return data;
            } else {
                console.warn("CaptureService: No data returned");
            }
        } catch (err) {
            console.error("CaptureService: Capture failed", err);
            if (window.Nexus && window.Nexus.modals) {
                window.Nexus.modals.alert("Capture Error", err.message);
            }
        }
        return null;
    }

    /**
     * Synchronizes local style and zoom variables with DOM inputs.
     * @private
     */
    syncUI() {
        const colorInput = document.getElementById('markup-color');
        if (colorInput) {
            colorInput.value = this.strokeColor;
            colorInput.oninput = (e) => {
                this.strokeColor = e.target.value;
                localStorage.setItem('nexus_markup_color', this.strokeColor);
                if (this.selectedShape) {
                    this.selectedShape.color = this.strokeColor;
                    this.redraw();
                }
            };
        }
        const widthInput = document.getElementById('markup-width');
        if (widthInput) {
            widthInput.value = this.strokeWidth;
            widthInput.oninput = (e) => {
                this.strokeWidth = parseInt(e.target.value);
                localStorage.setItem('nexus_markup_width', this.strokeWidth);
                if (this.selectedShape) {
                    this.selectedShape.width = this.strokeWidth;
                    this.redraw();
                }
            };
        }
        
        const zoomIn = document.getElementById('btn-markup-zoom-in');
        if (zoomIn) zoomIn.onclick = () => this.adjustZoom(0.1);
        
        const zoomOut = document.getElementById('btn-markup-zoom-out');
        if (zoomOut) zoomOut.onclick = () => this.adjustZoom(-0.1);
    }

    /**
     * Creates a new blank capture session.
     * @param {number} [width=800] 
     * @param {number} [height=600] 
     */
    async createNewBlank(width = 800, height = 600) {
        const session = {
            id: Date.now(),
            name: `Untitled ${this.sessions.length + 1}`,
            width, height,
            baseImage: null,
            shapes: []
        };
        this.sessions.push(session);
        this.activeSessionIndex = this.sessions.length - 1;
        this.loadSession(this.activeSessionIndex);
        this.refreshLibraryUI();
    }

    /**
     * Deletes a session from the project.
     * @param {number} index - Index of the session to delete.
     */
    deleteSession(index) {
        if (index >= 0 && index < this.sessions.length) {
            this.sessions.splice(index, 1);
            if (this.activeSessionIndex === index) {
                this.activeSessionIndex = this.sessions.length > 0 ? 0 : -1;
            } else if (this.activeSessionIndex > index) {
                this.activeSessionIndex--;
            }
            if (this.activeSessionIndex !== -1) {
                this.loadSession(this.activeSessionIndex);
            } else {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            this.refreshLibraryUI();
        }
    }

    /**
     * Loads a specific session into the canvas and adjusts zoom to fit.
     * @param {number} index - Index of the session to load.
     */
    loadSession(index) {
        this.activeSessionIndex = index;
        const s = this.activeSession;
        if (!s) return;

        const placeholder = document.getElementById('markup-placeholder');
        if (placeholder) placeholder.classList.add('hidden');

        this.canvas.width = s.width;
        this.canvas.height = s.height;
        this.selectedShape = null;
        
        // Reset History for new session
        this.history = [];
        this.historyIndex = -1;
        this.saveHistory();

        // Auto-fit scale
        let containerWidth = this.container.clientWidth;
        let containerHeight = this.container.clientHeight;

        // Fallback for hidden container (mobile/tabs)
        if (containerWidth === 0) containerWidth = window.innerWidth;
        if (containerHeight === 0) containerHeight = window.innerHeight - 100;

        containerWidth -= 40;
        containerHeight -= 40;

        const scaleW = containerWidth / s.width;
        const scaleH = containerHeight / s.height;
        this.scale = Math.min(1, scaleW, scaleH);
        
        const zoomEl = document.getElementById('markup-zoom-level');
        if (zoomEl) zoomEl.textContent = `${Math.round(this.scale * 100)}%`;

        // Center initially
        this.offset = {
            x: (this.container.clientWidth - s.width * this.scale) / 2,
            y: (this.container.clientHeight - s.height * this.scale) / 2
        };

        this.redraw();
        this.refreshLibraryUI();

        if (window.innerWidth < 768) {
            const aside = document.querySelector('#view-markup aside');
            if (aside) aside.classList.toggle('active');
        }
    }

    /**
     * Records the current session state into the history stack for undo/redo.
     */
    saveHistory() {
        if (!this.activeSession) return;
        // Deep copy shapes
        const state = JSON.stringify(this.activeSession.shapes);
        
        // If we are in the middle of history, clear forward history
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    /** Reverts to the previous state in history. */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.activeSession.shapes = JSON.parse(this.history[this.historyIndex]);
            this.selectedShape = null;
            this.redraw();
            this.renderLayers();
        }
    }

    /** Advances to the next state in history. */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.activeSession.shapes = JSON.parse(this.history[this.historyIndex]);
            this.selectedShape = null;
            this.redraw();
            this.renderLayers();
        }
    }

    /**
     * Loads a data URL image as the background of a new session.
     * @param {string} dataUrl 
     * @returns {Promise<void>}
     */
    async loadIntoCanvas(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const session = {
                    id: Date.now(),
                    name: `Capture ${this.sessions.length + 1}`,
                    width: img.width,
                    height: img.height,
                    baseImage: img,
                    shapes: []
                };
                this.sessions.push(session);
                this.activeSessionIndex = this.sessions.length - 1;
                this.loadSession(this.activeSessionIndex);
                resolve();
            };
            img.onerror = () => reject(new Error("Failed to load image."));
        });
    }

    /** Clones the currently selected shape. */
    duplicateShape() {
        if (!this.selectedShape || !this.activeSession) return;
        const copy = { ...this.selectedShape, id: uid(), x: this.selectedShape.x + 20, y: this.selectedShape.y + 20 };
        this.activeSession.shapes.push(copy);
        this.selectedShape = copy;
        this.saveHistory();
        this.redraw();
        this.renderLayers();
        this.showFloatingToolbar();
    }

    /** Removes the currently selected shape from the session. */
    deleteSelectedShape() {
        if (!this.selectedShape || !this.activeSession) return;
        this.activeSession.shapes = this.activeSession.shapes.filter(s => s !== this.selectedShape);
        this.selectedShape = null;
        this.saveHistory();
        this.hideFloatingToolbar();
        this.redraw();
        this.renderLayers();
    }

    /** Displays the floating action toolbar near the selected shape. */
    showFloatingToolbar() {
        let toolbar = document.getElementById('markup-floating-toolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'markup-floating-toolbar';
            toolbar.className = 'fixed z-[1000] bg-white border border-slate-200 rounded-full shadow-2xl p-1 flex gap-1 transform -translate-x-1/2 -translate-y-full mt-[-20px] transition-all';
            toolbar.innerHTML = `
                <button id="btn-markup-float-dup" class="w-8 h-8 rounded-full hover:bg-indigo-50 text-indigo-600 flex items-center justify-center transition-colors" title="Duplicate (Ctrl+D)"><i class="fa-solid fa-copy"></i></button>
                <button id="btn-markup-float-del" class="w-8 h-8 rounded-full hover:bg-red-50 text-red-600 flex items-center justify-center transition-colors" title="Delete (Del)"><i class="fa-solid fa-trash-can"></i></button>
                <div class="w-px h-4 bg-slate-200 self-center mx-1"></div>
                <button id="btn-markup-float-up" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors" title="Bring Forward"><i class="fa-solid fa-layer-group" style="transform: scaleY(-1)"></i></button>
                <button id="btn-markup-float-down" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors" title="Send Backward"><i class="fa-solid fa-layer-group"></i></button>
            `;
            document.body.appendChild(toolbar);
            
            document.getElementById('btn-markup-float-dup').onclick = () => this.duplicateShape();
            document.getElementById('btn-markup-float-del').onclick = () => this.deleteSelectedShape();
            document.getElementById('btn-markup-float-up').onclick = () => {
                if (!this.selectedShape) return;
                const idx = this.activeSession.shapes.indexOf(this.selectedShape);
                if (idx < this.activeSession.shapes.length - 1) {
                    this.activeSession.shapes.splice(idx, 1);
                    this.activeSession.shapes.splice(idx + 1, 0, this.selectedShape);
                    this.redraw();
                    this.renderLayers();
                }
            };
            document.getElementById('btn-markup-float-down').onclick = () => {
                if (!this.selectedShape) return;
                const idx = this.activeSession.shapes.indexOf(this.selectedShape);
                if (idx > 0) {
                    this.activeSession.shapes.splice(idx, 1);
                    this.activeSession.shapes.splice(idx - 1, 0, this.selectedShape);
                    this.redraw();
                    this.renderLayers();
                }
            };
        }

        const s = this.selectedShape;
        const canvasRect = this.canvas.getBoundingClientRect();
        const screenX = canvasRect.left + (s.x + s.w/2) * (canvasRect.width / this.canvas.width);
        const screenY = canvasRect.top + Math.min(s.y, s.y + s.h) * (canvasRect.height / this.canvas.height);

        toolbar.style.left = `${screenX}px`;
        toolbar.style.top = `${screenY}px`;
        toolbar.classList.remove('hidden', 'opacity-0');
    }

    /** Hides the floating action toolbar. */
    hideFloatingToolbar() {
        const toolbar = document.getElementById('markup-floating-toolbar');
        if (toolbar) toolbar.classList.add('hidden', 'opacity-0');
    }

    /** Sets up DOM event listeners for canvas interaction and shortcuts. */
    setupListeners() {
        this.canvas.onpointerdown = (e) => this.handlePointerDown(e);
        this.canvas.onpointermove = (e) => this.handlePointerMove(e);
        this.canvas.onpointerup = (e) => this.handlePointerUp(e);
        this.canvas.onpointercancel = (e) => this.handlePointerUp(e);
        
        this.container.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.adjustZoom(delta, e.clientX, e.clientY);
        };

        window.addEventListener('keydown', (e) => {
            if (window.Nexus?.state.view !== 'markup') return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedShape && !e.target.matches('input, textarea')) {
                    this.deleteSelectedShape();
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                if (this.selectedShape) this.duplicateShape();
            }
        });

        document.querySelectorAll('.markup-tool-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.markup-tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.selectedShape = null;
                this.hideFloatingToolbar();
                this.redraw();
            };
        });

        const newBlankBtn = document.getElementById('btn-markup-new-blank');
        if (newBlankBtn) newBlankBtn.onclick = () => this.createNewBlank();

        const layersBtn = document.getElementById('btn-markup-layers');
        if (layersBtn) layersBtn.onclick = () => this.toggleLayers();

        const closeLayersBtn = document.getElementById('btn-markup-close-layers');
        if (closeLayersBtn) closeLayersBtn.onclick = () => this.toggleLayers(false);
    }

    /**
     * Adjusts the canvas zoom level.
     * @param {number} delta - The change in scale.
     * @param {number|null} centerX - Screen X to zoom toward.
     * @param {number|null} centerY - Screen Y to zoom toward.
     */
    adjustZoom(delta, centerX = null, centerY = null) {
        const oldScale = this.scale;
        const newScale = Math.max(0.1, Math.min(10, this.scale + delta));
        
        if (centerX !== null && centerY !== null) {
            const rect = this.container.getBoundingClientRect();
            const lx = centerX - rect.left;
            const ly = centerY - rect.top;
            
            // Adjust offset to keep point under mouse
            this.offset.x = lx - (lx - this.offset.x) * (newScale / oldScale);
            this.offset.y = ly - (ly - this.offset.y) * (newScale / oldScale);
        }
        
        this.scale = newScale;
        const zoomEl = document.getElementById('markup-zoom-level');
        if (zoomEl) zoomEl.textContent = `${Math.round(this.scale * 100)}%`;
        this.applyConstraints();
        this.redraw();
    }

    /** Ensures the canvas doesn't pan too far away from the visible area. */
    applyConstraints() {
        if (!this.activeSession) return;
        const padding = 25;
        const imgW = this.activeSession.width * this.scale;
        const imgH = this.activeSession.height * this.scale;
        const viewW = this.container.clientWidth;
        const viewH = this.container.clientHeight;

        const minX = padding - imgW;
        const maxX = viewW - padding;
        const minY = padding - imgH;
        const maxY = viewH - padding;

        this.offset.x = Math.max(minX, Math.min(maxX, this.offset.x));
        this.offset.y = Math.max(minY, Math.min(maxY, this.offset.y));
    }

    /** Toggles the visibility of the layers panel. */
    toggleLayers(show = null) {
        const panel = document.getElementById('markup-layers-panel');
        if (!panel) return;
        const isVisible = !panel.classList.contains('hidden');
        const shouldShow = show !== null ? show : !isVisible;
        panel.classList.toggle('hidden', !shouldShow);
        if (shouldShow) this.renderLayers();
    }

    /** Renders the list of session shapes into the layers panel. */
    renderLayers() {
        const list = document.getElementById('markup-layers-list');
        if (!list || !this.activeSession) return;

        list.innerHTML = this.activeSession.shapes.slice().reverse().map(s => `
            <div class="p-2 flex items-center justify-between rounded hover:bg-slate-800 transition-colors cursor-pointer group ${s === this.selectedShape ? 'bg-indigo-600/20 border border-indigo-500/30' : ''}" data-id="${s.id}">
                <div class="flex items-center gap-2 overflow-hidden">
                    <div class="w-4 h-4 flex items-center justify-center text-[10px] bg-slate-900 rounded text-indigo-400">
                        ${this.getShapeIcon(s)}
                    </div>
                    <div class="text-[9px] font-bold text-slate-300 truncate">${this.getShapeName(s)}</div>
                </div>
                <button class="btn-delete-layer opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 p-1" data-id="${s.id}">
                    <i class="fa-solid fa-trash-can text-[8px]"></i>
                </button>
            </div>
        `).join('');

        list.querySelectorAll('[data-id]').forEach(el => {
            if (el.tagName === 'DIV') {
                el.onclick = () => {
                    const id = el.dataset.id;
                    this.selectedShape = this.activeSession.shapes.find(s => s.id === id);
                    this.redraw();
                    this.renderLayers();
                };
            }
        });

        list.querySelectorAll('.btn-delete-layer').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.activeSession.shapes = this.activeSession.shapes.filter(s => s.id !== id);
                if (this.selectedShape?.id === id) this.selectedShape = null;
                this.redraw();
                this.renderLayers();
            };
        });
    }

    /** @private */
    getShapeIcon(s) {
        if (s.type === 'rect') return '□';
        if (s.type === 'circle') return '○';
        if (s.type === 'line') return '/';
        if (s.type === 'arrow') return '→';
        if (s.type === 'text') return 'T';
        if (s.type === 'icon') return '⚡';
        if (s.type === 'emoji') return '😀';
        if (s.type === 'image') return '🖼️';
        return '?';
    }

    /** @private */
    getShapeName(s) {
        if (s.type === 'text') return s.text || 'Untitled Text';
        if (s.type === 'icon') return s.iconData.name;
        if (s.type === 'emoji') return s.emoji;
        return s.type.charAt(0).toUpperCase() + s.type.slice(1);
    }

    /** 
     * Converts a screen pointer event into normalized canvas world coordinates. 
     * @private
     */
    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldX = (screenX * (this.canvas.width / rect.width));
        const worldY = (screenY * (this.canvas.height / rect.height));
        return { x: worldX, y: worldY };
    }

    /** @private */
    findVertexAt(x, y, s) {
        const h = 20; // Handle hit size
        if (s.type === 'line' || s.type === 'arrow') {
            if (x >= s.x - h && x <= s.x + h && y >= s.y - h && y <= s.y + h) return 'start';
            if (x >= s.x + s.w - h && x <= s.x + s.w + h && y >= s.y + s.h - h && y <= s.y + s.h + h) return 'end';
        }
        return null;
    }

    /** @private */
    handlePointerDown(e) {
        this.pointerCache = this.pointerCache || [];
        this.pointerCache.push(e);
        
        const pos = this.getPos(e);
        this.startPos = pos;

        if (this.pointerCache.length === 2) {
            this.isDrawing = false;
            this.activeShape = null;
            this.isDragging = false;
            
            const p = this.pointerCache;
            this.initialPinchDistance = Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY);
            this.initialPinchScale = this.scale;
            this.lastMidpoint = {
                x: (p[0].clientX + p[1].clientX) / 2,
                y: (p[0].clientY + p[1].clientY) / 2
            };
            return;
        }

        if (this.currentTool === 'pan' || e.button === 1) {
            this.isPanning = true;
            this.lastScreenPos = { x: e.clientX, y: e.clientY };
            return;
        }

        if (this.currentTool === 'select') {
            if (this.selectedShape) {
                const vertex = this.findVertexAt(pos.x, pos.y, this.selectedShape);
                if (vertex) {
                    this.activeVertex = vertex;
                    this.hideFloatingToolbar();
                    return;
                }

                this.activeHandle = this.findHandleAt(pos.x, pos.y, this.selectedShape);
                if (this.activeHandle) {
                    this.hideFloatingToolbar();
                    return;
                }
            }

            const s = this.findShapeAt(pos.x, pos.y);
            if (s) {
                this.selectedShape = s;
                this.isDragging = true;
                this.showFloatingToolbar();
                
                if (s.color) {
                    this.strokeColor = s.color;
                    const colorInput = document.getElementById('markup-color');
                    if (colorInput) colorInput.value = s.color;
                }
                if (s.width) {
                    this.strokeWidth = s.width;
                    const widthInput = document.getElementById('markup-width');
                    if (widthInput) widthInput.value = s.width;
                }
            } else {
                this.selectedShape = null;
                this.hideFloatingToolbar();
            }
            this.redraw();
            return;
        }

        if (this.activeSession) {
            this.isDrawing = true;
            this.hideFloatingToolbar();
            this.activeShape = {
                id: uid(),
                type: this.currentTool,
                x: pos.x, y: pos.y,
                w: 0, h: 0,
                color: this.strokeColor,
                width: this.strokeWidth,
                text: ''
            };
        }
    }

    /** @private */
    handlePointerMove(e) {
        this.pointerCache = this.pointerCache || [];
        const index = this.pointerCache.findIndex(ev => ev.pointerId === e.pointerId);
        if (index > -1) this.pointerCache[index] = e;

        if (this.pointerCache.length === 2) {
            const p = this.pointerCache;
            const currentMidX = (p[0].clientX + p[1].clientX) / 2;
            const currentMidY = (p[0].clientY + p[1].clientY) / 2;
            
            if (this.lastMidpoint) {
                this.offset.x += currentMidX - this.lastMidpoint.x;
                this.offset.y += currentMidY - this.lastMidpoint.y;
            }
            this.lastMidpoint = { x: currentMidX, y: currentMidY };

            const dist = Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY);
            if (this.initialPinchDistance > 0) {
                const ratio = dist / this.initialPinchDistance;
                const newScale = this.initialPinchScale * ratio;
                const delta = newScale - this.scale;
                this.adjustZoom(delta, currentMidX, currentMidY);
            }
            
            this.applyConstraints();
            this.hideFloatingToolbar();
            this.redraw();
            return;
        }

        const pos = this.getPos(e);
        const dx = pos.x - this.startPos.x;
        const dy = pos.y - this.startPos.y;

        if (this.isPanning) {
            this.offset.x += e.clientX - this.lastScreenPos.x;
            this.offset.y += e.clientY - this.lastScreenPos.y;
            this.lastScreenPos = { x: e.clientX, y: e.clientY };
            this.applyConstraints();
            this.hideFloatingToolbar();
            this.redraw();
            return;
        }

        if (this.activeVertex && this.selectedShape) {
            if (this.activeVertex === 'start') {
                this.selectedShape.x += dx;
                this.selectedShape.y += dy;
                this.selectedShape.w -= dx;
                this.selectedShape.h -= dy;
            } else {
                this.selectedShape.w += dx;
                this.selectedShape.h += dy;
            }
            this.startPos = pos;
            this.redraw();
            return;
        }

        if (this.activeHandle && this.selectedShape) {
            this.resizeShape(this.selectedShape, this.activeHandle, dx, dy);
            this.startPos = pos;
            this.redraw();
            return;
        }

        if (this.isDragging && this.selectedShape) {
            this.selectedShape.x += dx;
            this.selectedShape.y += dy;
            this.startPos = pos;
            this.showFloatingToolbar();
            this.redraw();
            return;
        }

        if (this.isDrawing && this.activeShape) {
            this.activeShape.w = pos.x - this.activeShape.x;
            this.activeShape.h = pos.y - this.activeShape.y;
            this.redraw();
        }
    }

    /** @private */
    handlePointerUp(e) {
        this.pointerCache = this.pointerCache || [];
        const index = this.pointerCache.findIndex(ev => ev.pointerId === e.pointerId);
        if (index > -1) this.pointerCache.splice(index, 1);
        
        if (this.pointerCache.length < 2) {
            this.initialPinchDistance = 0;
            this.lastMidpoint = null;
        }

        this.isPanning = false;
        const wasResizing = !!(this.activeHandle || this.activeVertex);
        const wasDragging = this.isDragging;
        const wasDrawing = this.isDrawing;

        this.activeHandle = null;
        this.activeVertex = null;
        this.isDragging = false;
        
        if (wasDrawing) {
            this.isDrawing = false;
            if (this.activeShape.type === 'text') {
                this.finishText(this.activeShape);
            } else if (Math.abs(this.activeShape.w) > 5 || Math.abs(this.activeShape.h) > 5) {
                this.activeSession.shapes.push(this.activeShape);
                this.selectedShape = this.activeShape;
                this.saveHistory();
                this.showFloatingToolbar();
                this.renderLayers();
            }
            this.activeShape = null;
        } else if (this.selectedShape) {
            if (wasResizing || wasDragging) {
                this.saveHistory();
            }
            this.showFloatingToolbar();
        }
        
        this.redraw();
    }

    /** 
     * Completes a text annotation by prompting the user for input. 
     * @private
     */
    async finishText(shape) {
        const text = await window.Nexus.modals.prompt("Text Annotation", "Enter text:", "");
        if (text) {
            shape.text = text;
            this.activeSession.shapes.push(shape);
            this.saveHistory();
            this.redraw();
            this.renderLayers();
        }
    }

    /**
     * Adds an external asset (icon, emoji, image) to the canvas.
     * @param {Object} asset - Asset definition.
     */
    async addAsset(asset) {
        if (!this.activeSession) {
            await this.createNewBlank();
        }
        
        const shape = {
            id: uid(),
            type: asset.type,
            x: 50, y: 50,
            w: 100, h: 100,
            color: this.strokeColor,
            width: this.strokeWidth,
            selected: true
        };

        if (asset.type === 'icon') {
            shape.iconData = asset.data;
        } else if (asset.type === 'emoji') {
            shape.emoji = asset.data;
        } else if (asset.type === 'image') {
            shape.imageData = asset.data;
        } else if (asset.type === 'code') {
            shape.type = 'text';
            shape.text = asset.data;
        }

        this.activeSession.shapes.push(shape);
        this.selectedShape = shape;
        this.saveHistory();
        this.redraw();
        this.renderLayers();
    }

    /** @private */
    resizeShape(s, handle, dx, dy) {
        if (handle === 'nw') { s.x += dx; s.y += dy; s.w -= dx; s.h -= dy; }
        else if (handle === 'ne') { s.y += dy; s.w += dx; s.h -= dy; }
        else if (handle === 'sw') { s.x += dx; s.w -= dx; s.h += dy; }
        else if (handle === 'se') { s.w += dx; s.h += dy; }
    }

    /** @private */
    findHandleAt(x, y, s) {
        const h = 30; // Handle size
        const corners = {
            nw: { x: s.x, y: s.y },
            ne: { x: s.x + s.w, y: s.y },
            sw: { x: s.x, y: s.y + s.h },
            se: { x: s.x + s.w, y: s.y + s.h }
        };
        for (const [id, p] of Object.entries(corners)) {
            if (x >= p.x - h && x <= p.x + h && y >= p.y - h && y <= p.y + h) return id;
        }
        return null;
    }

    /** @private */
    findShapeAt(x, y) {
        if (!this.activeSession) return null;
        // Search top-down (reverse order)
        const tolerance = 10;
        return [...this.activeSession.shapes].reverse().find(s => {
            const x1 = Math.min(s.x, s.x + s.w) - tolerance;
            const x2 = Math.max(s.x, s.x + s.w) + tolerance;
            const y1 = Math.min(s.y, s.y + s.h) - tolerance;
            const y2 = Math.max(s.y, s.y + s.h) + tolerance;
            
            // Special hit test for lines/arrows
            if (s.type === 'line' || s.type === 'arrow') {
                const dist = this.distToSegment({x, y}, {x: s.x, y: s.y}, {x: s.x + s.w, y: s.y + s.h});
                return dist < 15;
            }
            
            return x >= x1 && x <= x2 && y >= y1 && y <= y2;
        });
    }

    /** @private */
    distToSegment(p, v, w) {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    /** Main rendering loop for the canvas. */
    redraw() {
        const s = this.activeSession;
        const placeholder = document.getElementById('markup-placeholder');
        
        if (!s) {
            if (placeholder) placeholder.classList.remove('hidden');
            this.canvas.classList.add('hidden');
            return;
        }

        if (placeholder) placeholder.classList.add('hidden');
        this.canvas.classList.remove('hidden');

        // Apply transform to the canvas element itself for GPU acceleration
        this.canvas.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.scale})`;

        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (s.baseImage) this.ctx.drawImage(s.baseImage, 0, 0);

        s.shapes.forEach(shape => this.drawShape(shape, shape === this.selectedShape));
        if (this.activeShape) this.drawShape(this.activeShape, false);
        this.ctx.restore();
    }

    /** @private */
    drawShape(s, isSelected) {
        this.ctx.strokeStyle = s.color || this.strokeColor;
        this.ctx.fillStyle = s.color || this.strokeColor;
        this.ctx.lineWidth = s.width || this.strokeWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        if (s.type === 'rect') this.ctx.strokeRect(s.x, s.y, s.w, s.h);
        else if (s.type === 'circle') {
            this.ctx.beginPath();
            this.ctx.ellipse(s.x + s.w/2, s.y + s.h/2, Math.abs(s.w/2), Math.abs(s.h/2), 0, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (s.type === 'line') {
            this.ctx.beginPath();
            this.ctx.moveTo(s.x, s.y);
            this.ctx.lineTo(s.x + s.w, s.y + s.h);
            this.ctx.stroke();
        } else if (s.type === 'arrow') {
            this.drawArrow(s.x, s.y, s.x + s.w, s.y + s.h, s.width || this.strokeWidth);
        } else if (s.type === 'text') {
            const fontSize = 32 * (this.canvas.width / 1000);
            this.ctx.font = `bold ${fontSize}px sans-serif`;
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(s.text, s.x, s.y);
        } else if (s.type === 'icon') {
            const size = Math.abs(s.w) || 48;
            const imgKey = `${s.iconData.fullName || s.iconData.name}_${s.color || '#6366f1'}`;
            const cached = this.loadedImages.get(imgKey);
            if (cached) {
                this.ctx.drawImage(cached, s.x, s.y, size, size);
            } else {
                this.assets.getIconImage(s.iconData, s.color || '#6366f1').then(img => {
                    if (img) {
                        this.loadedImages.set(imgKey, img);
                        this.redraw();
                    }
                });
            }
        } else if (s.type === 'emoji') {
            const size = Math.abs(s.w) || 48;
            this.ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(s.emoji, s.x, s.y);
        } else if (s.type === 'image') {
            const sizeW = Math.abs(s.w) || 100;
            const sizeH = Math.abs(s.h) || 100;
            const imgKey = `img_${s.id}`;
            const cached = this.loadedImages.get(imgKey);
            if (cached) {
                this.ctx.drawImage(cached, s.x, s.y, sizeW, sizeH);
            } else {
                const img = new Image();
                img.src = s.imageData;
                img.onload = () => {
                    this.loadedImages.set(imgKey, img);
                    this.redraw();
                };
            }
        }

        if (isSelected) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            
            if (s.type === 'line' || s.type === 'arrow') {
                // No bounding box for lines/arrows, just handles
            } else {
                this.ctx.strokeRect(s.x - 4, s.y - 4, s.w + 8, s.h + 8);
            }
            this.ctx.setLineDash([]);
            
            // Draw handles
            const h = 16;
            this.ctx.fillStyle = '#fff';
            this.ctx.strokeStyle = '#6366f1';
            
            const handles = [];
            
            if (s.type === 'line' || s.type === 'arrow') {
                handles.push([s.x, s.y]);
                handles.push([s.x + s.w, s.y + s.h]);
            } else {
                handles.push([s.x, s.y], [s.x + s.w, s.y], [s.x, s.y + s.h], [s.x + s.w, s.y + s.h]);
            }

            handles.forEach(p => {
                this.ctx.beginPath();
                this.ctx.arc(p[0], p[1], h/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            });
        }
    }

    /** @private */
    drawArrow(x1, y1, x2, y2, weight) {
        const headlen = 10 * weight;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI/6), y2 - headlen * Math.sin(angle - Math.PI/6));
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI/6), y2 - headlen * Math.sin(angle + Math.PI/6));
        this.ctx.stroke();
    }

    /** Refreshes the session library sidebar view. */
    refreshLibraryUI() {
        const list = document.getElementById('markup-library-list');
        if (!list) return;
        list.innerHTML = this.sessions.map((s, i) => `
            <div class="p-2 rounded border cursor-pointer transition-all ${i === this.activeSessionIndex ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400'}" onclick="Nexus.capture.loadSession(${i})">
                <div class="text-[10px] font-bold truncate">${s.name}</div>
                <div class="text-[8px] opacity-50">${s.shapes.length} annotations</div>
            </div>
        `).join('');
    }

    /** 
     * Generates a flattened PNG image of the current session including all annotations. 
     * @returns {string} Data URL.
     */
    getAnnotatedData() {
        return this.canvas.toDataURL('image/png');
    }
}
