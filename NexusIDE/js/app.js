/**
 * @file app.js
 * @description Main application controller for NexusIDE. Coordinates services, state management, and UI logic.
 */

/* global marked, html_beautify, css_beautify, js_beautify, JSZip */
import { FileSystem } from './core/FileSystem.js';
import { AIService } from './services/AIService.js';
import { PatcherService } from './services/PatcherService.js';
import { CodeAnalysisService } from './services/CodeAnalysisService.js';
import { CaptureService } from './services/CaptureService.js';
import { PADService } from './services/PADService.js';
import { TemplateService } from './services/TemplateService.js';
import { AssetService } from './services/AssetService.js';
import { UIBlockService } from './services/UIBlockService.js';
import { LintingService } from './services/LintingService.js';
import { ThumbnailService } from './services/ThumbnailService.js';
import { Editor } from './ui/Editor.js';
import { ModalService } from './ui/ModalService.js';
import { PADRenderer } from './ui/PADRenderer.js';
import { debounce, escapeHtml } from './utils.js';

/**
 * NEXUS SUPERSYSTEM CONTROLLER
 * Single orchestrator for the IDE's lifecycle and global event bus.
 * 
 * @namespace Nexus
 */
const Nexus = {
    /** @type {Object} Core application state. */
    state: {
        view: 'explorer',
        currentFile: 'index.html',
        openFiles: [],
        aiOpen: false,
        aiTab: 'chat',
        autoMode: false,
        theme: localStorage.getItem('nexus_theme') || 'dark-mode',
        assetTab: 'photos',
        assetProvider: 'unsplash',
        assetQuery: 'workspace',
        assetPage: 1,
        assetLoading: false,
        assetResults: [],
        pendingInsertion: null, // { code: string, type: 'block'|'photo' }
        context: [], // Context Library
        favorites: JSON.parse(localStorage.getItem('nexus_favorites') || '[]'),
        selectingForAI: false,
        selectionMode: false, // For visual preview selection
        currentAiMode: 'core',
        assetTarget: 'editor', // 'editor' | 'markup'
        lastMainView: 'editor',
        sidebarWidth: 300,
        outputWidth: 50, // Percent
        isSelectionMode: false,
        selectedFiles: [],
        importStaging: [], // { file: File, path: string, selected: boolean }
    },

    /** @type {Array<Function>} List of state change subscribers. */
    listeners: [],

    /**
     * Toggles a project asset (photo, icon, emoji) in the global favorites list.
     * @param {string} type - 'photo' | 'icon' | 'emoji'.
     * @param {string|number} id - Unique asset identifier.
     * @param {Object} data - Full asset payload.
     */
    toggleFavorite(type, id, data) {
        let favs = [...this.state.favorites];
        const idx = favs.findIndex(f => f.type === type && f.id === id);
        if (idx > -1) {
            favs.splice(idx, 1);
        } else {
            favs.push({ type, id, data, timestamp: Date.now() });
        }
        localStorage.setItem('nexus_favorites', JSON.stringify(favs));
        this.setState({ favorites: favs });
        this.refreshAssetsUI();
    },

    /**
     * Checks if an asset is currently favorited.
     * @param {string} type 
     * @param {string|number} id 
     * @returns {boolean}
     */
    isFavorite(type, id) {
        return this.state.favorites.some(f => f.type === type && f.id === id);
    },

    /**
     * Updates the application state and notifies all subscribers.
     * Automatically handles common side-effects like theme application.
     * 
     * @param {Object} updates - Partial state update object.
     */
    setState(updates) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        console.log("Nexus State Update:", updates);
        
        // Trigger listeners
        this.listeners.forEach(fn => fn(this.state, oldState));

        // Auto-handle common UI syncs
        if (updates.theme && updates.theme !== oldState.theme) this.applyTheme(updates.theme);
        if (updates.aiOpen !== undefined && updates.aiOpen !== oldState.aiOpen) this.toggleAI(updates.aiOpen);
    },

    /**
     * Registers a callback to be invoked on every state change.
     * @param {Function} fn - Subscriber function (newState, oldState).
     * @returns {Function} - Unsubscribe function.
     */
    subscribe(fn) {
        this.listeners.push(fn);
        return () => { this.listeners = this.listeners.filter(l => l !== fn); };
    },

    fs: new FileSystem(),
    patcher: new PatcherService(),
    analysis: new CodeAnalysisService(),
    lint: LintingService,
    thumbs: null,
    capture: null,
    pad: null,
    templates: null,
    assets: null,
    blocks: null,
    ai: null,
    editor: null,
    modals: null,
    padRenderer: null,

    /**
     * Main entry point for the IDE. Initializes all services, VFS, and UI.
     * Loads the initial project files or applies a default template if empty.
     */
    async init() {
        console.log("Nexus System Initialization Started...");
        
        try {
            console.log("Initializing VFS...");
            await this.fs.init();
            
            console.log("Initializing Services...");
            this.modals = new ModalService();
            // Initialize editor with real-time preview and auto-save
            this.editor = new Editor('code-editor', this.fs, () => {
                this.updatePreview();
                this.autoSave();
            });
            
            this.assets = new AssetService();
            this.thumbs = new ThumbnailService(this.fs);
            this.capture = new CaptureService(this.assets);
            this.pad = new PADService(this.fs);
            this.padRenderer = new PADRenderer(this);
            this.templates = new TemplateService(this.fs);
            this.blocks = new UIBlockService(this.fs);
            this.ai = new AIService(this.fs, this.patcher, this.analysis);
            
            await this.pad.init();
            this.loadSettings();
            this.setupMobileKeyboardFix();
            this.setupEditorContextMenu();
            this.setupCommandPalette();
            this.setupProblemsPanel();
            this.applyTheme(this.state.theme);
            this.setupListeners();
            
            // Preview Interaction
            window.addEventListener('message', (e) => {
                if (e.data && e.data.type === 'preview-click') {
                    this.handlePreviewClick(e.data);
                }
            });
            
            const files = await this.fs.listFiles();
            console.log(`VFS Ready. ${files.length} files found.`);
            
            if (files.length === 0) {
                console.log("No files found, applying default template...");
                await this.templates.applyTemplate('full-app');
                await this.pad.createDefaultPAD("Build a modern, interactive web application with modular logic and styles.");
            }
            
            const refreshedFiles = await this.fs.listFiles();
            const initialFile = refreshedFiles[0];
            if (initialFile) {
                console.log(`Opening initial file: ${initialFile}`);
                if (!this.state.openFiles.includes(initialFile)) this.state.openFiles.push(initialFile);
                await this.openFile(initialFile);
            }

            this.setView(window.innerWidth < 768 ? 'explorer' : 'editor');
            console.log("Nexus System Initialization Complete.");

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js').catch(err => console.warn("SW registration failed:", err));
            }
        } catch (err) {
            console.error("Nexus Init Failed Critically:", err);
            if (this.modals) this.modals.alert("System Error", "Nexus failed to initialize. Check the console for details.");
        }
    },

    /**
     * Debounced auto-save function. Persists current file to VFS 
     * and triggers background thumbnail generation.
     */
    autoSave: debounce(async function() {
        if (!Nexus.editor || !Nexus.state.currentFile) return;
        const content = Nexus.editor.getValue();
        await Nexus.fs.writeFile(Nexus.state.currentFile, content);
        
        // Background Thumbnail Generation
        if (Nexus.state.currentFile.endsWith('.html')) {
            const thumb = await Nexus.thumbs.generate(content);
            await Nexus.thumbs.saveThumbnail(Nexus.state.currentFile, thumb);
            // Refresh only if explorer is visible to avoid UI flicker while typing
            if (Nexus.state.view === 'explorer') Nexus.refreshFileExplorer();
        }

        // Refresh PAD if needed
        if (Nexus.state.currentFile === 'PROJECT_ARCHITECTURE.md') {
            await Nexus.pad.init();
            if (Nexus.state.view === 'pad') {
                const content = document.getElementById('sidebar-content');
                if (content) Nexus.padRenderer.render(content, Nexus.pad.state);
            }
            if (Nexus.state.aiOpen && Nexus.state.aiTab === 'pad') {
                Nexus.renderPADSummary();
            }
        }
    }, 1500),

    /**
     * Adjusts the UI height and drawer positioning to prevent mobile keyboard overlap.
     */
    setupMobileKeyboardFix() {
        if (!window.visualViewport) return;
        
        window.visualViewport.addEventListener('resize', () => {
            const height = window.visualViewport.height;
            const fullHeight = window.innerHeight;
            const keyboardOpen = height < fullHeight * 0.85;
            
            document.body.style.height = `${height}px`;
            
            const drawer = document.getElementById('ai-drawer');
            const mobileNav = document.querySelector('.mobile-nav');
            
            if (drawer && Nexus.state.aiOpen && window.innerWidth < 768) {
                if (keyboardOpen) {
                    drawer.style.height = `${height}px`;
                    drawer.style.bottom = '0';
                    drawer.style.top = '0';
                    if (mobileNav) mobileNav.style.display = 'none';
                } else {
                    drawer.style.height = 'auto';
                    drawer.style.top = '0';
                    drawer.style.bottom = 'calc(64px + var(--safe-bottom))';
                    if (mobileNav && window.innerWidth < 768) mobileNav.style.display = 'flex';
                }
            } else if (!Nexus.state.aiOpen && mobileNav) {
                if (window.innerWidth < 768) mobileNav.style.display = 'flex';
                else mobileNav.style.display = '';
            }
        });
    },

    /**
     * Sets up the custom context menu for the CodeMirror editor.
     * Handles positioning, visibility, and action dispatching.
     * @private
     */
    setupEditorContextMenu() {
        const menu = document.getElementById('editor-context-menu');
        if (!menu || !this.editor || !this.editor.cm) return;

        const cm = this.editor.cm;
        const wrapper = cm.getWrapperElement();

        const showMenu = (e) => {
            e.preventDefault();
            const { clientX: x, clientY: y } = e;
            
            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
            menu.classList.remove('hidden');

            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) menu.style.left = `${window.innerWidth - rect.width - 10}px`;
            if (rect.bottom > window.innerHeight) menu.style.top = `${window.innerHeight - rect.height - 10}px`;
        };

        wrapper.addEventListener('contextmenu', showMenu);
        window.addEventListener('click', () => menu.classList.add('hidden'));

        menu.querySelectorAll('[data-action]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const selection = cm.getSelection();
                
                if (action === 'explain') this.prepareChat(`/explain ${selection}`);
                else if (action === 'fix') this.prepareChat(`/fix ${selection}`);
                else if (action === 'select-component') {
                    this.selectCurrentComponent();
                }
                
                menu.classList.add('hidden');
            };
        });
    },

    /**
     * Adds an item (image or code) to the AI conversational context library.
     * @param {Object} item - { type: 'image'|'code', content: string, thumb?: string }
     */
    addToContext(item) {
        this.state.context.push(item);
        this.renderContextStaging();
        this.toggleAI(true);
    },

    /**
     * Removes an item from the context library by index.
     * @param {number} index 
     */
    removeFromContext(index) {
        this.state.context.splice(index, 1);
        this.renderContextStaging();
    },

    /**
     * Handles clicks from the preview iframe by searching for the corresponding 
     * code in the editor and selecting it.
     * @param {Object} data - { selector, outerHTML, innerText }
     */
    handlePreviewClick(data) {
        if (!this.editor || !this.editor.cm) return;
        const cm = this.editor.cm;
        const content = cm.getValue();
        
        // Disable selection mode after pick
        this.toggleSelectionMode(false);

        // Try exact match first
        let index = content.indexOf(data.outerHTML);
        let matchLength = data.outerHTML.length;
        
        // Fuzzy search if exact failed
        if (index === -1) {
            // Find by a simplified tag start
            const tagStart = data.outerHTML.substring(0, data.outerHTML.indexOf('>') + 1);
            index = content.indexOf(tagStart);
            if (index > -1) {
                // Approximate end by finding the corresponding closing tag or next opening if unique
                const nextTag = content.indexOf('</', index);
                if (nextTag > -1) matchLength = (nextTag + 10) - index; // Rough estimate
            }
        }

        // Last resort: innerText
        if (index === -1 && data.innerText && data.innerText.trim().length > 5) {
            index = content.indexOf(data.innerText.trim());
            matchLength = data.innerText.trim().length;
        }
        
        if (index > -1) {
            const from = cm.posFromIndex(index);
            const to = cm.posFromIndex(index + matchLength);
            cm.setSelection(from, to);
            cm.scrollIntoView(from, 200);
            
            if (window.innerWidth < 768) {
                this.setView('editor');
                setTimeout(() => cm.focus(), 100);
            }
        }
    },

    /**
     * Intelligently finds the start and end of the component at the current cursor
     * or selection, expanding to the full outer element (HTML tag, CSS block, or JS function).
     */
    selectCurrentComponent() {
        if (!this.editor || !this.editor.cm) return;
        const cm = this.editor.cm;
        const cursor = cm.getCursor();
        const mode = cm.getModeAt(cursor).name;
        
        if (mode === 'xml' || mode === 'htmlmixed') {
            // Use CodeMirror's tag matching if possible, or a manual walk
            const range = this.findEnclosingTag(cm, cursor);
            if (range) {
                cm.setSelection(range.from, range.to);
            }
        } else if (mode === 'markdown' || mode === 'gfm') {
            const range = this.findMarkdownBlock(cm, cursor);
            if (range) cm.setSelection(range.from, range.to);
        } else {
            // Find surrounding braces { }
            const range = this.findEnclosingBraces(cm, cursor);
            if (range) {
                cm.setSelection(range.from, range.to);
            }
        }
    },

    /** @private */
    findMarkdownBlock(cm, pos) {
        let start = pos.line, end = pos.line;
        const lineCount = cm.lineCount();
        
        // Find start: blank line or header
        while (start > 0) {
            const line = cm.getLine(start - 1).trim();
            if (line === '' || line.startsWith('#')) break;
            start--;
        }
        
        // Find end: blank line or header
        while (end < lineCount - 1) {
            const line = cm.getLine(end + 1).trim();
            if (line === '' || line.startsWith('#')) break;
            end++;
        }
        
        return { from: { line: start, ch: 0 }, to: { line: end, ch: cm.getLine(end).length } };
    },

    /** @private */
    findEnclosingTag(cm, pos) {
        // Use CodeMirror's built-in tag matching logic if possible
        // CodeMirror doesn't have a direct "find outer tag" that returns a range easily without addons
        // So we implement a more robust walk-up logic
        
        const content = cm.getValue();
        const index = cm.indexFromPos(pos);
        
        // Find nearest < BEFORE the cursor
        let openIndex = content.lastIndexOf('<', index);
        while (openIndex > -1) {
            // Check if it's a closing tag like </div>
            if (content[openIndex + 1] === '/') {
                // Keep searching backwards
                openIndex = content.lastIndexOf('<', openIndex - 1);
                continue;
            }
            
            // Try to find the matching closing tag
            // We'll use a stack-based approach for simple tag matching
            const tagNameMatch = content.slice(openIndex + 1).match(/^([a-z0-9-]+)/i);
            if (tagNameMatch) {
                const tagName = tagNameMatch[1];
                const closeTag = `</${tagName}>`;
                
                // Find matching closing tag by counting nested tags of same name
                let searchIndex = openIndex + 1;
                let stack = 1;
                while (stack > 0) {
                    const nextOpen = content.indexOf(`<${tagName}`, searchIndex);
                    const nextClose = content.indexOf(closeTag, searchIndex);
                    
                    if (nextClose === -1) break; // No match
                    
                    if (nextOpen > -1 && nextOpen < nextClose) {
                        stack++;
                        searchIndex = nextOpen + 1;
                    } else {
                        stack--;
                        searchIndex = nextClose + 1;
                        if (stack === 0) {
                            // Verify cursor is within this range
                            if (index >= openIndex && index <= nextClose + closeTag.length) {
                                return { from: cm.posFromIndex(openIndex), to: cm.posFromIndex(nextClose + closeTag.length) };
                            }
                        }
                    }
                }
            }
            openIndex = content.lastIndexOf('<', openIndex - 1);
        }
        
        return null;
    },

    /** @private */
    findEnclosingBraces(cm, pos) {
        const line = pos.line;
        const ch = pos.ch;
        let openCount = 0;
        let start = null, end = null;

        // Walk backwards for {
        for (let l = line; l >= 0; l--) {
            const text = cm.getLine(l);
            for (let c = (l === line ? ch : text.length - 1); c >= 0; c--) {
                if (text[c] === '}') openCount--;
                if (text[c] === '{') {
                    openCount++;
                    if (openCount === 1) {
                        start = { line: l, ch: c };
                        break;
                    }
                }
            }
            if (start) break;
        }

        if (!start) return null;

        // Walk forwards for }
        openCount = 1;
        const lineCount = cm.lineCount();
        for (let l = start.line; l < lineCount; l++) {
            const text = cm.getLine(l);
            for (let c = (l === start.line ? start.ch + 1 : 0); c < text.length; c++) {
                if (text[c] === '{') openCount++;
                if (text[c] === '}') {
                    openCount--;
                    if (openCount === 0) {
                        end = { line: l, ch: c + 1 };
                        break;
                    }
                }
            }
            if (end) break;
        }

        if (start && end) {
            // Try to include the header (e.g., "function name() {")
            let startLine = start.line;
            let startText = cm.getLine(startLine);
            // Walk back words on the same line
            // This is still naive but better than nothing
            return { from: { line: start.line, ch: 0 }, to: end };
        }
        return null;
    },

    /**
     * Prompts for a new name and renames a file in the VFS.
     * @param {string} path - The current file path.
     */
    async renameFile(path) {
        const newPath = await this.modals.prompt("Rename File", "New name:", path);
        if (newPath && newPath !== path) {
            const content = await this.fs.readFile(path);
            await this.fs.writeFile(newPath, content || '');
            await this.fs.deleteFile(path);
            const idx = this.state.openFiles.indexOf(path);
            if (idx > -1) {
                this.state.openFiles[idx] = newPath;
                if (this.state.currentFile === path) this.state.currentFile = newPath;
            }
            await this.refreshFileExplorer();
            this.updateTabs();
        }
    },

    /**
     * Prompts for confirmation and deletes a file from the project.
     * @param {string} path 
     */
    async deleteFile(path) {
        if (await this.modals.confirm("Delete File", `Are you sure you want to delete "${path}"?`)) {
            await this.fs.deleteFile(path);
            await this.closeFile(path);
            await this.refreshFileExplorer();
        }
    },

    /** Deletes multiple files at once. @private */
    async bulkDelete() {
        const count = this.state.selectedFiles.length;
        if (count === 0) return;
        if (await this.modals.confirm("Bulk Delete", `Are you sure you want to delete ${count} files?`)) {
            for (const path of this.state.selectedFiles) {
                await this.fs.deleteFile(path);
                await this.closeFile(path);
            }
            this.setState({ isSelectionMode: false, selectedFiles: [] });
            await this.refreshFileExplorer();
        }
    },

    /** Wipes all files from the current project. @private */
    async clearAllFiles() {
        const files = (await this.fs.listFiles()).filter(f => !f.endsWith('.meta'));
        if (files.length === 0) return;
        
        const confirmed = await this.modals.confirm(
            "CRITICAL: Wipe Project", 
            `This will permanently DELETE all ${files.length} files in "${this.fs.currentProject}". This cannot be undone. Proceed?`
        );

        if (confirmed) {
            for (const f of files) {
                await this.fs.deleteFile(f);
                const idx = this.state.openFiles.indexOf(f);
                if (idx > -1) this.state.openFiles.splice(idx, 1);
            }
            this.setState({ currentFile: '', selectedFiles: [], isSelectionMode: false });
            Nexus.editor.setValue('');
            await this.refreshFileExplorer();
            Nexus.updateTabs();
            Nexus.modals.alert("Project Wiped", "All project files have been removed.");
        }
    },

    /** Renders the list of context items staged for the next AI query. */
    renderContextStaging() {
        const container = document.getElementById('chat-context-staging');
        if (!container) return;
        
        if (this.state.context.length === 0) {
            container.classList.add('hidden');
            container.classList.remove('flex');
            return;
        }
        
        container.classList.remove('hidden');
        container.classList.add('flex');
        
        container.innerHTML = this.state.context.map((item, i) => `
            <div class="relative shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-indigo-500/30 group bg-slate-900">
                ${item.type === 'image' ? `<img src="${item.thumb || item.content}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-[6px] font-black text-indigo-400">CODE</div>`}
                <button onclick="window.Nexus.removeFromContext(${i})" class="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fa-solid fa-xmark text-[10px]"></i>
                </button>
            </div>
        `).join('');
    },

    /** Saves current editor content as a reusable project template. */
    async saveAsTemplate() {
        const content = Nexus.editor.getValue();
        if (!content) { Nexus.modals.alert("Empty File", "Cannot save an empty file as a template."); return; }
        
        const name = await Nexus.modals.prompt("Save as Template", "Template Name:", "Custom Component");
        if (!name) return;

        Nexus.modals.alert("Saving...", "Generating template thumbnail...");
        const thumb = await this.thumbs.generate(content);
        
        const templates = JSON.parse(localStorage.getItem('nexus_user_templates') || '[]');
        templates.push({
            id: 'usr-' + Date.now(),
            name,
            icon: 'fa-solid fa-code',
            html: content,
            thumb: thumb,
            description: `Saved from ${Nexus.state.currentFile} on ${new Date().toLocaleDateString()}`
        });
        localStorage.setItem('nexus_user_templates', JSON.stringify(templates));
        Nexus.modals.alert("Template Saved", `"${name}" added to your library.`);
        this.renderTemplatesGrid();
    },

    /** Closes the template picker modal. */
    closeTemplates() {
        const modal = document.getElementById('modal-templates');
        if (modal) modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    },

    /** Renders the grid of project templates including user-saved ones. */
    renderTemplatesGrid() {
        const grid = document.getElementById('templates-grid');
        if (!grid) return;

        const defaultTemplates = Nexus.templates.getTemplates();
        const userTemplates = JSON.parse(localStorage.getItem('nexus_user_templates') || '[]');
        const all = [...defaultTemplates, ...userTemplates];

        grid.innerHTML = all.map(t => `
            <div class="group bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col shadow-xl" data-id="${t.id}">
                <div class="aspect-video bg-black relative overflow-hidden group">
                    ${t.thumb ? `<img src="${t.thumb}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-slate-700 bg-slate-800"><i class="${t.icon} text-4xl"></i></div>`}
                    <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 gap-3">
                        <button class="btn-template-preview w-full py-3 rounded-2xl bg-white text-indigo-600 text-[10px] font-black uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300" data-id="${t.id}">Preview Blueprint</button>
                        <button class="btn-template-import w-full py-3 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75" data-id="${t.id}">Use Template</button>
                        <button class="btn-template-ai w-full py-3 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-150" data-id="${t.id}">Customize with AI</button>
                    </div>
                </div>
                <div class="p-6">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-black text-xs uppercase tracking-tighter text-white truncate pr-4">${t.name}</h4>
                        <div class="w-6 h-6 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400"><i class="${t.icon} text-[10px]"></i></div>
                    </div>
                    <p class="text-[10px] text-slate-500 leading-relaxed line-clamp-2 italic">"${t.description || 'Professional Layout'}"</p>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.btn-template-preview').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                const tpl = all.find(t => t.id === el.dataset.id);
                if (tpl) this.previewTemplate(tpl);
            };
        });

        grid.querySelectorAll('.btn-template-import').forEach(el => {
            el.onclick = async (e) => {
                e.stopPropagation();
                const id = el.dataset.id;
                const tpl = all.find(t => t.id === id);
                if (tpl) {
                    this.closeTemplates();
                    const name = await Nexus.modals.prompt("New File", "Filename:", "index.html");
                    if (name) {
                        await Nexus.fs.writeFile(name, tpl.html);
                        Nexus.closeWizard();
                        await Nexus.openFile(name);
                    }
                }
            };
        });

        grid.querySelectorAll('.btn-template-ai').forEach(el => {
            el.onclick = async (e) => {
                e.stopPropagation();
                const id = el.dataset.id;
                const tpl = all.find(t => t.id === id);
                if (tpl) {
                    this.closeTemplates();
                    Nexus.closeWizard();
                    Nexus.addToContext({ type: 'code', content: tpl.html });
                    Nexus.prepareChat(`I want to use the "${tpl.name}" template as a base. Please help me customize it by...`);
                }
            };
        });
    },

    /**
     * Opens a template preview modal with an iframe.
     * @param {Object} tpl 
     */
    previewTemplate(tpl) {
        const modal = document.getElementById('modal-template-preview');
        const iframe = document.getElementById('template-preview-iframe');
        const title = document.getElementById('template-preview-title');
        const useBtn = document.getElementById('btn-use-previewed-template');
        
        if (!modal || !iframe) return;
        
        title.textContent = `Preview: ${tpl.name}`;
        iframe.srcdoc = tpl.html;
        modal.classList.remove('hidden');
        
        useBtn.onclick = async () => {
            modal.classList.add('hidden');
            this.closeTemplates();
            const name = await Nexus.modals.prompt("New File", "Filename:", "index.html");
            if (name) {
                await Nexus.fs.writeFile(name, tpl.html);
                Nexus.closeWizard();
                await Nexus.openFile(name);
            }
        };
        
        document.getElementById('btn-close-template-preview').onclick = () => {
            modal.classList.add('hidden');
            iframe.srcdoc = '';
        };
    },

    /** Opens the Quick Open file search modal. */
    openQuickOpen() {
        const modal = document.getElementById('modal-quick-open');
        const input = document.getElementById('quick-open-input');
        if (!modal || !input) return;
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
        this.updateQuickOpenResults('');
    },

    /** Closes the Quick Open modal. */
    closeQuickOpen() {
        const modal = document.getElementById('modal-quick-open');
        if (modal) modal.classList.add('hidden');
    },

    /**
     * Filters and renders file search results in the Quick Open modal.
     * @param {string} query 
     */
    async updateQuickOpenResults(query) {
        const results = document.getElementById('quick-open-results');
        if (!results) return;

        const files = await Nexus.fs.listFiles();
        const filtered = files.filter(f => !f.endsWith('.meta') && f.toLowerCase().includes(query.toLowerCase()));

        if (filtered.length === 0) {
            results.innerHTML = '<div class="p-10 text-center text-slate-500 text-xs italic">No files found.</div>';
            return;
        }

        results.innerHTML = filtered.map((f, i) => `
            <div class="p-3 rounded-xl flex items-center gap-4 cursor-pointer transition-all ${i === 0 ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}" data-path="${f}">
                <i class="fa-solid fa-file-code opacity-50 w-5 text-center"></i>
                <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold truncate">${f}</div>
                    <div class="text-[9px] opacity-50 truncate">Project: ${Nexus.fs.currentProject}</div>
                </div>
            </div>
        `).join('');

        results.querySelectorAll('[data-path]').forEach(el => {
            el.onclick = async () => {
                await Nexus.openFile(el.dataset.path);
                this.closeQuickOpen();
            };
        });
    },

    /**
     * Sets up all DOM event listeners for navigation, header actions, and AI chat.
     */
    setupListeners() {
        ['explorer', 'assets', 'markup', 'pad', 'symbols', 'search'].forEach(id => {
            const el = document.getElementById(`nav-${id}`);
            if (el) el.onclick = () => {
                if (id === 'assets') {
                    Nexus.state.assetTarget = Nexus.state.lastMainView || 'editor';
                    Nexus.refreshAssetsUI();
                } else if (id !== 'markup') {
                    Nexus.state.assetTarget = 'editor';
                }
                Nexus.setView(id);
            };
        });
        this.bind('nav-settings', () => Nexus.openSettings());

        // Nav - Mobile
        ['explorer', 'search', 'symbols', 'editor', 'assets', 'ai', 'markup', 'pad', 'settings'].forEach(id => {
            const el = document.getElementById(`mobile-nav-${id}`);
            if (el) el.onclick = () => {
                if (id === 'assets') {
                    Nexus.state.assetTarget = Nexus.state.lastMainView || 'editor';
                    Nexus.refreshAssetsUI();
                } else if (id !== 'markup' && id !== 'ai') {
                    Nexus.state.assetTarget = 'editor';
                }
                
                if (id === 'ai') Nexus.toggleAI();
                else if (id === 'settings') Nexus.openSettings();
                else {
                    Nexus.setView(id);
                }
            };
        });

        // Global Key Shortcuts
        window.onkeydown = (e) => {
            const isMarkup = Nexus.state.view === 'markup';
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                Nexus.openQuickOpen();
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                Nexus.openPalette();
            }
            if (e.key === 'Escape') {
                Nexus.closePalette();
                Nexus.closeQuickOpen();
                Nexus.closeTemplates();
            }
            
            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (isMarkup) {
                    if (Nexus.capture) Nexus.capture.undo();
                } else {
                    if (Nexus.editor && Nexus.editor.cm) Nexus.editor.cm.undo();
                }
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                if (isMarkup) {
                    if (Nexus.capture) Nexus.capture.redo();
                } else {
                    if (Nexus.editor && Nexus.editor.cm) Nexus.editor.cm.redo();
                }
            }
        };

        // Templates UI
        this.bind('btn-close-templates', () => this.closeTemplates());
        this.bind('btn-back-to-wizard', () => { this.closeTemplates(); Nexus.openWizard(); });
        this.bind('btn-save-as-template', () => this.saveAsTemplate());

        // Quick Open UI
        const qoIn = document.getElementById('quick-open-input');
        if (qoIn) qoIn.oninput = debounce((e) => this.updateQuickOpenResults(e.target.value), 150);
        if (qoIn) qoIn.onkeydown = (e) => {
            if (e.key === 'Enter') document.querySelector('#quick-open-results [data-path]')?.click();
        };

        // AI Tabs
        document.querySelectorAll('.ai-tab-btn').forEach(btn => {
            btn.onclick = () => Nexus.setAITab(btn.dataset.tab);
        });

        // AI Quick Actions
        this.bind('btn-ai-explain', () => Nexus.prepareChat('/explain'));
        this.bind('btn-ai-fix', () => Nexus.prepareChat('/fix'));
        this.bind('btn-ai-refactor', () => Nexus.prepareChat('/refactor'));
        this.bind('btn-ai-modularize', () => Nexus.prepareChat('/deconstruct'));
        this.bind('btn-ai-pad-sync', () => {
            Nexus.prepareChat('COMMAND: Analyze my current codebase and reconstruct the PROJECT_ARCHITECTURE.md file to reflect the actual file structure, contracts, and implemented features. Then SAVE the updated content to PROJECT_ARCHITECTURE.md using your tools. Ensure all completed tasks are marked as COMPLETED.', 'pad');
        });
        this.bind('btn-ai-auditor', () => {
            Nexus.prepareChat('COMMAND: Run a full site audit. Use your tools to take screenshots, navigate the site, analyze the visuals/code against best practices, provide a step-by-step revision plan, and implement the necessary fixes.', 'auditor');
        });
        this.bind('btn-ai-auto-toggle', () => Nexus.toggleAutoMode());

        this.bind('btn-ai-tools-toggle', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('ai-tools-menu');
            if (menu) menu.classList.toggle('hidden');
        });

        this.bind('btn-ai-header-explain', () => { 
            Nexus.prepareChat('/explain'); 
            document.getElementById('ai-tools-menu')?.classList.add('hidden'); 
        });
        this.bind('btn-ai-header-fix', () => { 
            Nexus.prepareChat('/fix'); 
            document.getElementById('ai-tools-menu')?.classList.add('hidden'); 
        });
        this.bind('btn-ai-header-refactor', () => { 
            Nexus.prepareChat('/refactor'); 
            document.getElementById('ai-tools-menu')?.classList.add('hidden'); 
        });

        window.addEventListener('click', () => {
            document.getElementById('ai-tools-menu')?.classList.add('hidden');
        });

        this.bind('btn-undo', () => { if (Nexus.editor && Nexus.editor.cm) Nexus.editor.cm.undo(); });
        this.bind('btn-redo', () => { if (Nexus.editor && Nexus.editor.cm) Nexus.editor.cm.redo(); });

        this.bind('btn-open-palette-mobile', () => Nexus.openPalette());
        this.bind('btn-add-file', () => Nexus.openWizard());
        this.bind('btn-close-sidebar', () => Nexus.setView('editor'));
        this.bind('btn-toggle-preview', () => Nexus.togglePreview());
        this.bind('btn-toggle-selection-mode', () => Nexus.toggleSelectionMode());
        this.bind('btn-capture-preview', async () => {
            Nexus.toggleAI(true);
            Nexus.setAITab('chat');
            await Nexus.sendChatForced("Take a screenshot of the current preview and explain what you see.");
        });
        this.bind('btn-close-output', () => Nexus.togglePreview(false));
        this.bind('btn-format', () => Nexus.formatCode());
        this.bind('btn-visual-mode', () => Nexus.toggleVisualMode());
        
        this.bind('btn-markup-toggle-library', () => Nexus.toggleMarkupLibrary());
        this.bind('btn-markup-undo', () => { if (Nexus.capture) Nexus.capture.undo(); });
        this.bind('btn-markup-redo', () => { if (Nexus.capture) Nexus.capture.redo(); });
        
        this.bind('btn-markup-add-image', () => { 
            Nexus.state.assetTab = 'photos';
            Nexus.state.assetTarget = 'markup';
            Nexus.refreshAssetsUI();
            Nexus.setView('assets');
        });
        this.bind('btn-markup-add-icon', () => { 
            Nexus.state.assetTab = 'icons';
            Nexus.state.assetTarget = 'markup';
            Nexus.refreshAssetsUI();
            Nexus.setView('assets');
        });
        this.bind('btn-markup-add-emoji', () => { 
            Nexus.state.assetTab = 'emojis';
            Nexus.state.assetTarget = 'markup';
            Nexus.refreshAssetsUI();
            Nexus.setView('assets');
        });

        this.bind('btn-markup-layers', () => {
            if (Nexus.capture) Nexus.capture.toggleLayers();
        });

        document.querySelectorAll('.markup-tab-btn').forEach(btn => {
            btn.onclick = () => {
                const tab = btn.dataset.tab;
                Nexus.setMarkupTab(tab);
            };
        });

        const markupIconSearch = document.getElementById('markup-icon-search');
        if (markupIconSearch) {
            markupIconSearch.oninput = debounce((e) => this.performMarkupIconSearch(e.target.value), 300);
        }

        this.bind('btn-capture', async () => {
            const isMD = Nexus.state.currentFile.endsWith('.md');
            const targetId = isMD ? 'markdown-render' : 'preview-frame';
            const el = document.getElementById(targetId);
            
            if (!el) {
                Nexus.modals.alert("Capture Error", `Target element #${targetId} not found.`);
                return;
            }

            Nexus.togglePreview(true);
            Nexus.updatePreview();
            
            await new Promise(r => setTimeout(r, 800));

            console.log(`Nexus: Initiating capture of #${targetId}`);
            try {
                const data = await Nexus.capture.captureElement(targetId);
                if (data) {
                    Nexus.setView('markup');
                } else {
                    Nexus.modals.alert("Capture Failed", "Could not generate image data. The element might be empty or hidden.");
                }
            } catch (err) {
                Nexus.modals.alert("Capture Error", err.message);
            }
        });

        this.bind('btn-markup-to-ai', () => {
            const data = Nexus.capture.getAnnotatedData();
            if (data) {
                Nexus.addToContext({ type: 'image', content: data, thumb: data });
                Nexus.prepareChat("Explain the changes needed in this UI capture.");
            }
        });
        this.bind('btn-markup-clear', () => {
            if (Nexus.capture) {
                Nexus.capture.shapes = [];
                Nexus.capture.saveHistory();
                Nexus.capture.redraw();
            }
        });
        this.bind('btn-markup-download', () => {
            const data = Nexus.capture.getAnnotatedData();
            const a = document.createElement('a');
            a.href = data;
            a.download = `nexus-capture-${Date.now()}.png`;
            a.click();
        });
        this.bind('btn-close-markup', () => Nexus.setView('editor'));
        
        this.bind('btn-finalize-insert', () => Nexus.finalizeInsertion());
        this.bind('btn-cancel-insert', () => { Nexus.state.pendingInsertion = null; Nexus.toggleInsertionBar(false); });

        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.oninput = (e) => {
                Nexus.handleChatInput(e);
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 128) + 'px';
            };
            chatInput.onkeydown = (e) => Nexus.handleChatKeydown(e);
        }

        this.bind('btn-ai-assets', () => { 
            Nexus.state.selectingForAI = true;
            Nexus.toggleAI(false); 
            Nexus.setView('assets'); 
        });
        this.bind('btn-ai-mention', () => {
            const input = document.getElementById('chat-input');
            if (input) { 
                input.value += '@'; 
                input.focus(); 
                Nexus.updateAutocomplete('@'); 
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 128) + 'px';
            }
        });
        this.bind('btn-send-chat', () => Nexus.sendChat());
        this.bind('btn-close-ai', () => Nexus.toggleAI(false));

        this.bind('btn-settings-switch-project', () => { Nexus.closeSettings(); Nexus.openProjectLibrary(); });
        this.bind('btn-toggle-theme', () => Nexus.toggleTheme());
        this.bind('btn-save-settings', () => Nexus.saveSettings());
        this.bind('btn-cancel-settings', () => Nexus.closeSettings());
        this.bind('btn-close-wizard', () => Nexus.closeWizard());
        this.bind('btn-close-palette', () => Nexus.closePalette());
        this.bind('btn-close-quick-open', () => Nexus.closeQuickOpen());
        this.bind('wizard-opt-blank', () => Nexus.createBlank());

        this.bind('btn-close-project-library', () => Nexus.closeProjectLibrary());
        this.bind('btn-library-new-project', () => Nexus.createNewProject());
        this.bind('btn-library-import-files', () => document.getElementById('input-import-files').click());
        this.bind('btn-library-import-folder', () => document.getElementById('input-import-folder').click());
        
        // Mobile Selection Toolbar
        document.querySelectorAll('#mobile-selection-toolbar .ctx-item').forEach(btn => {
            btn.onclick = () => {
                const action = btn.dataset.action;
                
                if (action === 'select-component') {
                    Nexus.selectCurrentComponent();
                    return; // Don't proceed to chat, just update selection
                }
                
                const selection = Nexus.editor.cm.getSelection();
                if (action === 'explain') Nexus.prepareChat(`/explain ${selection}`);
                else if (action === 'fix') Nexus.prepareChat(`/fix ${selection}`);
                else if (action === 'refactor') Nexus.prepareChat(`/refactor ${selection}`);
                else if (action === 'save-block') {
                    if (selection) Nexus.blocks.saveBlock("New Block", selection).then(() => Nexus.setView('assets'));
                }
                else if (action === 'format') Nexus.formatCode();
            };
        });
        
        this.bind('wizard-opt-template', () => Nexus.showTemplatePicker());
        this.bind('wizard-opt-ai', () => Nexus.showAIScaffolder());
        this.bind('wizard-opt-import', () => Nexus.showImportPicker());

        const fileIn = document.getElementById('input-import-files');
        if (fileIn) fileIn.onchange = (e) => Nexus.handleFileImport(e);
        const folderIn = document.getElementById('input-import-folder');
        if (folderIn) folderIn.onchange = (e) => Nexus.handleFileImport(e);

        // Resizable Layout Logic
        this.setupResizers();
    },

    /** @private */
    setupResizers() {
        const sidebar = document.getElementById('context-sidebar');
        const sidebarResizer = document.getElementById('sidebar-resizer');
        const outputPane = document.getElementById('output-pane');
        const outputResizer = document.getElementById('output-resizer');
        const editorPanel = document.getElementById('editor-panel');

        let isDraggingSidebar = false;
        let isDraggingOutput = false;

        sidebarResizer?.addEventListener('mousedown', () => { isDraggingSidebar = true; document.body.style.cursor = 'col-resize'; });
        outputResizer?.addEventListener('mousedown', () => { isDraggingOutput = true; document.body.style.cursor = 'col-resize'; });

        document.addEventListener('mousemove', (e) => {
            if (isDraggingSidebar) {
                const newWidth = Math.max(150, Math.min(600, e.clientX - 64)); // 64 is desktop-nav width
                Nexus.state.sidebarWidth = newWidth;
                sidebar.style.width = `${newWidth}px`;
            }
            if (isDraggingOutput) {
                const containerWidth = editorPanel.parentElement.clientWidth;
                const newWidthPx = containerWidth - (e.clientX - sidebar.getBoundingClientRect().right);
                const newPercent = Math.max(10, Math.min(90, (newWidthPx / containerWidth) * 100));
                Nexus.state.outputWidth = newPercent;
                outputPane.style.width = `${newPercent}%`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingSidebar || isDraggingOutput) {
                isDraggingSidebar = false;
                isDraggingOutput = false;
                document.body.style.cursor = '';
                if (Nexus.editor) Nexus.editor.refresh();
            }
        });
    },

    /**
     * Activates a specific sub-tab within the Markup view sidebar.
     * @param {string} tab - 'library' | 'icons' | 'emojis'.
     */
    setMarkupTab(tab) {
        document.querySelectorAll('.markup-tab-btn').forEach(b => {
            const active = b.dataset.tab === tab;
            b.classList.toggle('text-indigo-500', active);
            b.classList.toggle('border-b-2', active);
            b.classList.toggle('border-indigo-500', active);
            b.classList.toggle('text-slate-500', !active);
        });
        
        ['library', 'icons', 'emojis'].forEach(t => {
            const pane = document.getElementById(`markup-${t}-pane`);
            if (pane) pane.classList.toggle('hidden', t !== tab);
        });

        if (tab === 'icons') this.performMarkupIconSearch('');
        if (tab === 'emojis') this.renderMarkupEmojiResults('Smileys');
    },

    /** Toggles the session library sidebar in Markup mode. */
    toggleMarkupLibrary(forceOpen = false) {
        const aside = document.querySelector('#view-markup aside');
        if (aside) {
            if (forceOpen) aside.classList.add('active');
            else aside.classList.toggle('active');
        }
    },

    /** Internal helper to attach click events to IDs. @private */
    bind(id, fn) {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    },

    /** Searches for icons in the Assets view. @param {string|boolean} queryOrReset */
    async performIconSearch(queryOrReset = false) {
        const input = document.getElementById('icon-search');
        const query = typeof queryOrReset === 'string' ? queryOrReset : (input ? input.value.trim() : '');
        const resDiv = document.getElementById('icon-results');
        if (!resDiv) return;

        if (queryOrReset === true) resDiv.innerHTML = '<div class="col-span-3 text-center py-10"><i class="fa-solid fa-circle-notch animate-spin text-indigo-500"></i></div>';

        try {
            let icons;
            if (query.length >= 2) {
                icons = await Nexus.assets.searchIcons(query);
            } else {
                icons = Nexus.assets.builtinIcons.slice(0, 30);
            }
            this.renderIconResults(icons);
        } catch (e) {
            console.error("Icon search failed:", e);
            resDiv.innerHTML = `<div class="col-span-3 text-center text-red-400 text-[10px] py-10">${e.message}</div>`;
        }
    },

    /**
     * Activates a specific top-level view (Editor, Markup, Explorer, etc.).
     * Handles mobile responsive layouts and drawer state.
     * 
     * @param {string} view - View ID.
     */
    setView(view) {
        if (view !== this.state.view) {
            const oldView = this.state.view;
            this.state.view = view; 
            
            if (view === 'editor' || view === 'markup') {
                this.state.lastMainView = view;
            }

            this.setState({ view });
        }
        
        if (view !== 'assets') {
            Nexus.state.selectingForAI = false;
        }
        
        const editorHeader = document.getElementById('editor-header-actions');
        const markupHeader = document.getElementById('markup-header-actions');
        const tabsDesktop = document.getElementById('editor-tabs-desktop');
        const tabsMobile = document.getElementById('editor-tabs-mobile');

        const activeMainView = (window.innerWidth < 768 && !['editor', 'markup'].includes(view)) 
            ? Nexus.state.lastMainView 
            : view;

        if (editorHeader) editorHeader.classList.toggle('hidden', activeMainView === 'markup');
        if (markupHeader) markupHeader.classList.toggle('hidden', activeMainView !== 'markup');
        if (tabsDesktop) tabsDesktop.classList.toggle('hidden', activeMainView === 'markup');
        if (tabsMobile) tabsMobile.classList.toggle('hidden', activeMainView === 'markup');

        if (Nexus.state.aiOpen && view !== 'ai') {
            this.toggleAI(false);
        }

        const sidebar = document.getElementById('context-sidebar');
        const viewMarkup = document.getElementById('view-markup');
        const viewEditor = document.getElementById('view-editor');

        const headerActions = ['btn-format', 'btn-toggle-preview', 'btn-capture'];
        headerActions.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden', activeMainView !== 'editor');
        });

        [viewMarkup, viewEditor].forEach(v => {
            if (v) { v.classList.remove('active'); v.classList.add('hidden'); }
        });

        if (window.innerWidth < 768) {
            const overlayViews = ['explorer', 'assets', 'pad', 'symbols', 'search'];
            const isOverlay = overlayViews.includes(view);
            
            document.body.classList.toggle('sidebar-open', isOverlay);

            if (sidebar) {
                sidebar.style.display = isOverlay ? 'flex' : 'none';
                if (isOverlay) {
                    sidebar.classList.add('fixed', 'inset-0', 'z-[100]', 'w-full');
                    this.togglePreview(false);
                }
            }
            
            if (view === 'markup') { 
                viewMarkup.classList.remove('hidden'); 
                viewMarkup.classList.add('active'); 
            } else if (view === 'editor') {
                viewEditor.classList.remove('hidden'); 
                viewEditor.classList.add('active'); 
            } else if (isOverlay) {
                if (Nexus.state.lastMainView === 'markup') {
                    viewMarkup.classList.remove('hidden');
                    viewMarkup.classList.add('active');
                } else {
                    viewEditor.classList.remove('hidden');
                    viewEditor.classList.add('active');
                }
            }
        } else {
            if (sidebar) sidebar.style.display = (view === 'markup') ? 'none' : 'flex';
            if (view === 'markup') { 
                viewMarkup.classList.remove('hidden'); 
                viewMarkup.classList.add('active'); 
            } else { 
                viewEditor.classList.remove('hidden'); 
                viewEditor.classList.add('active'); 
            }
        }

        Nexus.updateNavHighlights(view);
        Nexus.updateSidebar(view);
        
        if (view !== 'editor') {
            document.getElementById('mobile-selection-toolbar')?.classList.add('hidden');
            Nexus.toggleInsertionBar(false);
        }

        if (view === 'editor' && Nexus.editor && Nexus.editor.cm) {
            setTimeout(() => { Nexus.editor.cm.refresh(); Nexus.editor.cm.focus(); }, 150);
        }

        if (view === 'markup' && Nexus.capture) {
            setTimeout(() => Nexus.capture.recenter(), 100);
        }
    },

    /**
     * Toggles visual selection mode in the preview.
     * @param {boolean|null} force 
     */
    toggleSelectionMode(force = null) {
        const enabled = force !== null ? force : !this.state.selectionMode;
        this.setState({ selectionMode: enabled });
        
        const btn = document.getElementById('btn-toggle-selection-mode');
        if (btn) {
            btn.classList.toggle('text-indigo-500', enabled);
            btn.classList.toggle('bg-indigo-500/10', enabled);
        }

        const frame = document.getElementById('preview-frame');
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type: 'toggle-selection-mode', enabled }, '*');
        }
    },

    /** Updates active/inactive styles for navigation buttons. @private */
    updateNavHighlights(view) {
        document.querySelectorAll('.nav-active, .mob-nav-active, .text-accent').forEach(el => {
            el.classList.remove('nav-active', 'mob-nav-active', 'text-accent');
            if (el.tagName === 'BUTTON') el.classList.add('text-muted');
        });
        
        const deskBtn = document.getElementById(`nav-${view}`);
        if (deskBtn) deskBtn.classList.add('nav-active');
        
        const mobBtn = document.getElementById(`mobile-nav-${view}`);
        if (mobBtn) {
            mobBtn.classList.add('mob-nav-active');
            mobBtn.classList.remove('text-muted');
            mobBtn.classList.add('text-accent');
            const icon = mobBtn.querySelector('i');
            if (icon) icon.classList.add('text-accent');
            const text = mobBtn.querySelector('span');
            if (text) text.classList.add('text-accent');
        }
    },

    /** Triggers appropriate refresh logic for sidebar content based on active view. @private */
    updateSidebar(view) {
        const title = document.getElementById('sidebar-title');
        if (!title) return;
        if (view === 'explorer' || view === 'editor') { title.textContent = 'Explorer'; Nexus.refreshFileExplorer(); }
        else if (view === 'assets') { title.textContent = 'Assets'; Nexus.refreshAssetsUI(); }
        else if (view === 'pad') { title.textContent = 'PAD Tasks'; Nexus.refreshPADUI(); }
        else if (view === 'symbols') { title.textContent = 'Symbols'; Nexus.refreshSymbolsUI(); }
        else if (view === 'search') { title.textContent = 'Search'; Nexus.refreshSearchUI(); }
    },

    /** Opens a file from VFS and performs post-load analysis. @param {string} path */
    async openFile(path) {
        let openFiles = [...this.state.openFiles];
        if (!openFiles.includes(path)) {
            openFiles.push(path);
        }
        this.setState({ currentFile: path, openFiles });
        await Nexus.editor.openFile(path);
        const val = Nexus.editor.getValue();
        Nexus.analysis.indexFile(path, val);
        Nexus.runLint(val, path);
        
        const visualBtn = document.getElementById('btn-visual-mode');
        if (visualBtn) visualBtn.classList.add('hidden');

        Nexus.updatePreview();
        Nexus.updateTabs();
        
        if (window.innerWidth < 768 && this.state.view !== 'editor') Nexus.setView('editor');
        else await Nexus.refreshFileExplorer();
    },

    /** Closes an open file tab. @param {string} path */
    async closeFile(path) {
        const idx = this.state.openFiles.indexOf(path);
        if (idx > -1) {
            this.state.openFiles.splice(idx, 1);
            if (this.state.currentFile === path) {
                const nextFile = this.state.openFiles[Math.max(0, idx - 1)];
                if (nextFile) {
                    await this.openFile(nextFile);
                } else {
                    this.state.currentFile = '';
                    Nexus.editor.setValue('');
                    Nexus.updateTabs();
                }
            } else {
                Nexus.updateTabs();
            }
        }
    },

    /** Toggles between split editor/preview and fullscreen preview mode. */
    toggleVisualMode() {
        const editorPane = document.getElementById('view-editor').querySelector('.flex-1');
        const outputPane = document.getElementById('output-pane');
        const visualBtn = document.getElementById('btn-visual-mode');
        const isVisual = editorPane.classList.contains('hidden');
        
        if (!isVisual) {
            editorPane.classList.add('hidden');
            outputPane.classList.add('active');
            outputPane.classList.remove('md:w-1/2');
            outputPane.classList.add('w-full');
            visualBtn.innerHTML = '<i class="fa-solid fa-code mr-2"></i> Source';
            Nexus.updatePreview();
        } else {
            editorPane.classList.remove('hidden');
            outputPane.classList.add('md:w-1/2');
            outputPane.classList.remove('w-full');
            visualBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Visual';
            if (window.innerWidth < 768) {
                outputPane.classList.remove('active');
            }
        }
        if (Nexus.editor) Nexus.editor.refresh();
    },

    /** Re-renders the editor tab bar based on openFiles state. @private */
    updateTabs() {
        const container = document.getElementById('editor-tabs');
        if (container) {
            if (this.state.openFiles.length === 0 && this.state.currentFile) {
                this.state.openFiles.push(this.state.currentFile);
            }
            container.innerHTML = this.state.openFiles.map(file => {
                const isActive = file === this.state.currentFile;
                return `
                    <div class="h-full px-4 flex items-center border-t-2 text-[10px] font-bold cursor-pointer group transition-all shrink-0 min-w-[100px] justify-between ${isActive ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-900/50 border-transparent text-slate-500 hover:bg-slate-800'}"
                         onclick="window.Nexus.openFile('${file}')">
                        <div class="flex items-center gap-2 truncate pr-2">
                            ${Nexus.getFileIcon(file)}
                            <span class="truncate">${file}</span>
                        </div>
                        <button onclick="event.stopPropagation(); window.Nexus.closeFile('${file}')" class="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>`;
            }).join('');
        }
    },

    /** Toggles the split-view output pane. @param {boolean|null} show */
    togglePreview(show = null) {
        const pane = document.getElementById('output-pane');
        if (!pane) return;
        const isCurrentlyVisible = pane.classList.contains('active');
        const shouldShow = show !== null ? show : !isCurrentlyVisible;
        
        if (shouldShow) { 
            pane.classList.add('active'); 
            Nexus.updatePreview(); 
            if (window.innerWidth < 768) {
                document.getElementById('view-editor').querySelector('.flex-1').classList.add('hidden');
                pane.classList.remove('md:w-1/2');
                pane.classList.add('w-full');
            }
        } else { 
            pane.classList.remove('active'); 
            if (window.innerWidth < 768) {
                document.getElementById('view-editor').querySelector('.flex-1').classList.remove('hidden');
                pane.classList.add('md:w-1/2');
                pane.classList.remove('w-full');
            }
        }
    },

    /** Updates the content of the preview iframe or markdown renderer. @private */
    updatePreview() {
        const val = Nexus.editor.getValue();
        const path = Nexus.state.currentFile;
        const frame = document.getElementById('preview-frame');
        const render = document.getElementById('markdown-render');

        if (frame && render) {
            if (path.endsWith('.html')) {
                frame.classList.remove('hidden'); render.classList.add('hidden');
                const shim = `
                    <script>
                        var selectionMode = false;
                        var highlightEl = document.createElement('div');
                        
                        highlightEl.style.position = 'fixed';
                        highlightEl.style.pointerEvents = 'none';
                        highlightEl.style.border = '2px solid #6366f1';
                        highlightEl.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                        highlightEl.style.zIndex = '999999';
                        highlightEl.style.display = 'none';
                        highlightEl.style.transition = 'all 0.05s ease-out';
                        
                        var labelEl = document.createElement('div');
                        labelEl.style.position = 'absolute';
                        labelEl.style.top = '-24px';
                        labelEl.style.left = '-2px';
                        labelEl.style.backgroundColor = '#6366f1';
                        labelEl.style.color = 'white';
                        labelEl.style.fontSize = '10px';
                        labelEl.style.padding = '2px 6px';
                        labelEl.style.borderRadius = '4px';
                        labelEl.style.whiteSpace = 'nowrap';
                        labelEl.style.fontWeight = 'bold';
                        highlightEl.appendChild(labelEl);
                        
                        document.documentElement.appendChild(highlightEl);

                        window.addEventListener('message', (e) => {
                            if (e.data && e.data.type === 'toggle-selection-mode') {
                                selectionMode = e.data.enabled;
                                if (!selectionMode) highlightEl.style.display = 'none';
                            }
                        });

                        const updateHighlight = (e) => {
                            if (!selectionMode) return;
                            const target = e.target;
                            if (!target || target === document.documentElement || target === document.body || target === highlightEl) {
                                highlightEl.style.display = 'none';
                                return;
                            }
                            
                            const rect = target.getBoundingClientRect();
                            highlightEl.style.top = rect.top + 'px';
                            highlightEl.style.left = rect.left + 'px';
                            highlightEl.style.width = rect.width + 'px';
                            highlightEl.style.height = rect.height + 'px';
                            highlightEl.style.display = 'block';
                            
                            const id = target.id ? '#' + target.id : '';
                            labelEl.textContent = target.tagName.toLowerCase() + id;
                        };

                        const handleSelect = (e) => {
                            if (!selectionMode) return;
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const target = e.target;
                            const tag = target.tagName.toLowerCase();
                            const id = target.id ? '#' + target.id : '';
                            const cls = target.className ? '.' + String(target.className).split(' ').join('.') : '';
                            
                            window.parent.postMessage({
                                type: 'preview-click',
                                selector: tag + id + cls,
                                outerHTML: target.outerHTML,
                                innerText: target.innerText
                            }, '*');
                        };

                        document.addEventListener('mousemove', updateHighlight);
                        document.addEventListener('touchstart', (e) => updateHighlight(e.touches[0]), {passive: true});
                        document.addEventListener('click', handleSelect, true);
                        document.addEventListener('touchend', (e) => {
                            if (selectionMode) {
                                e.preventDefault();
                                handleSelect(e);
                            }
                        }, true);
                    <\/script>`;
                let content = val.includes('<head>') ? val.replace('<head>', '<head>' + shim) : shim + val;
                if (!content.includes('tailwindcss.com')) content = content.replace('</head>', '<script src="https://cdn.tailwindcss.com?plugins=typography"></script></head>');
                if (!content.includes('code.iconify.design')) content = content.replace('</head>', '<script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script></head>');
                frame.srcdoc = content;
            } else if (path.endsWith('.md')) {
                frame.classList.add('hidden'); render.classList.remove('hidden');
                render.innerHTML = marked.parse(val);
                render.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => h.style.display = 'block');
            }
        }
    },

    /** Formats the current file using js-beautify. */
    formatCode() {
        if (!Nexus.editor) return;
        const val = Nexus.editor.getValue();
        const path = Nexus.state.currentFile;
        let formatted = val;
        const options = { indent_size: 4, space_in_empty_paren: true };

        try {
            if (path.endsWith('.html')) formatted = html_beautify(val, options);
            else if (path.endsWith('.css')) formatted = css_beautify(val, options);
            else if (path.endsWith('.js')) formatted = js_beautify(val, options);
            
            if (formatted !== val) {
                Nexus.editor.setValue(formatted);
                Nexus.runLint(formatted, path);
                Nexus.modals.alert("Formatted", "Code beautified and linted.");
            }
        } catch (e) { console.error("Formatting failed:", e); }
    },

    /** Triggers the linting service and updates the Problems UI. @private */
    runLint(content, path) {
        const errors = Nexus.lint.lintCode(content, path);
        const countEl = document.getElementById('problems-count');
        const listEl = document.getElementById('problems-list');
        
        if (countEl) {
            countEl.textContent = errors.length;
            countEl.className = errors.length > 0 
                ? 'bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[8px]' 
                : 'bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full text-[8px]';
        }

        if (listEl) {
            if (errors.length === 0) {
                listEl.innerHTML = '<div class="text-center py-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">No problems detected.</div>';
            } else {
                listEl.innerHTML = errors.map(err => `
                    <div class="flex items-start gap-3 p-2 hover:bg-white/5 cursor-pointer rounded transition-colors group" onclick="Nexus.jumpToProblem(${err.line}, ${err.column})">
                        <i class="fa-solid ${err.severity === 'error' ? 'fa-circle-xmark text-red-500' : 'fa-triangle-exclamation text-amber-500'} mt-1 text-[10px]"></i>
                        <div class="flex-1">
                            <div class="text-[11px] text-slate-300 font-medium">${escapeHtml(err.message)}</div>
                            <div class="text-[9px] text-slate-500 font-bold">Line ${err.line}, Col ${err.column} ${err.ruleId ? `• ${err.ruleId}` : ''}</div>
                        </div>
                        <i class="fa-solid fa-arrow-right text-slate-600 opacity-0 group-hover:opacity-100 text-[8px] mt-1"></i>
                    </div>
                `).join('');
            }
        }
    },

    /** Jumps the editor to a specific line and column. */
    jumpToProblem(line, col) {
        if (!this.editor || !this.editor.cm) return;
        this.editor.cm.setCursor({ line: line - 1, ch: col - 1 });
        this.editor.cm.focus();
        if (window.innerWidth < 768) this.toggleProblems(false);
    },

    /** Initializes the Problems panel event listeners. @private */
    setupProblemsPanel() {
        const header = document.getElementById('problems-header');
        if (header) header.onclick = () => this.toggleProblems();
    },

    /** Toggles the Problems panel expanded state. */
    toggleProblems(show) {
        const panel = document.getElementById('problems-panel');
        const list = document.getElementById('problems-list');
        const icon = document.getElementById('problems-toggle-icon');
        if (!panel || !list || !icon) return;

        const isExpanded = panel.classList.contains('h-40');
        const shouldExpand = show !== undefined ? show : !isExpanded;

        if (shouldExpand) {
            panel.classList.remove('h-8');
            panel.classList.add('h-40');
            list.classList.remove('hidden');
            icon.classList.add('rotate-180');
        } else {
            panel.classList.remove('h-40');
            panel.classList.add('h-8');
            list.classList.add('hidden');
            icon.classList.remove('rotate-180');
        }
    },

    /** Re-renders the file list in the Explorer sidebar. */
    async refreshFileExplorer() {
        if (this._refreshing) return;
        this._refreshing = true;
        try {
            const content = document.getElementById('sidebar-content'); if (!content) return;
            const files = (await Nexus.fs.listFiles()).filter(f => !f.endsWith('.meta'));
            
            const selectionMode = this.state.isSelectionMode;
            const selectedCount = this.state.selectedFiles.length;

            content.innerHTML = `
                <div class="p-2 mb-2 space-y-3">
                    <div class="px-3 py-2 bg-slate-900/50 rounded-2xl border border-white/5 flex justify-between items-center">
                        <div class="flex flex-col">
                            <span class="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Project</span>
                            <span class="text-[11px] font-bold text-indigo-400 truncate max-w-[120px]">${Nexus.fs.currentProject}</span>
                        </div>
                        <div class="flex gap-1">
                            <button id="btn-export-project" title="Export Project (ZIP)" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 hover:text-white transition-all text-slate-400"><i class="fa-solid fa-file-export text-lg"></i></button>
                            <button id="btn-switch-project" title="Switch Project" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 hover:text-white transition-all text-slate-400"><i class="fa-solid fa-right-left text-lg"></i></button>
                        </div>
                    </div>

                    ${selectionMode ? `
                        <div class="flex gap-2 animate-slide-down">
                            <button id="btn-bulk-delete" class="flex-1 py-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                                <i class="fa-solid fa-trash-can mr-2"></i> Delete (${selectedCount})
                            </button>
                            <button id="btn-cancel-selection" class="w-12 h-12 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center hover:text-white transition-all">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    ` : `
                        <div class="flex gap-2">
                            <button id="btn-add-file-sidebar" class="flex-1 py-3 bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 rounded-xl font-bold text-xs flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                                <i class="fa-solid fa-plus mr-2"></i> New File
                            </button>
                            <button id="btn-toggle-selection" class="w-12 h-12 bg-slate-800/50 text-slate-500 rounded-xl flex items-center justify-center hover:text-indigo-400 transition-all" title="Batch Manage">
                                <i class="fa-solid fa-list-check"></i>
                            </button>
                        </div>
                    `}
                </div>
                
                <div id="file-list-items" class="space-y-0.5 px-2 pb-20"></div>`;

            this.bind('btn-add-file-sidebar', () => Nexus.openWizard());
            this.bind('btn-switch-project', () => Nexus.openProjectLibrary());
            this.bind('btn-export-project', () => Nexus.exportProject());
            this.bind('btn-toggle-selection', () => { this.setState({ isSelectionMode: true, selectedFiles: [] }); this.refreshFileExplorer(); });
            this.bind('btn-cancel-selection', () => { this.setState({ isSelectionMode: false, selectedFiles: [] }); this.refreshFileExplorer(); });
            this.bind('btn-bulk-delete', () => Nexus.bulkDelete());
            
            const listItems = document.getElementById('file-list-items');
            for (const f of files) {
                const thumb = await Nexus.thumbs.getThumbnail(f);
                const isSelected = this.state.selectedFiles.includes(f);
                const isActive = Nexus.state.currentFile === f;

                const div = document.createElement('div');
                div.className = `p-2.5 px-3 hover:bg-white/5 cursor-pointer rounded-xl transition-all flex items-center group relative ${isActive ? 'bg-indigo-500/10' : ''}`;
                
                div.innerHTML = `
                    <div class="flex items-center flex-1 min-w-0 gap-3">
                        ${selectionMode ? `
                            <div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-700'}">
                                ${isSelected ? '<i class="fa-solid fa-check text-[10px] text-white"></i>' : ''}
                            </div>
                        ` : ''}
                        <div class="w-10 h-8 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-white/5 shrink-0">
                            ${thumb ? `<img src="${thumb}" class="w-full h-full object-cover">` : Nexus.getFileIcon(f)}
                        </div>
                        <span class="truncate text-sm font-medium ${isActive ? 'text-indigo-400' : 'text-slate-300'}">${f}</span>
                    </div>
                    
                    ${!selectionMode ? `
                        <div class="hidden md:flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="event.stopPropagation(); window.Nexus.renameFile('${f}')" class="p-2 hover:bg-indigo-600/20 hover:text-indigo-400 text-slate-500 rounded-lg transition-colors" title="Rename"><i class="fa-solid fa-i-cursor"></i></button>
                            <button onclick="event.stopPropagation(); window.Nexus.deleteFile('${f}')" class="p-2 hover:bg-red-600/20 hover:text-red-400 text-slate-500 rounded-lg transition-colors" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                        <button class="md:hidden p-2 text-slate-500" onclick="event.stopPropagation(); window.Nexus.toggleFileMenu(this)">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="hidden md:hidden absolute right-12 top-1/2 -translate-y-1/2 bg-card border border-main p-1 rounded-xl shadow-2xl z-[100] mobile-actions">
                            <button onclick="event.stopPropagation(); window.Nexus.renameFile('${f}')" class="p-2 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors"><i class="fa-solid fa-i-cursor"></i></button>
                            <button onclick="event.stopPropagation(); window.Nexus.deleteFile('${f}')" class="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-colors"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    ` : ''}
                `;

                div.onclick = () => {
                    if (selectionMode) {
                        const newSelection = [...this.state.selectedFiles];
                        const idx = newSelection.indexOf(f);
                        if (idx > -1) newSelection.splice(idx, 1);
                        else newSelection.push(f);
                        this.setState({ selectedFiles: newSelection });
                        this.refreshFileExplorer();
                    } else {
                        Nexus.openFile(f);
                    }
                };
                listItems.appendChild(div);
            }

            if (!selectionMode && files.length > 5) {
                const clearAll = document.createElement('button');
                clearAll.className = 'w-full py-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] hover:text-red-500 transition-colors mt-4';
                clearAll.innerHTML = '<i class="fa-solid fa-skull-crossbones mr-2"></i> Wipe Project Files';
                clearAll.onclick = () => Nexus.clearAllFiles();
                listItems.appendChild(clearAll);
            }

        } finally { this._refreshing = false; }
    },

    /** Toggles the ellipsis menu for files on mobile. @param {HTMLElement} btn */
    toggleFileMenu(btn) {
        const menu = btn.nextElementSibling;
        const isHidden = menu.classList.contains('hidden');
        document.querySelectorAll('.mobile-actions').forEach(m => m.classList.add('hidden'));
        if (isHidden) {
            menu.classList.remove('hidden');
            const clickHandler = (e) => {
                if (!menu.contains(e.target) && !btn.contains(e.target)) {
                    menu.classList.add('hidden');
                    document.removeEventListener('pointerdown', clickHandler);
                }
            };
            setTimeout(() => document.addEventListener('pointerdown', clickHandler), 10);
        }
    },

    /** Renders the list of functions/classes extracted from the current file into the sidebar. */
    async refreshSymbolsUI() {
        const content = document.getElementById('sidebar-content'); if(!content) return;
        content.innerHTML = '<div class="p-2 space-y-1" id="symbols-list"></div>';
        const list = document.getElementById('symbols-list');
        const symbols = Nexus.analysis.getFileSymbols(Nexus.state.currentFile);
        if (symbols.length === 0) {
            list.innerHTML = '<div class="text-slate-500 text-xs p-4 text-center italic">No symbols found.</div>';
            return;
        }
        symbols.forEach(s => {
            const div = document.createElement('div');
            div.className = 'symbol-item hover:bg-indigo-500/10 transition-all group flex items-center p-2 rounded-lg cursor-pointer';
            let icon = 'ƒ'; let color = 'text-indigo-400';
            if (s.type === 'class') { icon = 'C'; color = 'text-amber-400'; }
            if (s.type === 'method') { icon = 'm'; color = 'text-emerald-400'; }
            if (s.type === 'variable') { icon = 'v'; color = 'text-slate-400'; }
            div.innerHTML = `<span class="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px] ${color} mr-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">${icon}</span><span class="truncate flex-1 text-xs text-slate-300 group-hover:text-white">${s.name}</span><span class="text-[8px] opacity-30 font-mono">L${s.line}</span>`;
            div.onclick = () => { Nexus.editor.cm.setCursor(s.line - 1, 0); Nexus.editor.cm.scrollIntoView({ line: s.line - 1, ch: 0 }, 200); Nexus.editor.cm.focus(); };
            list.appendChild(div);
        });
    },

    /** Renders the global search input and results container. */
    refreshSearchUI() {
        const content = document.getElementById('sidebar-content'); if(!content) return;
        content.innerHTML = `<div class="p-4 border-b" style="border-color: var(--border)"><div class="relative"><input type="text" id="global-search-input" placeholder="Search project..." class="w-full border rounded-lg py-2 px-3 text-xs focus:outline-none" style="background: var(--bg-main); color: var(--text-main); border-color: var(--border)"><button id="btn-perform-global-search" class="absolute right-2 top-2 text-slate-500"><i class="fa-solid fa-search"></i></button></div></div><div id="search-results" class="p-2 overflow-y-auto"></div>`;
        const input = document.getElementById('global-search-input');
        if (input) input.onkeydown = (e) => { if(e.key === 'Enter') Nexus.performGlobalSearch(); };
        this.bind('btn-perform-global-search', () => Nexus.performGlobalSearch());
    },

    /** Performs a full-project text search across all indexed files. @private */
    async performGlobalSearch() {
        const query = document.getElementById('global-search-input').value.trim();
        if (!query) return;
        const resDiv = document.getElementById('search-results');
        resDiv.innerHTML = '<div class="text-center py-10 opacity-50 text-xs">Searching...</div>';
        const files = await Nexus.fs.listFiles();
        const results = [];
        for (const path of files) {
            const content = await Nexus.fs.readFile(path);
            if (!content) continue;
            const lines = content.split('\n');
            lines.forEach((line, idx) => { if (line.toLowerCase().includes(query.toLowerCase())) results.push({ path, line: idx + 1, text: line.trim() }); });
        }
        if (results.length === 0) { resDiv.innerHTML = '<div class="text-center py-10 opacity-50 text-xs">No results found.</div>'; return; }
        resDiv.innerHTML = results.map(r => `<div class="p-3 border-b hover:bg-indigo-500/10 cursor-pointer transition-all" style="border-color: var(--border)" onclick="window.Nexus.openFile('${r.path}').then(() => { window.Nexus.editor.cm.setCursor(${r.line - 1}, 0); window.Nexus.editor.cm.scrollIntoView({line: ${r.line - 1}, ch: 0}, 200); })"><div class="text-[10px] font-bold text-indigo-400 mb-1">${r.path} : L${r.line}</div><div class="text-xs truncate opacity-80">${window.Nexus.escapeHtml(r.text)}</div></div>`).join('');
    },

    /** Handles @ and / trigger detection in chat input. @private */
    handleChatInput(e) {
        const val = e.target.value;
        const cursor = e.target.selectionStart;
        const textBefore = val.substring(0, cursor);
        const atMatch = textBefore.match(/@([\w.-]*)$/);
        const slashMatch = textBefore.match(/\/(\w*)$/);
        if (atMatch) Nexus.updateAutocomplete('@', atMatch[1]);
        else if (slashMatch) Nexus.updateAutocomplete('/', slashMatch[1]);
        else Nexus.hideAutocomplete();
    },

    /** Handles autocomplete selection via keyboard. @private */
    handleChatKeydown(e) {
        if (e.key === 'Escape') Nexus.hideAutocomplete();
        if (e.key === 'Enter' && !e.shiftKey) {
            const list = document.getElementById('autocomplete-list');
            if (list && list.style.display === 'block') { e.preventDefault(); list.querySelector('.suggestion-item')?.click(); }
        }
    },

    /** Updates the autocomplete suggestion list based on type and query. @private */
    async updateAutocomplete(type, query = '') {
        const list = document.getElementById('autocomplete-list');
        if (!list) return;
        list.innerHTML = '';
        let items = [];
        if (type === '@') {
            const files = await Nexus.fs.listFiles();
            items = files.filter(f => f.toLowerCase().includes(query.toLowerCase())).map(f => ({ label: f, value: f }));
        } else if (type === '/') {
            const commands = [
                { label: '/explain', value: 'explain ', desc: 'Explain current file' },
                { label: '/fix', value: 'fix ', desc: 'Fix bugs in file' },
                { label: '/refactor', value: 'refactor ', desc: 'Suggest refactor' },
                { label: '/create', value: 'create ', desc: 'Create new file' },
                { label: '/search', value: 'search ', desc: 'Search project' },
                { label: '/auto', value: 'auto', desc: 'Toggle Auto Mode' },
                { label: '/pad', value: 'pad', desc: 'Open PAD view' },
                { label: '/clear', value: 'clear', desc: 'Clear chat' },
                { label: '/help', value: 'help', desc: 'Show all commands' }
            ];
            items = commands.filter(c => c.label.includes(query));
        }
        if (items.length === 0) { Nexus.hideAutocomplete(); return; }
        list.style.display = 'block';
        items.forEach(item => {
            const div = document.createElement('div'); div.className = 'suggestion-item';
            div.innerHTML = `<strong>${item.label}</strong> ${item.desc ? `<span class="opacity-50 text-[10px] ml-2">${item.desc}</span>` : ''}`;
            div.onclick = () => Nexus.applySuggestion(type, item.value);
            list.appendChild(div);
        });
    },

    /** Replaces the active trigger with the selected suggestion. @private */
    applySuggestion(type, value) {
        const input = document.getElementById('chat-input');
        const cursor = input.selectionStart;
        const text = input.value;
        const lastSymbol = text.lastIndexOf(type, cursor - 1);
        input.value = text.substring(0, lastSymbol) + type + value + ' ' + text.substring(cursor);
        input.focus();
        Nexus.hideAutocomplete();
    },

    /** Hides the autocomplete suggestion list. @private */
    hideAutocomplete() {
        const list = document.getElementById('autocomplete-list');
        if (list) list.style.display = 'none';
    },

    escapeHtml(text) { return escapeHtml(text); },

    /** Returns FontAwesome icon HTML based on file extension. @private */
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        switch(ext) {
            case 'html': return '<i class="fa-brands fa-html5 text-orange-500"></i>';
            case 'css': return '<i class="fa-brands fa-css3-alt text-blue-400"></i>';
            case 'js': return '<i class="fa-brands fa-js text-yellow-400"></i>';
            case 'json': return '<i class="fa-solid fa-file-code text-emerald-400"></i>';
            case 'md': return '<i class="fa-solid fa-file-lines text-indigo-400"></i>';
            default: return '<i class="fa-solid fa-file-code text-slate-400"></i>';
        }
    },

    /** Exports the entire project VFS as a ZIP file. */
    async exportProject() {
        const zip = new JSZip();
        const files = await Nexus.fs.listFiles();
        for (const path of files) {
            const content = await Nexus.fs.readFile(path);
            if (content) zip.file(path, content);
        }
        if (!files.includes('tailwind.config.js')) zip.file('tailwind.config.js', `module.exports = { content: ["./*.html", "./js/**/*.js"], theme: { extend: {}, }, plugins: [], }`);
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${Nexus.fs.currentProject}.zip`; a.click();
        URL.revokeObjectURL(url);
    },

    /** Opens the project selection/management library. */
    async openProjectLibrary() {
        const modal = document.getElementById('modal-project-library');
        if (modal) { modal.classList.remove('hidden'); document.body.classList.add('modal-open'); await this.renderProjectLibraryGrid(); }
    },

    /** Closes the project selection modal. */
    closeProjectLibrary() {
        const modal = document.getElementById('modal-project-library');
        if (modal) { modal.classList.add('hidden'); document.body.classList.remove('modal-open'); }
    },

    /** Renders the list of project workspaces in the library. @private */
    async renderProjectLibraryGrid() {
        const grid = document.getElementById('project-library-grid'); if (!grid) return;
        const projects = await this.fs.listProjects();
        grid.innerHTML = projects.map(p => `
            <div class="group relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col shadow-xl cursor-pointer btn-project-card" data-project="${p}">
                <div class="aspect-video bg-black relative overflow-hidden flex items-center justify-center pointer-events-none">
                    <i class="fa-solid fa-folder-tree text-slate-700 text-5xl"></i>
                    <div class="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div class="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform"><i class="fa-solid fa-play ml-1"></i></div>
                    </div>
                </div>
                <button class="btn-project-delete absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 text-white/40 hover:bg-red-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center justify-center" data-project="${p}"><i class="fa-solid fa-trash-can text-xs"></i></button>
                <div class="p-6 pointer-events-none"><div class="flex justify-between items-start"><div><h4 class="font-black text-xs uppercase tracking-tighter text-white truncate pr-4">${p}</h4><p class="text-[8px] text-slate-500 uppercase font-bold tracking-widest mt-1">${p === this.fs.currentProject ? 'Active Workspace' : 'Inactive'}</p></div>${p === this.fs.currentProject ? '<div class="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20"></div>' : ''}</div></div>
            </div>`).join('');

        grid.querySelectorAll('.btn-project-card').forEach(el => {
            el.onclick = async (e) => {
                if (e.target.closest('.btn-project-delete')) return;
                const project = el.dataset.project;
                if (project !== this.fs.currentProject) { await this.fs.setProject(project); const files = await this.fs.listFiles(); const initialFile = files[0] || 'index.html'; if (!files.includes(initialFile)) await this.fs.writeFile(initialFile, ''); await this.openFile(initialFile); await this.refreshFileExplorer(); }
                this.closeProjectLibrary();
            };
        });

        grid.querySelectorAll('.btn-project-delete').forEach(el => {
            el.onclick = async (e) => {
                e.preventDefault(); e.stopPropagation();
                const project = el.dataset.project;
                if (project === 'default') { this.modals.alert("Access Denied", "The default workspace cannot be deleted."); return; }
                if (await this.modals.confirm("Delete Workspace", `Are you sure?`)) { await this.fs.deleteProject(project); if (this.fs.currentProject === project) { await this.fs.setProject('default'); await this.openFile('index.html'); } await this.renderProjectLibraryGrid(); await this.refreshFileExplorer(); }
            };
        });
    },

    /** Prompts for a name and scaffolds a new project workspace. */
    async createNewProject() {
        const name = await this.modals.prompt("New Workspace", "Workspace Name:", "My App");
        if (name) { await this.fs.setProject(name); await this.templates.applyTemplate('saas-landing'); await this.openFile('index.html'); await this.refreshFileExplorer(); this.closeProjectLibrary(); }
    },

    openProjectSwitcher() { this.openProjectLibrary(); },

    /** Renders the Assets view including Photos, Icons, and reusable Blocks. */
    async refreshAssetsUI() {
        const content = document.getElementById('sidebar-content'); if(!content) return;
        content.innerHTML = `<div class="flex border-b mb-3 overflow-x-auto no-scrollbar" style="border-color: var(--border)"><button id="tab-photos" class="px-3 py-2 text-[10px] font-bold shrink-0 ${Nexus.state.assetTab === 'photos' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}">Photos</button><button id="tab-icons" class="px-3 py-2 text-[10px] font-bold shrink-0 ${Nexus.state.assetTab === 'icons' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}">Icons</button><button id="tab-emojis" class="px-3 py-2 text-[10px] font-bold shrink-0 ${Nexus.state.assetTab === 'emojis' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}">Emoji</button><button id="tab-favorites" class="px-3 py-2 text-[10px] font-bold shrink-0 ${Nexus.state.assetTab === 'favorites' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}">★ Favs</button><button id="tab-captures" class="px-3 py-2 text-[10px] font-bold shrink-0 ${Nexus.state.assetTab === 'captures' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}">Captures</button><button id="tab-blocks" class="px-3 py-2 text-[10px] font-bold shrink-0 ${Nexus.state.assetTab === 'blocks' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}">Blocks</button></div><div id="asset-container" class="p-2 space-y-3 pb-20"></div>`;
        this.bind('tab-photos', () => { Nexus.state.assetTab = 'photos'; Nexus.refreshAssetsUI(); });
        this.bind('tab-icons', () => { Nexus.state.assetTab = 'icons'; Nexus.refreshAssetsUI(); });
        this.bind('tab-emojis', () => { Nexus.state.assetTab = 'emojis'; Nexus.refreshAssetsUI(); });
        this.bind('tab-favorites', () => { Nexus.state.assetTab = 'favorites'; Nexus.refreshAssetsUI(); });
        this.bind('tab-captures', () => { Nexus.state.assetTab = 'captures'; Nexus.refreshAssetsUI(); });
        this.bind('tab-blocks', () => { Nexus.state.assetTab = 'blocks'; Nexus.refreshAssetsUI(); });
        
        const container = document.getElementById('asset-container');
        if (Nexus.state.assetTab === 'favorites') {
            if (this.state.favorites.length === 0) { container.innerHTML = '<div class="text-center py-20 text-slate-500 text-[10px] italic">No favorites yet.</div>'; } 
            else { container.innerHTML = '<div id="asset-results" class="grid grid-cols-2 gap-2"></div>'; const res = document.getElementById('asset-results'); this.state.favorites.forEach(f => { if (f.type === 'photo') this.renderSingleAsset(res, f.data); else if (f.type === 'icon') this.renderSingleIcon(res, f.data); else if (f.type === 'emoji') this.renderSingleEmoji(res, f.data); }); }
        } else if (Nexus.state.assetTab === 'photos') {
            container.innerHTML = `<div class="flex gap-2 mb-2"><select id="asset-provider" class="bg-slate-900 border border-slate-700 text-[10px] rounded px-2 py-1"><option value="unsplash">Unsplash</option><option value="pexels">Pexels</option><option value="picsum">Picsum</option></select><div class="relative flex-1"><input type="text" id="asset-search" placeholder="Search photos..." class="w-full border rounded-lg py-1 px-3 text-[10px] bg-slate-900 text-white border-slate-700"><button id="btn-perform-search" class="absolute right-2 top-1.5 text-slate-500"><i class="fa-solid fa-search"></i></button></div></div><div id="asset-results" class="grid grid-cols-2 gap-2"></div><div id="asset-load-more" class="h-20 flex items-center justify-center"><i class="fa-solid fa-circle-notch animate-spin text-indigo-500 opacity-0" id="asset-spinner"></i></div>`;
            this.bind('btn-perform-search', () => Nexus.performAssetSearch(true));
            if (Nexus.state.assetResults && Nexus.state.assetResults.length > 0) this.renderAssetResults(Nexus.state.assetResults, true);
            else Nexus.performAssetSearch(true);
        } else if (Nexus.state.assetTab === 'icons') {
            container.innerHTML = `<div class="relative"><input type="text" id="icon-search" placeholder="Search icons..." class="w-full border rounded-lg py-2 px-3 text-xs bg-main text-main border-main"><button id="btn-perform-icon-search" class="absolute right-2 top-2 text-slate-500"><i class="fa-solid fa-search"></i></button></div><div id="icon-results" class="grid grid-cols-3 gap-3"></div>`;
            document.getElementById('icon-search').oninput = debounce((e) => this.performIconSearch(e.target.value), 300);
            this.performIconSearch('');
        } else if (Nexus.state.assetTab === 'emojis') {
            const categories = Object.keys(Nexus.assets.emojiCategories);
            container.innerHTML = `<div class="flex flex-wrap gap-1 mb-3">${categories.map(cat => `<button class="emoji-cat-btn px-2 py-1 rounded bg-slate-800 text-white text-[9px] font-bold" data-cat="${cat}">${cat}</button>`).join('')}</div><div id="emoji-results" class="grid grid-cols-4 gap-3"></div>`;
            container.querySelectorAll('.emoji-cat-btn').forEach(btn => { btn.onclick = () => this.renderEmojiResults(btn.dataset.cat); });
            this.renderEmojiResults(categories[0]);
        } else if (Nexus.state.assetTab === 'captures') {
            const sessions = Nexus.capture?.sessions || [];
            if (sessions.length === 0) container.innerHTML = '<div class="text-center py-10 text-slate-500 text-xs italic">No captures found.</div>';
            else { container.innerHTML = '<div class="grid grid-cols-1 gap-3" id="captures-list"></div>'; const list = document.getElementById('captures-list'); sessions.forEach((s, i) => { const div = document.createElement('div'); div.className = 'p-3 rounded-xl bg-slate-100 border border-slate-200 group relative'; div.innerHTML = `<div class="aspect-video bg-white rounded-lg mb-2 overflow-hidden flex items-center justify-center border border-slate-200"><i class="fa-solid fa-image text-slate-300 text-2xl"></i><div class="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3"><button class="btn-to-ai p-2 rounded-xl bg-indigo-600 text-white"><i class="fa-solid fa-robot"></i></button><button class="btn-to-markup p-2 rounded-xl bg-amber-600 text-white"><i class="fa-solid fa-pen-ruler"></i></button></div></div><div class="text-[10px] font-black text-slate-900 truncate uppercase">${s.name}</div>`; div.querySelector('.btn-to-ai').onclick = (e) => { e.stopPropagation(); Nexus.capture.loadSession(i); const data = Nexus.capture.getAnnotatedData(); Nexus.addToContext({ type: 'image', content: data, thumb: data }); }; div.querySelector('.btn-to-markup').onclick = (e) => { e.stopPropagation(); Nexus.capture.loadSession(i); Nexus.setView('markup'); }; list.appendChild(div); }); }
        } else if (Nexus.state.assetTab === 'blocks') {
            container.innerHTML = `<button id="btn-save-selection" class="w-full py-2 mb-4 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-xl font-bold text-[10px] uppercase tracking-widest"><i class="fa-solid fa-plus-circle mr-2"></i> Save Selection</button><div id="blocks-list" class="space-y-3"></div>`;
            this.bind('btn-save-selection', async () => { const selection = Nexus.editor.cm.getSelection(); if (!selection) { Nexus.modals.alert("Empty", "Select code first."); return; } const name = await Nexus.modals.prompt("Save Block", "Name:", "Custom Component"); if (name && await Nexus.blocks.saveBlock(name, selection)) { Nexus.refreshAssetsUI(); } });
            const blocks = await Nexus.blocks.getBlocks(); const list = document.getElementById('blocks-list'); blocks.forEach(b => { const div = document.createElement('div'); div.className = 'p-3 bg-white border border-slate-200 rounded-xl group relative'; div.innerHTML = `<div class="font-black text-[10px] text-slate-900 uppercase">${b.name}</div><div class="flex gap-2 opacity-0 group-hover:opacity-100 mt-2"><button class="btn-to-ai flex-1 py-1 rounded bg-indigo-600 text-white text-[8px]">AI</button><button class="btn-to-code flex-1 py-1 rounded bg-emerald-600 text-white text-[8px]">Code</button></div>`; div.querySelector('.btn-to-ai').onclick = () => Nexus.addToContext({ type: 'code', content: b.code }); div.querySelector('.btn-to-code').onclick = () => Nexus.prepareInsertion(b.code, 'block'); list.appendChild(div); });
        }
    },

    /** Orchestrates asset searching across providers. @private */
    async performAssetSearch(reset = false, defaultQuery = null) {
        const input = document.getElementById('asset-search'); const query = (input ? input.value.trim() : null) || defaultQuery || Nexus.state.assetQuery || 'workspace';
        if (reset) { Nexus.state.assetPage = 1; Nexus.state.assetResults = []; const resDiv = document.getElementById('asset-results'); if (resDiv) resDiv.innerHTML = '<div class="col-span-2 text-center py-10"><i class="fa-solid fa-circle-notch animate-spin text-indigo-500"></i></div>'; } 
        else { Nexus.state.assetPage = (Nexus.state.assetPage || 1) + 1; }
        Nexus.state.assetQuery = query; Nexus.state.assetLoading = true;
        try { let photos; const provider = Nexus.state.assetProvider; if (provider === 'unsplash') photos = await Nexus.assets.searchUnsplash(query, Nexus.state.assetPage); else if (provider === 'pexels') photos = await Nexus.assets.searchPexels(query, Nexus.state.assetPage); else if (provider === 'picsum') photos = await Nexus.assets.getPicsum(Nexus.state.assetPage); Nexus.state.assetResults = [...(Nexus.state.assetResults || []), ...photos]; this.renderAssetResults(photos, reset); } catch(e) { console.error(e); } finally { Nexus.state.assetLoading = false; }
    },

    renderAssetResults(photos, clear = false) { const resDiv = document.getElementById('asset-results'); if (!resDiv) return; if (clear) resDiv.innerHTML = ''; photos.forEach(img => this.renderSingleAsset(resDiv, img)); },

    /** Renders a single photo asset tile. @private */
    renderSingleAsset(container, img) {
        const id = img.id; const isFav = this.isFavorite('photo', id); const div = document.createElement('div'); div.className = `group relative aspect-square rounded-2xl overflow-hidden border border-slate-800 cursor-pointer asset-item transition-all hover:scale-[1.02]`;
        div.innerHTML = `
            <img src="${img.thumb}" class="w-full h-full object-cover" loading="lazy">
            <div class="asset-overlay absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                <button class="btn-toggle-fav absolute left-1 top-1/2 -translate-y-1/2 ${isFav ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-amber-500'}" title="Toggle Favorite">
                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star text-[10px]"></i>
                </button>
                <button class="btn-to-ai absolute top-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white" title="Send to AI">
                    <i class="fa-solid fa-robot text-[10px]"></i>
                </button>
                <button class="btn-to-markup absolute right-1 top-1/2 -translate-y-1/2 bg-indigo-600 text-white" title="Send to Markup">
                    <i class="fa-solid fa-pen-ruler text-[10px]"></i>
                </button>
                <button class="btn-to-code absolute bottom-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white" title="Insert into Code">
                    <i class="fa-solid fa-code text-[10px]"></i>
                </button>
            </div>`;
        this.attachAssetHandlers(div, container, 'photo', id, img);
    },

    renderIconResults(icons) { const resDiv = document.getElementById('icon-results'); if (!resDiv) return; resDiv.innerHTML = icons.length === 0 ? '<div class="col-span-3 text-center text-slate-500 text-[10px] py-10">No icons found.</div>' : ''; icons.forEach(icon => this.renderSingleIcon(resDiv, icon)); },

    /** Renders a single icon asset tile. @private */
    renderSingleIcon(container, icon) {
        const id = icon.fullName || icon.name; const isFav = this.isFavorite('icon', id); const div = document.createElement('div'); div.className = `group relative aspect-square rounded-2xl bg-slate-800/50 border border-slate-700 flex flex-col items-center justify-center p-2 cursor-pointer asset-item hover:border-indigo-500`;
        let iconHtml = icon.type === 'iconify' ? `<img src="https://api.iconify.design/${icon.fullName}.svg?color=%236366f1" class="w-10 h-10 mb-1" loading="lazy">` : `<div class="w-10 h-10 text-indigo-500 mb-1 flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">${icon.svg}</svg></div>`;
        div.innerHTML = `
            ${iconHtml}
            <div class="text-[8px] text-slate-500 truncate w-full text-center font-bold uppercase tracking-tighter">${icon.name}</div>
            <div class="asset-overlay absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                <button class="btn-toggle-fav absolute left-1 top-1/2 -translate-y-1/2 ${isFav ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-amber-500'}" title="Toggle Favorite">
                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star text-[7px]"></i>
                </button>
                <button class="btn-to-ai absolute top-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white" title="Send to AI">
                    <i class="fa-solid fa-robot text-[7px]"></i>
                </button>
                <button class="btn-to-markup absolute right-1 top-1/2 -translate-y-1/2 bg-indigo-600 text-white" title="Send to Markup">
                    <i class="fa-solid fa-pen-ruler text-[7px]"></i>
                </button>
                <button class="btn-to-code absolute bottom-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white" title="Insert into Code">
                    <i class="fa-solid fa-code text-[7px]"></i>
                </button>
            </div>`;
        this.attachAssetHandlers(div, container, 'icon', id, icon);
    },

    renderEmojiResults(category) { const resDiv = document.getElementById('emoji-results'); if (!resDiv) return; resDiv.innerHTML = ''; const emojis = Nexus.assets.emojiCategories[category] || []; emojis.map(emoji => this.renderSingleEmoji(resDiv, emoji)); },

    /** Renders a single emoji asset tile. @private */
    renderSingleEmoji(container, emoji) {
        const id = emoji; const isFav = this.isFavorite('emoji', id); const div = document.createElement('div'); div.className = `group relative aspect-square rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-3xl cursor-pointer asset-item hover:bg-slate-700`;
        div.innerHTML = `
            <div class="emoji-display pointer-events-none">${emoji}</div>
            <div class="asset-overlay absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-2xl">
                <button class="btn-toggle-fav absolute left-1 top-1/2 -translate-y-1/2 ${isFav ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-amber-500'}" title="Toggle Favorite">
                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star text-[7px]"></i>
                </button>
                <button class="btn-to-ai absolute top-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white" title="Send to AI">
                    <i class="fa-solid fa-robot text-[7px]"></i>
                </button>
                <button class="btn-to-markup absolute right-1 top-1/2 -translate-y-1/2 bg-indigo-600 text-white" title="Send to Markup">
                    <i class="fa-solid fa-pen-ruler text-[7px]"></i>
                </button>
                <button class="btn-to-code absolute bottom-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white" title="Insert into Code">
                    <i class="fa-solid fa-code text-[7px]"></i>
                </button>
            </div>`;
        this.attachAssetHandlers(div, container, 'emoji', id, emoji);
    },

    /** Attaches action handlers to asset buttons. @private */
    attachAssetHandlers(div, container, type, id, data) {
        const btnAi = div.querySelector('.btn-to-ai'); 
        const btnCode = div.querySelector('.btn-to-code'); 
        const btnMarkup = div.querySelector('.btn-to-markup');
        const btnFav = div.querySelector('.btn-toggle-fav');
        
        div.onclick = async (e) => {
            if (e.target.closest('button')) return;
            if (Nexus.state.assetTarget === 'markup') await this.insertAssetToMarkup(type, data);
            else await this.insertAssetToCode(type, data);
        };

        if (btnFav) btnFav.onclick = (e) => { e.stopPropagation(); this.toggleFavorite(type, id, data); };
        if (btnAi) btnAi.onclick = async (e) => { e.stopPropagation(); if (type === 'photo') { const b64 = await Nexus.assets.getBase64(data.full); Nexus.addToContext({ type: 'image', content: b64, thumb: data.thumb }); } else if (type === 'icon') { const img = await Nexus.assets.getIconImage(data, '#6366f1'); let final = img.src; if (data.type === 'iconify') final = await Nexus.assets.getBase64(img.src); Nexus.addToContext({ type: 'image', content: final, thumb: final }); } else if (type === 'emoji') Nexus.addToContext({ type: 'code', content: `EMOJI: ${data}` }); };
        if (btnMarkup) btnMarkup.onclick = async (e) => { e.stopPropagation(); await this.insertAssetToMarkup(type, data); };
        if (btnCode) btnCode.onclick = async (e) => { e.stopPropagation(); await this.insertAssetToCode(type, data); };
        container.appendChild(div);
    },

    /** Handles sending an asset to the markup workbench. @private */
    async insertAssetToMarkup(type, data) {
        if (type === 'photo') {
            const b64 = await Nexus.assets.getBase64(data.full);
            await Nexus.capture.addAsset({ type: 'image', data: b64 });
        } else if (type === 'icon') {
            await Nexus.capture.addAsset({ type: 'icon', data: data });
        } else if (type === 'emoji') {
            await Nexus.capture.addAsset({ type: 'emoji', data: data });
        }
        Nexus.setView('markup');
    },

    /** Handles insertion of an asset into the editor as code. @private */
    async insertAssetToCode(type, data) { if (type === 'photo') { const b64 = await Nexus.assets.getBase64(data.full); Nexus.prepareInsertion(`\n<img src="${b64}" alt="${data.alt}" class="w-full h-auto rounded-3xl shadow-2xl my-8" />\n`, 'photo'); } else if (type === 'icon') { let code = data.type === 'iconify' ? `<span class="iconify" data-icon="${data.fullName}"></span>` : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${data.svg}</svg>`; Nexus.prepareInsertion(code, 'icon'); } else if (type === 'emoji') Nexus.prepareInsertion(data, 'emoji'); if (window.innerWidth < 768) Nexus.setView('editor'); },

    /** Prepares code for insertion by showing the insertion confirmation bar. */
    prepareInsertion(code, type) { Nexus.state.pendingInsertion = { code, type }; Nexus.setView('editor'); Nexus.toggleInsertionBar(true); setTimeout(() => { if (Nexus.editor?.cm) { Nexus.editor.cm.refresh(); Nexus.editor.cm.focus(); } }, 300); },

    /** Commits the pending insertion into the editor at the current cursor position. */
    finalizeInsertion() { if (!Nexus.state.pendingInsertion) return; Nexus.editor.cm.replaceSelection(Nexus.state.pendingInsertion.code); Nexus.editor.cm.focus(); Nexus.updatePreview(); Nexus.state.pendingInsertion = null; Nexus.toggleInsertionBar(false); },

    /** Toggles the insertion confirmation UI. @private */
    toggleInsertionBar(show) { const bar = document.getElementById('insertion-bar'); if (bar) { if (show) bar.classList.remove('hidden'); setTimeout(() => { bar.classList.toggle('active', show); if (!show) setTimeout(() => bar.classList.add('hidden'), 400); }, 10); } },

    openWizard() { const w = document.getElementById('modal-wizard'); if(w) { w.classList.remove('hidden'); document.body.classList.add('modal-open'); } },
    closeWizard() { const w = document.getElementById('modal-wizard'); if(w) { w.classList.add('hidden'); document.body.classList.remove('modal-open'); } const d = document.getElementById('wizard-details'); if(d) d.classList.add('hidden'); },
    async createBlank() { const name = await Nexus.modals.prompt("New Entity", "Enter name:", "page.html"); if (name) { await Nexus.fs.writeFile(name, ''); Nexus.closeWizard(); await Nexus.openFile(name); } },
    showTemplatePicker() { this.closeWizard(); const modal = document.getElementById('modal-templates'); if (modal) { modal.classList.remove('hidden'); this.renderTemplatesGrid(); } },
    
    /** Sets up the AI prompt area for project-wide scaffolding. @private */
    showAIScaffolder() {
        const details = document.getElementById('wizard-details'); if(!details) return;
        details.classList.remove('hidden');
        details.innerHTML = `<h4 class="font-bold mb-2" style="color: var(--text-main)">AI Architect</h4><textarea id="ai-wizard-prompt" class="w-full border rounded-xl p-3 text-sm h-24 mb-4 bg-slate-900" placeholder="Describe your app..."></textarea><button id="btn-wizard-ai-gen" class="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">Generate Plan</button>`;
        document.getElementById('btn-wizard-ai-gen').onclick = async () => {
            const p = document.getElementById('ai-wizard-prompt').value; if(!p) return;
            try { const res = await Nexus.ai.getCompletion(`Generate a PROJECT_ARCHITECTURE.md for: ${p}. Return ONLY markdown.`, [], null, false, 'pad'); await Nexus.fs.writeFile('PROJECT_ARCHITECTURE.md', res); await Nexus.pad.init(); Nexus.closeWizard(); Nexus.setView('pad'); } 
            catch(e) { Nexus.modals.alert("Error", e.message); }
        };
    },

    showImportPicker() { const details = document.getElementById('wizard-details'); if(!details) return; details.classList.remove('hidden'); details.innerHTML = `<h4 class="font-bold mb-4" style="color: var(--text-main)">Import Data</h4><div class="grid grid-cols-2 gap-4"><button id="btn-import-files" class="p-6 border rounded-xl flex flex-col items-center bg-slate-800/50"><i class="fa-solid fa-file-circle-plus text-2xl text-indigo-500 mb-2"></i><span class="text-xs font-bold">Files</span></button><button id="btn-import-folder" class="p-6 border rounded-xl flex flex-col items-center bg-slate-800/50"><i class="fa-solid fa-folder-plus text-2xl text-amber-500 mb-2"></i><span class="text-xs font-bold">Folder</span></button></div>`; this.bind('btn-import-files', () => document.getElementById('input-import-files').click()); this.bind('btn-import-folder', () => document.getElementById('input-import-folder').click()); },

    /** Handles file/folder selection from system dialogs and stages them for review. @private */
    async handleFileImport(e) {
        const files = Array.from(e.target.files); if (files.length === 0) return;
        
        // Populate Staging
        this.state.importStaging = files.map(f => ({
            file: f,
            path: f.webkitRelativePath || f.name,
            selected: true
        }));

        this.openImportStaging();
        e.target.value = '';
    },

    openImportStaging() {
        const modal = document.getElementById('modal-import-staging');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');
            this.renderImportStaging();
        }
    },

    closeImportStaging() {
        const modal = document.getElementById('modal-import-staging');
        if (modal) {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
            this.state.importStaging = [];
        }
    },

    renderImportStaging() {
        const list = document.getElementById('import-staging-list');
        const count = document.getElementById('import-staging-count');
        if (!list || !count) return;

        count.textContent = `${this.state.importStaging.length} items detected`;
        
        list.innerHTML = this.state.importStaging.map((item, i) => `
            <div class="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer group" onclick="window.Nexus.toggleImportItem(${i})">
                <div class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${item.selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-700'}">
                    ${item.selected ? '<i class="fa-solid fa-check text-xs text-white"></i>' : ''}
                </div>
                <div class="w-8 h-8 rounded bg-slate-800 flex items-center justify-center shrink-0 border border-white/5">
                    ${Nexus.getFileIcon(item.path)}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-[11px] font-bold text-slate-200 truncate">${item.path}</div>
                    <div class="text-[8px] text-slate-500 font-black uppercase tracking-widest">${(item.file.size / 1024).toFixed(1)} KB</div>
                </div>
            </div>
        `).join('');

        this.bind('btn-import-staging-finalize', () => this.finalizeImport());
        this.bind('btn-close-import-staging', () => this.closeImportStaging());
        this.bind('btn-import-staging-toggle-all', () => {
            const allSelected = this.state.importStaging.every(i => i.selected);
            this.state.importStaging.forEach(i => i.selected = !allSelected);
            this.renderImportStaging();
        });
    },

    toggleImportItem(idx) {
        this.state.importStaging[idx].selected = !this.state.importStaging[idx].selected;
        this.renderImportStaging();
    },

    async finalizeImport() {
        const selectedItems = this.state.importStaging.filter(i => i.selected);
        if (selectedItems.length === 0) return;

        let targetProject = Nexus.fs.currentProject; 
        const fromLibrary = !document.getElementById('modal-project-library').classList.contains('hidden');
        
        if (fromLibrary) { 
            const name = await Nexus.modals.prompt("New Project Name", "Enter name:", selectedItems[0].path.split('/')[0] || "Imported Project"); 
            if (!name) return; 
            targetProject = name; 
            await Nexus.fs.setProject(targetProject); 
        }

        Nexus.modals.alert("Importing", `Writing ${selectedItems.length} items to VFS...`);
        
        for (const item of selectedItems) { 
            try { 
                const content = await this.readFileAsync(item.file); 
                await Nexus.fs.writeFile(item.path, content); 
            } catch (err) { console.error(err); } 
        }

        if (fromLibrary) { 
            await this.renderProjectLibraryGrid(); 
            const refreshed = await this.fs.listFiles(); 
            if (refreshed.length > 0) await this.openFile(refreshed[0]); 
            this.closeProjectLibrary(); 
        } else { 
            Nexus.closeWizard(); 
            await Nexus.refreshFileExplorer(); 
            if (selectedItems.length > 0) await this.openFile(selectedItems[0].path); 
        }
        
        this.closeImportStaging();
    },

    readFileAsync(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.onerror = reject; reader.readAsText(file); }); },

    /** Refreshes the PAD view and attaches interactive status cycle handlers. */
    async refreshPADUI() {
        const content = document.getElementById('sidebar-content'); if(!content) return;
        await Nexus.pad.init(); Nexus.padRenderer.render(content, Nexus.pad.state);
        if (this.state.aiOpen && this.state.aiTab === 'pad') this.renderPADSummary();

        Nexus.cyclePADStatus = async (id, current, type) => {
            const states = ['PENDING', 'IN PROGRESS', 'COMPLETED'];
            const projectStates = ['PLANNING', 'CODING', 'REFINING'];
            if (type === 'project') { const next = projectStates[(projectStates.indexOf(current) + 1) % projectStates.length]; Nexus.pad.state.status = next; await Nexus.pad.savePAD(); } 
            else if (type === 'task') { const curIdx = states.findIndex(s => current.toUpperCase().startsWith(s)); const next = states[(curIdx + 1) % states.length]; await Nexus.pad.updateTaskStatus(id, next); } 
            else if (type === 'story') { const curIdx = states.findIndex(s => current.toUpperCase().startsWith(s)); const next = states[(curIdx + 1) % states.length]; const story = Nexus.pad.state.userStories.find(s => (s.featureid || s.id) === id); if (story) story.status = next; await Nexus.pad.savePAD(); }
            Nexus.refreshPADUI();
        };

        Nexus.updatePADObjective = async (el) => { Nexus.pad.state.objective = el.innerText.replace(/"/g, '').trim(); await Nexus.pad.savePAD(); };
        Nexus.updatePADStory = async (id, el) => { const story = Nexus.pad.state.userStories.find(s => (s.featureid || s.id) === id); if (story) story.userstory = el.innerText.trim(); await Nexus.pad.savePAD(); };
        Nexus.updatePADTask = async (id, el, field) => { const task = Nexus.pad.state.tasks.find(t => t.id === id); if (task) task[field] = el.innerText.trim(); await Nexus.pad.savePAD(); };
    },

    /** Fills the chat input with text and opens the AI drawer. @param {string} text @param {string} [mode='core'] */
    prepareChat(text, mode = 'core') {
        const input = document.getElementById('chat-input'); if (!input) return;
        Nexus.state.currentAiMode = mode; input.value = text; input.focus();
        if (!Nexus.state.aiOpen) Nexus.toggleAI(true);
        const container = document.getElementById('chat-history'); if (container) container.scrollTop = container.scrollHeight;
    },

    /** Processes and sends the current chat input to the AI Service. Handles slash commands. */
    async sendChat() {
        const input = document.getElementById('chat-input'); if(!input) return;
        const text = input.value.trim(); if(!text && !Nexus.state.pendingCapture) return;
        
        if (text.startsWith('/')) {
            const parts = text.split(' '); const command = parts[0].toLowerCase(); const args = parts.slice(1).join(' ').trim(); input.value = '';
            switch (command) {
                case '/clear': document.getElementById('chat-history').innerHTML = ''; Nexus.ai.chatHistory = []; return;
                case '/explain': await Nexus.sendChatForced(`Explain the current file: ${Nexus.state.currentFile}`); return;
                case '/fix': await Nexus.sendChatForced(`Identify and fix potential bugs in the current file: ${Nexus.state.currentFile}`); return;
                case '/refactor': await Nexus.sendChatForced(`Suggest refactoring improvements for the current file: ${Nexus.state.currentFile}`); return;
                case '/deconstruct': {
                    const target = args || Nexus.state.currentFile; const content = await Nexus.fs.readFile(target); if (!content) { Nexus.modals.alert("Error", `File '${target}' not found.`); return; }
                    Nexus.toggleAI(true); await Nexus.sendChatForced(`DECONSTRUCT_MODE: Analyze '${target}' and refactor it into a modular architecture.`, 'deconstruct'); return;
                }
                case '/create': if (!args) { Nexus.modals.alert("Error", "Usage: /create <name>"); return; } await Nexus.sendChatForced(`Create file "${args}" with boilerplate.`); return;
                case '/search': if (!args) { Nexus.modals.alert("Error", "Usage: /search <query>"); return; } await Nexus.sendChatForced(`Search project for "${args}".`); return;
                case '/auto': Nexus.toggleAutoMode(); return;
                case '/audit': Nexus.prepareChat('COMMAND: Run a full site audit. Use your tools to take screenshots, navigate the site, analyze the visuals/code against best practices, provide a step-by-step revision plan, and implement the necessary fixes.', 'auditor'); return;
                case '/pad': Nexus.prepareChat('COMMAND: Analyze my current codebase and reconstruct the PROJECT_ARCHITECTURE.md file to reflect the actual file structure, contracts, and implemented features. Then SAVE the updated content to PROJECT_ARCHITECTURE.md using your tools. Ensure all completed tasks are marked as COMPLETED.', 'pad'); return;
                case '/help': Nexus.addChatMessage('system', `
                    <div class="space-y-2">
                        <div class="font-black text-indigo-400 uppercase text-[10px] tracking-widest">Available Commands</div>
                        <ul class="space-y-1 text-xs">
                            <li><b class="text-white">/explain</b> - Explain the current file selection</li>
                            <li><b class="text-white">/fix</b> - Identify and fix bugs in current file</li>
                            <li><b class="text-white">/refactor</b> - Suggest structural improvements</li>
                            <li><b class="text-white">/deconstruct</b> - Modularize a monolithic file</li>
                            <li><b class="text-white">/audit</b> - Run automated site visual/code audit</li>
                            <li><b class="text-white">/pad</b> - Sync PAD roadmap with implementation</li>
                            <li><b class="text-white">/create &lt;name&gt;</b> - Create a new project file</li>
                            <li><b class="text-white">/search &lt;query&gt;</b> - Search text across all files</li>
                            <li><b class="text-white">/auto</b> - Toggle autonomous PAD execution</li>
                            <li><b class="text-white">/clear</b> - Clear chat history</li>
                        </ul>
                    </div>
                `); return;
                default: Nexus.addChatMessage('system', `Unknown command. Type /help for a list of commands.`); return;
            }
        }

        Nexus.addChatMessage('user', text, Nexus.state.pendingCapture);
        input.value = ''; input.style.height = 'auto';
        const mode = Nexus.state.currentAiMode || 'core'; Nexus.state.currentAiMode = 'core';

        try {
            Nexus.setAILoading(true); const contextItems = [...Nexus.state.context]; if (Nexus.state.pendingCapture) contextItems.push({ type: 'image', content: Nexus.state.pendingCapture });
            const response = await Nexus.ai.getCompletion(text, [{ path: Nexus.state.currentFile, content: Nexus.editor.getValue() }], contextItems, Nexus.state.autoMode, mode);
            if (response) Nexus.addChatMessage('system', response);
            Nexus.state.context = []; Nexus.renderContextStaging();
        } catch (e) { Nexus.addChatMessage('system', "Error: " + e.message); } finally { Nexus.setAILoading(false); }
        Nexus.state.pendingCapture = null;
    },

    /** Updates the AI status indicator and shows/hides the typing animation. @private */
    setAILoading(isLoading) {
        const dot = document.getElementById('ai-status-dot'); const text = document.getElementById('ai-status-text');
        if (dot) { dot.classList.toggle('bg-emerald-500', isLoading); dot.classList.toggle('animate-pulse', isLoading); dot.classList.toggle('bg-slate-500', !isLoading); }
        if (text) text.textContent = isLoading ? 'AI is Thinking...' : 'Assistant';
        const container = document.getElementById('chat-history');
        if (container) {
            let typing = document.getElementById('ai-typing-indicator');
            if (isLoading && !typing) {
                typing = document.createElement('div'); typing.id = 'ai-typing-indicator'; typing.className = 'p-3 rounded-2xl slide-up mr-10 border bg-indigo-500/5 self-start flex gap-1 items-center';
                typing.innerHTML = `<div class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div><div class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div><div class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div><span class="text-[10px] ml-2 font-bold text-indigo-400 uppercase tracking-widest">Processing</span>`;
                container.appendChild(typing); container.scrollTop = container.scrollHeight;
            } else if (!isLoading && typing) typing.remove();
        }
    },

    /** Internal helper to send a specific query without clearing context first. @private */
    async sendChatForced(text, mode = 'core') {
        Nexus.addChatMessage('user', text);
        try { Nexus.setAILoading(true); const contextItems = [...Nexus.state.context]; const response = await Nexus.ai.getCompletion(text, [{ path: Nexus.state.currentFile, content: Nexus.editor.getValue() }], contextItems, Nexus.state.autoMode, mode); Nexus.addChatMessage('system', response); Nexus.state.context = []; Nexus.renderContextStaging(); } 
        catch (e) { Nexus.addChatMessage('system', "Error: " + e.message); } finally { Nexus.setAILoading(false); }
    },

    /** Toggles autonomous task execution. */
    toggleAutoMode() {
        const newState = !this.state.autoMode; this.setState({ autoMode: newState });
        Nexus.addChatMessage('system', `Auto Mode: ${newState ? 'ENABLED.' : 'DISABLED.'}`);
        if (newState) Nexus.runAutoLoop();
    },

    /** 
     * The autonomous task execution loop. 
     * Identifies the next PENDING task in the PAD and asks AI to solve it. 
     * @private
     */
    async runAutoLoop() {
        if (!Nexus.state.autoMode) return;
        const nextTask = Nexus.pad.getNextTask();
        if (!nextTask) { Nexus.addChatMessage('system', "Auto Mode: No pending tasks."); Nexus.state.autoMode = false; return; }
        Nexus.addChatMessage('system', `Auto Mode: Task [${nextTask.id}]`);
        try {
            Nexus.setAILoading(true); const prompt = `AUTO_MODE: Execute task ${nextTask.id}: ${nextTask.action}. Target: ${nextTask.files}.`;
            const response = await Nexus.ai.getCompletion(prompt, [], null, true); Nexus.addChatMessage('system', response);
            await Nexus.pad.updateTaskStatus(nextTask.id, 'COMPLETED'); Nexus.refreshPADUI();
            if (Nexus.state.autoMode) setTimeout(() => Nexus.runAutoLoop(), 2000);
        } catch (e) { Nexus.addChatMessage('system', `Error: ${e.message}`); Nexus.state.autoMode = false; } finally { Nexus.setAILoading(false); }
    },

    /** Appends a message bubble to the AI chat history. @private */
    addChatMessage(role, text, image = null) {
        const container = document.getElementById('chat-history'); if(!container) return;
        const div = document.createElement('div'); div.className = `p-3 rounded-2xl slide-up ${role === 'user' ? 'self-end ml-10 text-white' : 'mr-10 border'}`;
        div.style.background = role === 'user' ? 'var(--accent)' : 'var(--bg-card)'; div.style.color = role === 'user' ? '#fff' : 'var(--text-main)';
        if (image) { const img = document.createElement('img'); img.src = image; img.className = 'max-w-full rounded mb-2'; div.appendChild(img); }
        const msg = document.createElement('div'); msg.className = "chat-message"; msg.innerHTML = marked.parse(text); div.appendChild(msg);
        container.appendChild(div); container.scrollTop = container.scrollHeight;
    },

    /** Opens or closes the AI assistant drawer. @param {boolean|null} open */
    toggleAI(open = null) {
        const targetOpen = open !== null ? open : !this.state.aiOpen;
        if (targetOpen !== this.state.aiOpen) { this.setState({ aiOpen: targetOpen }); return; }
        const drawer = document.getElementById('ai-drawer'); if(!drawer) return;
        drawer.classList.toggle('translate-y-full', !targetOpen); drawer.classList.toggle('translate-y-0', targetOpen);
        if (window.innerWidth < 768) {
            if (Nexus.state.aiOpen) { drawer.style.height = `${window.visualViewport?.height || window.innerHeight}px`; drawer.style.top = '0'; document.querySelector('.mobile-nav').style.display = 'none'; } 
            else { drawer.style.top = ''; drawer.style.bottom = '0'; document.querySelector('.mobile-nav').style.display = 'flex'; }
        }
        if (Nexus.state.aiOpen) { setTimeout(() => document.getElementById('chat-input')?.focus(), 300); Nexus.setAITab(Nexus.state.aiTab); }
    },

    /** Switches between AI tabs (Chat, PAD, Log). @param {string} tab */
    async setAITab(tab) {
        this.setState({ aiTab: tab });
        document.querySelectorAll('.ai-tab-btn').forEach(btn => { const active = btn.dataset.tab === tab; btn.classList.toggle('text-indigo-500', active); btn.classList.toggle('border-indigo-500', active); });
        const history = document.getElementById('chat-history'); const pad = document.getElementById('pad-summary'); const actions = document.getElementById('ai-quick-actions');
        [history, pad, actions].forEach(el => el && el.classList.add('hidden'));
        if (tab === 'chat') { history?.classList.remove('hidden'); actions?.classList.remove('hidden'); } 
        else if (tab === 'pad') { pad?.classList.remove('hidden'); await Nexus.renderPADSummary(); }
    },

    /** Renders the compact PAD roadmap in the AI drawer. @private */
    async renderPADSummary() {
        const container = document.getElementById('pad-summary'); if (!container) return;
        await Nexus.pad.init(); Nexus.padRenderer.renderSummary(container, Nexus.pad.state);
        this.bind('btn-ai-rearch', () => Nexus.prepareChat("Reconstruct the PAD roadmap based on implementation progress.", 'pad'));
    },

    /** Sets up the IDE command palette (Ctrl+Shift+P). @private */
    setupCommandPalette() {
        const modal = document.getElementById('modal-palette'); const input = document.getElementById('palette-input');
        this.bind('nav-palette', () => Nexus.openPalette());
        input.oninput = debounce(() => Nexus.updatePaletteResults(), 100);
        input.onkeydown = (e) => {
            const items = document.querySelectorAll('.palette-item'); let active = Array.from(items).findIndex(el => el.classList.contains('bg-indigo-600'));
            if (e.key === 'ArrowDown') { e.preventDefault(); if (active < items.length - 1) { if (active >= 0) items[active].classList.remove('bg-indigo-600'); items[active + 1].classList.add('bg-indigo-600'); items[active + 1].scrollIntoView({ block: 'nearest' }); } } 
            else if (e.key === 'ArrowUp') { e.preventDefault(); if (active > 0) { items[active].classList.remove('bg-indigo-600'); items[active - 1].classList.add('bg-indigo-600'); items[active - 1].scrollIntoView({ block: 'nearest' }); } } 
            else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); items[active].click(); }
            else if (e.key === 'Escape') { Nexus.closePalette(); }
        };
    },

    openPalette() { const m = document.getElementById('modal-palette'); const i = document.getElementById('palette-input'); m.classList.remove('hidden'); document.body.classList.add('modal-open'); i.value = ''; i.focus(); Nexus.updatePaletteResults(); },
    closePalette() { document.getElementById('modal-palette').classList.add('hidden'); document.body.classList.remove('modal-open'); },

    async updatePaletteResults() {
        const input = document.getElementById('palette-input'); const results = document.getElementById('palette-results'); const query = input.value.toLowerCase();
        
        const commands = [
            // AI Tools
            { icon: 'fa-robot', title: 'AI: Explain Selection', action: () => Nexus.prepareChat('/explain') },
            { icon: 'fa-screwdriver-wrench', title: 'AI: Fix Bugs', action: () => Nexus.prepareChat('/fix') },
            { icon: 'fa-wand-magic-sparkles', title: 'AI: Refactor Selection', action: () => Nexus.prepareChat('/refactor') },
            { icon: 'fa-cubes', title: 'AI: Deconstruct Monolith', action: () => Nexus.prepareChat('/deconstruct') },
            { icon: 'fa-magnifying-glass-chart', title: 'AI: Run Site Auditor', action: () => Nexus.prepareChat('/audit') },
            { icon: 'fa-list-check', title: 'AI: Sync PAD Roadmap', action: () => Nexus.prepareChat('/pad') },
            { icon: 'fa-play', title: 'AI: Toggle Auto Mode', action: () => Nexus.toggleAutoMode() },

            // Views
            { icon: 'fa-folder-tree', title: 'View: Explorer', action: () => Nexus.setView('explorer') },
            { icon: 'fa-magnifying-glass', title: 'View: Global Search', action: () => Nexus.setView('search') },
            { icon: 'fa-code-branch', title: 'View: Symbols Outline', action: () => Nexus.setView('symbols') },
            { icon: 'fa-layer-group', title: 'View: Asset Manager', action: () => Nexus.setView('assets') },
            { icon: 'fa-pen-ruler', title: 'View: Markup / Drawing', action: () => Nexus.setView('markup') },
            { icon: 'fa-road', title: 'View: PAD Project Roadmap', action: () => Nexus.setView('pad') },
            { icon: 'fa-code', title: 'View: Source Editor', action: () => Nexus.setView('editor') },
            { icon: 'fa-columns', title: 'View: Toggle Split Preview', action: () => Nexus.togglePreview() },

            // Project / File
            { icon: 'fa-plus', title: 'File: New File / Wizard', action: () => Nexus.openWizard() },
            { icon: 'fa-file-export', title: 'Project: Export ZIP', action: () => Nexus.exportProject() },
            { icon: 'fa-building-columns', title: 'Project: Library / Switch', action: () => Nexus.openProjectLibrary() },

            // Editor
            { icon: 'fa-broom', title: 'Editor: Format Code', action: () => Nexus.formatCode() },
            { icon: 'fa-paragraph', title: 'Editor: Toggle Word Wrap', action: () => {
                const ww = document.getElementById('setting-wordwrap');
                if (ww) { ww.checked = !ww.checked; Nexus.saveSettings(); }
            }},

            // System
            { icon: 'fa-circle-half-stroke', title: 'System: Toggle Dark/Light Mode', action: () => Nexus.toggleTheme() },
            { icon: 'fa-gear', title: 'System: Configuration Settings', action: () => Nexus.openSettings() }
        ];

        const files = await Nexus.fs.listFiles(); 
        const fileItems = files.filter(f => !f.endsWith('.meta')).map(f => ({ 
            icon: 'fa-file-code', 
            title: `Open: ${f}`, 
            action: () => Nexus.openFile(f) 
        }));

        const filtered = [...commands, ...fileItems].filter(item => item.title.toLowerCase().includes(query));
        
        results.innerHTML = filtered.length > 0 
            ? filtered.map((item, i) => `
                <div class="palette-item p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all border border-transparent hover:border-indigo-500/30 group ${i === 0 ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-300 hover:bg-indigo-600/10'}">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                            <i class="fa-solid ${item.icon} opacity-60 group-hover:opacity-100 transition-opacity"></i>
                        </div>
                        <span class="text-xs font-black uppercase tracking-widest">${item.title}</span>
                    </div>
                    <i class="fa-solid fa-chevron-right text-[10px] opacity-20 group-hover:opacity-100 transition-opacity"></i>
                </div>
            `).join('')
            : '<div class="text-center py-12 text-slate-500 font-bold uppercase tracking-widest text-[10px]">No matching results found</div>';

        results.querySelectorAll('.palette-item').forEach((el, i) => el.onclick = () => { 
            filtered[i].action(); 
            Nexus.closePalette(); 
        });
    },

    openSettings() { const s = document.getElementById('modal-settings'); if(s) { s.classList.remove('hidden'); document.body.classList.add('modal-open'); this.loadSettings(); this.refreshModelList(); } },

    /** Fetches available Gemini models from the API and populates the settings selector. @private */
    async refreshModelList() {
        const selector = document.getElementById('setting-ai-model'); if (!selector || !Nexus.ai.apiKey) return;
        try {
            const models = await Nexus.ai.listModels(); 
            // Broaden filter to show more available models
            const filtered = models.filter(m => 
                m.name.toLowerCase().includes('gemini') && 
                m.supportedGenerationMethods.includes('generateContent')
            );
            
            if (filtered.length > 0) {
                const currentModel = localStorage.getItem('nexus_ai_model');
                selector.innerHTML = filtered.map(m => {
                    const short = m.name.replace('models/', '');
                    return `<option value="${short}" ${short === currentModel ? 'selected' : ''}>${m.displayName} (${short})</option>`;
                }).join('');
            } else {
                selector.innerHTML = `
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</option>
                `;
            }
        } catch (e) { 
            console.error("Failed to refresh models list:", e); 
        }
    },

    closeSettings() { const s = document.getElementById('modal-settings'); if(s) { s.classList.add('hidden'); document.body.classList.remove('modal-open'); } },
    
    /** Synchronizes LocalStorage settings with the Settings modal inputs. @private */
    loadSettings() {
        const gi = document.getElementById('setting-gemini-key'); const mi = document.getElementById('setting-ai-model');
        const ti = document.getElementById('setting-ai-temp'); const ai = document.getElementById('setting-ai-instructions');
        const ww = document.getElementById('setting-wordwrap');
        const pc = document.getElementById('setting-prompt-core'); const pp = document.getElementById('setting-prompt-pad');
        const pu = document.getElementById('setting-prompt-ui'); const pd = document.getElementById('setting-prompt-deconstruct');
        const pa = document.getElementById('setting-prompt-auditor');
        const uk = document.getElementById('setting-unsplash-key'); const pk = document.getElementById('setting-pexels-key');

        if (gi) gi.value = localStorage.getItem('nexus_gemini_key') || '';
        if (mi) mi.value = localStorage.getItem('nexus_ai_model') || 'gemini-1.5-flash';
        if (ti) ti.value = localStorage.getItem('nexus_ai_temp') || '0.7';
        if (ai) ai.value = localStorage.getItem('nexus_ai_instructions') || '';
        if (ww) ww.checked = localStorage.getItem('nexus_wordwrap') !== 'false';
        
        // Use this.ai to ensure we are accessing the instance correctly
        if (pc) pc.value = localStorage.getItem('nexus_prompt_core') || (this.ai ? this.ai.prompts.core : '');
        if (pp) pp.value = localStorage.getItem('nexus_prompt_pad') || (this.ai ? this.ai.prompts.pad : '');
        if (pu) pu.value = localStorage.getItem('nexus_prompt_ui') || (this.ai ? this.ai.prompts.ui : '');
        if (pd) pd.value = localStorage.getItem('nexus_prompt_deconstruct') || (this.ai ? this.ai.prompts.deconstruct : '');
        if (pa) pa.value = localStorage.getItem('nexus_prompt_auditor') || (this.ai ? this.ai.prompts.auditor : '');
        
        if (uk) uk.value = localStorage.getItem('nexus_unsplash_key') || '';
        if (pk) pk.value = localStorage.getItem('nexus_pexels_key') || '';
    },

    /** Saves Settings modal inputs back to LocalStorage and updates service instances. */
    saveSettings() {
        const k = document.getElementById('setting-gemini-key')?.value || ''; 
        const m = document.getElementById('setting-ai-model')?.value || 'gemini-1.5-flash'; 
        const t = document.getElementById('setting-ai-temp')?.value || '0.7'; 
        const i = document.getElementById('setting-ai-instructions')?.value || '';
        const w = document.getElementById('setting-wordwrap')?.checked ?? true;
        
        const pc = document.getElementById('setting-prompt-core')?.value || '';
        const pp = document.getElementById('setting-prompt-pad')?.value || '';
        const pu = document.getElementById('setting-prompt-ui')?.value || '';
        const pd = document.getElementById('setting-prompt-deconstruct')?.value || '';
        const pa = document.getElementById('setting-prompt-auditor')?.value || '';
        
        const uk = document.getElementById('setting-unsplash-key')?.value || '';
        const pk = document.getElementById('setting-pexels-key')?.value || '';

        if (this.ai) {
            this.ai.setApiKey(k); 
            this.ai.setConfig(m, t, i, { core: pc, pad: pp, ui: pu, deconstruct: pd, auditor: pa });
        }
        
        if (this.assets) {
            this.assets.setUnsplashKey(uk);
            this.assets.setPexelsKey(pk);
        }

        localStorage.setItem('nexus_wordwrap', w); 
        if (this.editor) this.editor.setOption('lineWrapping', w);
        
        Nexus.closeSettings(); Nexus.modals.alert("Saved", "Settings updated.");
    },

    /** Searches for icons in the Markup tool sidebar. @private */
    async performMarkupIconSearch(query = '') {
        const resDiv = document.getElementById('markup-icon-results');
        if (!resDiv) return;
        resDiv.innerHTML = '<div class="col-span-3 text-center py-4"><i class="fa-solid fa-circle-notch animate-spin text-indigo-500"></i></div>';
        try {
            let icons;
            if (query.length >= 2) icons = await Nexus.assets.searchIcons(query);
            else icons = Nexus.assets.builtinIcons.slice(0, 30);
            resDiv.innerHTML = icons.length === 0 ? '<div class="col-span-3 text-center text-slate-500 text-[10px] py-4">No icons.</div>' : '';
            icons.forEach(icon => {
                const div = document.createElement('div');
                div.className = 'aspect-square rounded bg-slate-100 border border-slate-200 flex items-center justify-center p-1 cursor-pointer hover:border-indigo-500 transition-colors';
                div.innerHTML = icon.type === 'iconify' ? `<img src="https://api.iconify.design/${icon.fullName}.svg?color=%236366f1" class="w-full h-full">` : `<div class="w-full h-full text-indigo-500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">${icon.svg}</svg></div>`;
                div.onclick = () => Nexus.capture.addAsset({ type: 'icon', data: icon });
                resDiv.appendChild(div);
            });
        } catch (e) { resDiv.innerHTML = '<div class="col-span-3 text-center text-red-400 text-[8px]">Error</div>'; }
    },

    /** Renders emoji categories and results in the Markup tool sidebar. @private */
    renderMarkupEmojiResults(category) {
        const catDiv = document.getElementById('markup-emoji-categories');
        const resDiv = document.getElementById('markup-emoji-results');
        if (!catDiv || !resDiv) return;
        
        const categories = Object.keys(Nexus.assets.emojiCategories);
        catDiv.innerHTML = categories.map(c => `<button class="px-1.5 py-0.5 rounded text-[8px] font-bold ${c === category ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}" onclick="window.Nexus.renderMarkupEmojiResults('${c}')">${c}</button>`).join('');
        
        const emojis = Nexus.assets.emojiCategories[category] || [];
        resDiv.innerHTML = emojis.map(e => `<button class="aspect-square flex items-center justify-center text-xl hover:bg-slate-100 rounded transition-colors" onclick="window.Nexus.capture.addAsset({ type: 'emoji', data: '${e}' })">${e}</button>`).join('');
    },

    /** Toggles between Dark and Light mode. */
    toggleTheme() { const newTheme = this.state.theme === 'dark-mode' ? 'light-mode' : 'dark-mode'; this.setState({ theme: newTheme }); localStorage.setItem('nexus_theme', newTheme); },

    /** Applies the theme classes to the body and CodeMirror. @private */
    applyTheme(theme) { document.body.className = theme; const cmTheme = theme === 'light-mode' ? 'neo' : 'monokai'; if (Nexus.editor?.cm) Nexus.editor.cm.setOption('theme', cmTheme); }
};

window.Nexus = Nexus;
window.onload = () => Nexus.init();
