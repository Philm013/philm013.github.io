/**
 * LiveDeck - WYSIWYG Canvas Editor Module (V4)
 * 
 * Handles rendering blocks on a visual canvas, drag-and-drop, resizing, 
 * snapping, and inline editing.
 */

const editor = {
    canvasEl: null,
    wrapperEl: null,
    slides: [],
    currentSlideBlocks: [],
    selectedBlockId: null,
    isDragging: false,
    isResizing: false,
    dragOffset: { x: 0, y: 0 },
    scale: 1,
    guides: [],

    init() {
        this.wrapperEl = document.getElementById('preview-wrapper');
        this.canvasEl = document.getElementById('preview-frame');
        
        // Ensure parser is ready
        this.parseDeck();
        this.bindEvents();
        this.renderCanvas();

        // Initial scale update
        setTimeout(() => this.updateScale(), 100);
        window.addEventListener('resize', () => this.updateScale());
    },

    parseDeck() {
        this.slides = parser.parseDeck(app.state.currentDeck.content);
        if (this.slides.length === 0) {
            this.slides.push({ id: 'slide-0', blocks: [] });
        }
        
        const currentIdx = Math.min(app.state.currentSlide, this.slides.length - 1);
        this.currentSlideBlocks = this.slides[currentIdx].blocks;
    },

    syncToState() {
        // Serialize current slide blocks back to the slides array
        const currentIdx = app.state.currentSlide;
        if(this.slides[currentIdx]) {
            this.slides[currentIdx].blocks = this.currentSlideBlocks;
        }
        
        // Serialize all to markdown
        app.state.currentDeck.content = parser.serializeDeck(this.slides);
        app.saveToStorage();
    },

    renderCanvas() {
        if (!this.canvasEl) return;
        this.parseDeck(); // Refresh blocks from state
        this.canvasEl.innerHTML = '';
        this.canvasEl.className = 'slide-content shadow-[0_0_50px_-12px_rgba(0,0,0,0.3)] rounded-2xl';
        
        // Background/Grid style for editor mode
        this.canvasEl.style.backgroundSize = '100px 100px';
        this.canvasEl.style.backgroundImage = 'linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)';

        this.currentSlideBlocks.forEach(block => {
            const html = components.renderBlock(block);
            this.canvasEl.insertAdjacentHTML('beforeend', html);
        });

        this.bindBlockEvents();
        this.highlightSelected();
        ui.updateNavigator(this.slides);
    },

    bindEvents() {
        // Deselect when clicking outside blocks on the canvas
        this.canvasEl.addEventListener('mousedown', (e) => {
            if (e.target === this.canvasEl) {
                this.selectedBlockId = null;
                this.highlightSelected();
            }
        });

        // Global mouse moves for drag/resize
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());

        // Touch support
        window.addEventListener('touchmove', (e) => {
            if (this.isDragging || this.isResizing) e.preventDefault();
            this.handleMouseMove(e.touches[0]);
        }, { passive: false });
        window.addEventListener('touchend', () => this.handleMouseUp());
        
        // Delete selected block
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedBlockId) {
                this.deleteBlock(this.selectedBlockId);
            }
        });
    },

    bindBlockEvents() {
        const blocks = this.canvasEl.querySelectorAll('.component-block');
        blocks.forEach(el => {
            el.addEventListener('mousedown', (e) => this.handleBlockMouseDown(e, el));
            el.addEventListener('touchstart', (e) => {
                this.handleBlockMouseDown(e, el);
            }, { passive: false });
            el.addEventListener('dblclick', (e) => this.handleBlockDblClick(e, el));
        });
    },

    handleBlockMouseDown(e, el) {
        if (e.stopPropagation) e.stopPropagation();
        
        // Strip the context prefix to get the raw block ID for state management
        const rawId = el.id.replace('canvas-', '');
        this.selectedBlockId = rawId;
        this.highlightSelected();

        const rect = el.getBoundingClientRect();
        const canvasRect = this.canvasEl.getBoundingClientRect();

        // Handle Touch vs Mouse coordinates
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Check if clicking resize handle
        if (e.target.classList.contains('resize-handle')) {
            this.isResizing = true;
            this.resizeHandle = e.target.dataset.dir;
            return;
        }

        this.isDragging = true;
        
        // Accurate offset within the scaled component
        this.dragOffset = {
            x: (clientX - rect.left) / this.scale,
            y: (clientY - rect.top) / this.scale
        };
    },

    handleMouseMove(e) {
        if (!e || (!this.isDragging && !this.isResizing)) return;
        if (!this.selectedBlockId) return;

        // Use prefixed ID to manipulate DOM
        const el = document.getElementById('canvas-' + this.selectedBlockId);
        const block = this.currentSlideBlocks.find(b => b.id === this.selectedBlockId);
        if (!el || !block) return;

        const canvasRect = this.canvasEl.getBoundingClientRect();
        const maxX = 1920;
        const maxY = 1080;
        const gridSnapSize = 50;
        const edgeSnapThreshold = 15;
        
        if (this.isDragging) {
            let newX = ((e.clientX - canvasRect.left) / this.scale) - this.dragOffset.x;
            let newY = ((e.clientY - canvasRect.top) / this.scale) - this.dragOffset.y;

            this.clearAlignmentGuides();

            // Edge Alignment (Smart Guides)
            if (app.state.smartAlignment) {
                const myLeft = newX;
                const myRight = newX + block.w;
                const myTop = newY;
                const myBottom = newY + block.h;
                const myCenterX = newX + (block.w / 2);
                const myCenterY = newY + (block.h / 2);

                this.currentSlideBlocks.forEach(other => {
                    if (other.id === block.id) return;

                    const oLeft = other.x;
                    const oRight = other.x + other.w;
                    const oTop = other.y;
                    const oBottom = other.y + other.h;
                    const oCenterX = other.x + (other.w / 2);
                    const oCenterY = other.y + (other.h / 2);

                    // Vertical Aligns (Snap X)
                    if (Math.abs(myLeft - oLeft) < edgeSnapThreshold) { newX = oLeft; this.showAlignmentGuide('v', oLeft); }
                    else if (Math.abs(myRight - oRight) < edgeSnapThreshold) { newX = oRight - block.w; this.showAlignmentGuide('v', oRight); }
                    else if (Math.abs(myLeft - oRight) < edgeSnapThreshold) { newX = oRight; this.showAlignmentGuide('v', oRight); }
                    else if (Math.abs(myRight - oLeft) < edgeSnapThreshold) { newX = oLeft - block.w; this.showAlignmentGuide('v', oLeft); }
                    else if (Math.abs(myCenterX - oCenterX) < edgeSnapThreshold) { newX = oCenterX - (block.w / 2); this.showAlignmentGuide('v', oCenterX); }

                    // Horizontal Aligns (Snap Y)
                    if (Math.abs(myTop - oTop) < edgeSnapThreshold) { newY = oTop; this.showAlignmentGuide('h', oTop); }
                    else if (Math.abs(myBottom - oBottom) < edgeSnapThreshold) { newY = oBottom - block.h; this.showAlignmentGuide('h', oBottom); }
                    else if (Math.abs(myTop - oBottom) < edgeSnapThreshold) { newY = oBottom; this.showAlignmentGuide('h', oBottom); }
                    else if (Math.abs(myBottom - oTop) < edgeSnapThreshold) { newY = oTop - block.h; this.showAlignmentGuide('h', oTop); }
                    else if (Math.abs(myCenterY - oCenterY) < edgeSnapThreshold) { newY = oCenterY - (block.h / 2); this.showAlignmentGuide('h', oCenterY); }
                });

                // Canvas Center Snapping
                if (Math.abs(myCenterX - 960) < edgeSnapThreshold) { newX = 960 - (block.w / 2); this.showAlignmentGuide('v', 960); }
                if (Math.abs(myCenterY - 540) < edgeSnapThreshold) { newY = 540 - (block.h / 2); this.showAlignmentGuide('h', 540); }
            }

            // Standard Grid Snapping (if not aligned by edges or if preferred)
            if (app.state.gridSnapping && !this.guides.length) {
                newX = Math.round(newX / gridSnapSize) * gridSnapSize;
                newY = Math.round(newY / gridSnapSize) * gridSnapSize;
            }

            // Boundary Constraints
            block.x = Math.max(0, Math.min(newX, maxX - (block.w || 100)));
            block.y = Math.max(0, Math.min(newY, maxY - (block.h || 100)));
            
            el.style.left = `${block.x}px`;
            el.style.top = `${block.y}px`;
            el.classList.add('is-moving');
        }

        if (this.isResizing) {
            let newW = ((e.clientX - canvasRect.left) / this.scale) - block.x;
            let newH = ((e.clientY - canvasRect.top) / this.scale) - block.y;

            if (app.state.gridSnapping) {
                newW = Math.round(newW / gridSnapSize) * gridSnapSize;
                newH = Math.round(newH / gridSnapSize) * gridSnapSize;
            }

            // Boundary Constraints for Resize
            block.w = Math.max(100, Math.min(newW, maxX - block.x));
            block.h = Math.max(100, Math.min(newH, maxY - block.y));
            
            el.style.width = `${block.w}px`;
            el.style.height = `${block.h}px`;
            el.classList.add('is-resizing');
        }
    },

    handleMouseUp() {
        if (this.isDragging || this.isResizing) {
            const el = document.getElementById('canvas-' + this.selectedBlockId);
            if (el) el.classList.remove('is-moving', 'is-resizing');
            this.clearAlignmentGuides();
            this.syncToState();
        }
        this.isDragging = false;
        this.isResizing = false;
    },

    showAlignmentGuide(type, pos) {
        const guideEl = document.createElement('div');
        guideEl.className = `alignment-guide absolute bg-indigo-500/50 z-[100] pointer-events-none`;
        if (type === 'v') {
            guideEl.style.width = '2px';
            guideEl.style.height = '100%';
            guideEl.style.left = `${pos}px`;
            guideEl.style.top = '0';
        } else {
            guideEl.style.width = '100%';
            guideEl.style.height = '2px';
            guideEl.style.top = `${pos}px`;
            guideEl.style.left = '0';
        }
        this.canvasEl.appendChild(guideEl);
        this.guides.push(guideEl);
    },

    clearAlignmentGuides() {
        this.guides.forEach(g => g.remove());
        this.guides = [];
    },

    handleBlockDblClick(e, el) {
        const rawId = el.id.replace('canvas-', '');
        ui.editBlock(rawId);
    },

    highlightSelected() {
        const blocks = this.canvasEl.querySelectorAll('.component-block');
        blocks.forEach(el => {
            const rawId = el.id.replace('canvas-', '');
            if (rawId === this.selectedBlockId) {
                el.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-4', 'z-50');
                this.addResizeHandles(el);
                this.addBlockToolbar(el, rawId);
            } else {
                el.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-4', 'z-50');
                this.removeResizeHandles(el);
                this.removeBlockToolbar(el);
            }
        });
        ui.updateContextualToolbar(this.selectedBlockId);
    },

    addBlockToolbar(el, rawId) {
        if(window.innerWidth < 768) return; // Use mobile tray instead
        if(el.querySelector('.block-toolbar')) return;
        const toolbar = document.createElement('div');
        toolbar.className = 'block-toolbar absolute -top-12 left-0 flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-2xl border dark:border-slate-700 z-[60]';
        toolbar.innerHTML = `
            <button onclick="ui.editBlock('${rawId}')" class="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg transition-colors" title="Edit">
                <span class="iconify" data-icon="mdi:pencil"></span>
            </button>
            <button onclick="editor.duplicateBlock('${rawId}')" class="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg transition-colors" title="Duplicate">
                <span class="iconify" data-icon="mdi:content-copy"></span>
            </button>
            <div class="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button onclick="editor.deleteBlock('${rawId}')" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-600 dark:text-slate-300 hover:text-red-600 rounded-lg transition-colors" title="Delete">
                <span class="iconify" data-icon="mdi:trash-can-outline"></span>
            </button>
        `;
        el.appendChild(toolbar);
    },

    removeBlockToolbar(el) {
        const toolbar = el.querySelector('.block-toolbar');
        if (toolbar) toolbar.remove();
    },

    duplicateBlock(id) {
        const block = this.currentSlideBlocks.find(b => b.id === id);
        if (!block) return;
        
        const newBlock = JSON.parse(JSON.stringify(block));
        newBlock.id = parser.generateId();
        newBlock.x += 40;
        newBlock.y += 40;
        
        this.currentSlideBlocks.push(newBlock);
        this.selectedBlockId = newBlock.id;
        this.syncToState();
        this.renderCanvas();
        ui.notify('Block duplicated', 'success');
    },

    formatSelected(type) {
        const block = this.currentSlideBlocks.find(b => b.id === this.selectedBlockId);
        if (!block || block.type !== 'text') return;

        switch(type) {
            case 'bold': block.content = `**${block.content}**`; break;
            case 'italic': block.content = `*${block.content}*`; break;
            case 'heading': block.content = `# ${block.content}`; break;
        }

        this.syncToState();
        this.renderCanvas();
    },

    addResizeHandles(el) {
        if(el.querySelector('.resize-handle')) return;
        const handle = document.createElement('div');
        handle.className = 'resize-handle absolute bottom-0 right-0 w-6 h-6 bg-indigo-500 rounded-tl-lg cursor-se-resize flex items-center justify-center text-white';
        handle.innerHTML = '<span class="iconify text-sm pointer-events-none" data-icon="mdi:resize-bottom-right"></span>';
        handle.dataset.dir = 'br';
        el.appendChild(handle);
    },

    removeResizeHandles(el) {
        const handle = el.querySelector('.resize-handle');
        if (handle) handle.remove();
    },

    insertComponent(type, initialContent = null) {
        // Redirect to Wizards for complex types if content isn't provided
        if (type === 'poll' && !initialContent) { ui.showPollWizard(); return; }
        if (type === 'quiz' && !initialContent) { ui.showQuizWizard(); return; }
        if (type === 'board' && !initialContent) { ui.showBoardWizard(); return; }

        const defaultW = type === 'text' ? 800 : 600;
        const defaultH = type === 'text' ? 300 : 400;
        
        const newBlock = {
            id: parser.generateId(),
            type: type,
            // Place in center of slide, ensuring it fits
            x: Math.max(0, (1920 - defaultW) / 2),
            y: Math.max(0, (1080 - defaultH) / 2),
            w: Math.min(defaultW, 1920),
            h: Math.min(defaultH, 1080),
            z: this.currentSlideBlocks.length + 1,
            content: initialContent || this.getDefaultContent(type)
        };

        this.currentSlideBlocks.push(newBlock);
        this.selectedBlockId = newBlock.id;
        this.syncToState();
        this.renderCanvas();
        ui.notify(`Added ${type} component`, 'success');
    },

    getDefaultContent(type) {
        switch(type) {
            case 'text': return '# New Text Block\nDouble click to edit markdown content.';
            case 'image': return 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000';
            case 'poll': return 'New Poll Question?\n- Option 1\n- Option 2';
            case 'quiz': return 'Quiz Question?\n- Correct Answer\n- Wrong Answer\n- Another Wrong';
            case 'board': return 'Collaborative Thought Board';
            case 'timer': return '300';
            case 'github': return 'philM013/livedeck';
            case 'audio': return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
            default: return 'New Component';
        }
    },

    deleteBlock(id) {
        this.currentSlideBlocks = this.currentSlideBlocks.filter(b => b.id !== id);
        this.selectedBlockId = null;
        this.syncToState();
        this.renderCanvas();
        ui.notify('Block deleted', 'info');
    },

    addSlide() {
        this.syncToState();
        const newSlideContent = `\n\n---\n\n:::block {"id":"${parser.generateId()}","type":"text","x":400,"y":300,"w":1000,"h":400,"z":1}\n# New Slide\n:::\n`;
        app.state.currentDeck.content += newSlideContent;
        app.state.currentSlide = parser.parseDeck(app.state.currentDeck.content).length - 1;
        this.parseDeck();
        this.syncToState();
        this.renderCanvas();
        ui.notify('New slide added', 'success');
    },
    
    goToSlide(index) {
        this.syncToState();
        app.state.currentSlide = index;
        
        // Refresh blocks
        this.parseDeck();
        this.currentSlideBlocks = this.slides[index].blocks || [];
        this.selectedBlockId = null;
        
        // Ensure UI stays in sync
        this.renderCanvas();
        ui.updateNavigator(this.slides);
    },

    duplicateSlide(index) {
        const slides = parser.parseDeck(app.state.currentDeck.content);
        const slideToCopy = JSON.parse(JSON.stringify(slides[index]));
        slideToCopy.id = `slide-${Date.now()}`;
        slides.splice(index + 1, 0, slideToCopy);
        app.state.currentDeck.content = parser.serializeDeck(slides);
        app.state.currentSlide = index + 1;
        this.parseDeck();
        this.renderCanvas();
        ui.notify('Slide duplicated', 'success');
    },

    deleteSlide(index) {
        const slides = parser.parseDeck(app.state.currentDeck.content);
        if (slides.length <= 1) {
            ui.notify('Cannot delete the only slide', 'error');
            return;
        }
        slides.splice(index, 1);
        app.state.currentDeck.content = parser.serializeDeck(slides);
        app.state.currentSlide = Math.max(0, index - 1);
        this.parseDeck();
        this.renderCanvas();
        ui.notify('Slide deleted', 'info');
    },

    moveSlide(index, offset) {
        const slides = parser.parseDeck(app.state.currentDeck.content);
        const newIndex = index + offset;
        if (newIndex < 0 || newIndex >= slides.length) return;
        
        const slide = slides.splice(index, 1)[0];
        slides.splice(newIndex, 0, slide);
        app.state.currentDeck.content = parser.serializeDeck(slides);
        app.state.currentSlide = newIndex;
        this.parseDeck();
        this.renderCanvas();
        ui.notify('Slide moved', 'info');
    },

    updateScale() {
        if (!this.wrapperEl || !this.canvasEl) return;
        const width = 1920;
        const height = 1080;
        const padding = 40;
        
        const availableWidth = this.wrapperEl.clientWidth - padding;
        const availableHeight = this.wrapperEl.clientHeight - padding;
        
        this.scale = Math.min(availableWidth / width, availableHeight / height);
        this.canvasEl.style.transform = `scale(${this.scale}) perspective(1px) translateZ(0)`;
    }
};
