/**
 * LiveDeck - UI & Interaction Module
 * 
 * Manages all user interface elements including modals, notifications, 
 * contextual toolbars, and mobile-native navigation trays.
 */

const ui = {
    activeMDE: null,

    init() {
        this.bindEvents();
    },

    /**
     * Global Event Binding
     */
    bindEvents() {
        // Global click to close context menu
        window.addEventListener('click', () => this.hideContextMenu());
        
        const nav = document.getElementById('navigator-container');
        const editorCont = document.getElementById('editor-container');

        if(nav) {
            nav.addEventListener('contextmenu', (e) => this.showNavigatorMenu(e));
            this.addLongPressListener(nav, (pos) => this.showNavigatorMenu(pos));
        }
        if(editorCont) {
            editorCont.addEventListener('contextmenu', (e) => this.showEditorMenu(e));
            this.addLongPressListener(editorCont, (pos) => this.showEditorMenu(pos));
        }
    },

    /**
     * Context Menu System
     */
    showContextMenu(e, items) {
        if (e.preventDefault) e.preventDefault();
        const menu = document.getElementById('context-menu');
        const list = document.getElementById('context-menu-items');
        if (!menu || !list) return;

        list.innerHTML = '';
        items.forEach(item => {
            if (item === 'divider') {
                list.innerHTML += `<div class="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2"></div>`;
                return;
            }
            
            const btn = document.createElement('button');
            btn.className = `w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-indigo-600 hover:text-white transition-all group`;
            btn.innerHTML = `
                <span class="iconify text-lg text-slate-400 group-hover:text-white" data-icon="${item.icon}"></span>
                <span class="font-medium">${item.label}</span>
            `;
            btn.onclick = () => {
                item.action();
                this.hideContextMenu();
            };
            list.appendChild(btn);
        });

        menu.style.left = `${e.pageX || e.clientX}px`;
        menu.style.top = `${e.pageY || e.clientY}px`;
        menu.classList.remove('hidden');
    },

    hideContextMenu() {
        const menu = document.getElementById('context-menu');
        if(menu) menu.classList.add('hidden');
    },

    /**
     * Advanced Block Editing
     */
    editBlock(blockId) {
        const block = editor.currentSlideBlocks.find(b => b.id === blockId);
        if (!block) return;

        if (block.type === 'text') {
            this.showTextEditor(block);
        } else if (block.type === 'image') {
            this.showImageEditor(block);
        } else {
            this.showGenericEditor(block);
        }
    },

    showTextEditor(block) {
        const inputId = 'mde-editor-' + block.id;
        this.showModal({
            title: "Edit Text",
            body: `<div class="mde-container border dark:border-slate-800 rounded-2xl overflow-hidden"><textarea id="${inputId}">${block.content}</textarea></div>`,
            actions: [
                { label: 'Save', primary: true, callback: () => {
                    block.content = this.activeMDE.value();
                    editor.syncToState();
                    editor.renderCanvas();
                }},
                { label: 'Cancel', primary: false }
            ]
        });

        setTimeout(() => {
            this.activeMDE = new SimpleMDE({
                element: document.getElementById(inputId),
                spellChecker: false,
                toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "table", "|", "preview"],
                status: false
            });
        }, 100);
    },

    showImageEditor(block) {
        const previewId = 'img-preview-' + block.id;
        this.showModal({
            title: "Edit Image",
            body: `
                <div class="space-y-6">
                    <div class="aspect-video bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden border dark:border-slate-700 flex items-center justify-center relative group">
                        <img id="${previewId}" src="${block.content}" class="w-full h-full object-contain">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <label class="p-4 bg-white text-indigo-600 rounded-full cursor-pointer shadow-2xl transition-transform hover:scale-110">
                                <span class="iconify text-2xl" data-icon="mdi:upload"></span>
                                <input type="file" class="hidden" accept="image/*" onchange="ui.handleImageUpload(event, '${previewId}')">
                             </label>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Image URL</label>
                        <input id="img-url-input" type="text" value="${block.content}" class="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-indigo-500">
                    </div>
                    <button onclick="ui.showStockSearch('${previewId}')" class="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                        <span class="iconify text-xl" data-icon="mdi:image-search-outline"></span> Search Stock Photos
                    </button>
                </div>
            `,
            actions: [
                { label: 'Apply', primary: true, callback: () => {
                    block.content = document.getElementById('img-url-input').value;
                    editor.syncToState();
                    editor.renderCanvas();
                }},
                { label: 'Cancel', primary: false }
            ]
        });
    },

    async handleImageUpload(e, previewId) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const base64 = await assets.fileToBase64(file);
            document.getElementById(previewId).src = base64;
            document.getElementById('img-url-input').value = base64;
            this.notify('Upload Complete', 'success');
        } catch (err) { this.notify('Upload Failed', 'error'); }
    },

    showStockSearch(previewId) {
        this.showModal({
            title: "Stock Search",
            body: `
                <div class="space-y-4 h-[500px] flex flex-col">
                    <div class="flex gap-2">
                        <input id="stock-search-input" type="text" placeholder="Search Unsplash/Pexels..." class="flex-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-4 text-sm outline-none">
                        <button onclick="ui.performStockSearch()" class="p-4 bg-indigo-600 text-white rounded-2xl"><span class="iconify text-xl" data-icon="mdi:magnify"></span></button>
                    </div>
                    <div id="stock-results" class="flex-1 overflow-y-auto grid grid-cols-2 gap-3 no-scrollbar pb-10"></div>
                </div>
            `,
            actions: []
        });
    },

    async performStockSearch() {
        const query = document.getElementById('stock-search-input').value;
        const container = document.getElementById('stock-results');
        if (!query) return;
        container.innerHTML = '<div class="col-span-full text-center py-20 animate-pulse text-slate-400">Searching...</div>';
        try {
            const results = await assets.searchUnsplash(query);
            container.innerHTML = results.map(img => `
                <div class="relative group cursor-pointer aspect-video rounded-xl overflow-hidden shadow-lg" onclick="ui.selectStockImage('${img.full}')">
                    <img src="${img.thumb}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-indigo-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span class="text-white font-black text-[10px]">SELECT</span></div>
                </div>
            `).join('');
        } catch (err) { container.innerHTML = `<div class="col-span-full text-center py-20 text-red-500">${err.message}</div>`; }
    },

    selectStockImage(url) {
        const input = document.getElementById('img-url-input');
        if (input) input.value = url;
        const preview = document.querySelector('[id^="img-preview-"]');
        if (preview) preview.src = url;
        this.hideModal();
    },

    showGenericEditor(block) {
        this.prompt(`Edit ${block.type}`, 'Component Data (Markdown)', block.content, (val) => {
            block.content = val;
            editor.syncToState();
            editor.renderCanvas();
        });
    },

    /**
     * Navigation & Sharing
     */
    toggleDesktopNavigator() {
        const nav = document.getElementById('navigator-container');
        if (!nav) return;
        const isCollapsed = nav.classList.toggle('lg:collapsed-sidebar');
        
        const btn = document.querySelector('button[onclick="ui.toggleDesktopNavigator()"] .iconify');
        if (btn) btn.setAttribute('data-icon', isCollapsed ? 'mdi:chevron-right-box' : 'mdi:chevron-left-box');
        
        setTimeout(() => { if(window.editor) editor.updateScale(); }, 450);
    },

    updateNavigator(slides) {
        const navEl = document.getElementById('navigator-list');
        if (!navEl) return;
        navEl.innerHTML = '';
        
        slides.forEach((slide, index) => {
            const item = document.createElement('div');
            item.className = `nav-item group cursor-pointer p-2 rounded-2xl transition-all ${index === app.state.currentSlide ? 'active border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg' : 'border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`;
            item.onclick = () => editor.goToSlide(index);
            
            // Unique prefix for thumbnails to prevent DOM collision
            const blocksHTML = slide.blocks.map(b => components.renderBlock(b, `nav-${index}-`)).join('');
            
            let thumbContent = `<div class="nav-thumb-content scale-[0.08] origin-top-left pointer-events-none">${blocksHTML}</div>`;
            if (!blocksHTML.trim()) {
                thumbContent = `<div class="flex items-center justify-center h-full text-slate-200 dark:text-slate-800"><span class="iconify text-4xl" data-icon="mdi:file-outline"></span></div>`;
            }

            item.innerHTML = `
                <div class="nav-thumb bg-white dark:bg-slate-950 mb-2 flex items-center justify-center rounded-xl h-24 w-full relative overflow-hidden shadow-inner border dark:border-slate-800">
                    ${thumbContent}
                    <span class="absolute top-2 left-2 text-[10px] font-black text-slate-400 bg-white/80 dark:bg-black/50 px-2 py-0.5 rounded-lg z-10 shadow-sm">#${index + 1}</span>
                </div>
                <div class="text-[9px] font-black truncate text-slate-500 dark:text-slate-400 px-1 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">Slide ${index + 1}</div>
            `;
            navEl.appendChild(item);
        });
    },

    updateContextualToolbar(blockId) {
        const toolbar = document.getElementById('contextual-toolbar');
        const mainToolbar = document.getElementById('main-toolbar');
        const mobileTray = document.getElementById('mobile-selection-tray');
        const mobileTools = document.getElementById('mobile-selection-tools');
        const mobileType = document.getElementById('mobile-selection-type');
        
        if (!toolbar) return;

        if (!blockId) {
            toolbar.classList.add('hidden');
            if (mainToolbar) mainToolbar.classList.remove('hidden');
            this.toggleMobileTray(false);
            return;
        }

        const block = editor.currentSlideBlocks.find(b => b.id === blockId);
        if (!block) {
            toolbar.classList.add('hidden');
            this.toggleMobileTray(false);
            return;
        }

        const isMobile = window.innerWidth <= 1024;

        if (!isMobile) {
            if (mainToolbar) mainToolbar.classList.add('hidden');
            toolbar.classList.remove('hidden');
            toolbar.className = 'flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 p-1 rounded-xl border border-indigo-100 dark:border-indigo-800';
            
            let toolsHTML = `
                <span class="text-[8px] font-black uppercase text-indigo-500 px-3 select-none">${block.type}</span>
                <button onclick="ui.editBlock('${block.id}')" class="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all" title="Edit"><span class="iconify" data-icon="mdi:pencil"></span></button>
                <div class="w-px h-4 bg-indigo-200 dark:bg-indigo-800 mx-1"></div>
            `;

            if (block.type === 'text') {
                toolsHTML += `<button onclick="editor.formatSelected('bold')" class="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm transition-all"><span class="iconify" data-icon="mdi:format-bold"></span></button>`;
            }

            toolsHTML += `
                <button onclick="editor.duplicateBlock('${block.id}')" class="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm transition-all"><span class="iconify" data-icon="mdi:content-copy"></span></button>
                <button onclick="editor.deleteBlock('${block.id}')" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-all"><span class="iconify" data-icon="mdi:trash-can-outline"></span></button>
                <button onclick="editor.selectedBlockId = null; editor.highlightSelected();" class="ml-2 p-2 text-slate-400 hover:text-slate-600 rounded-lg"><span class="iconify" data-icon="mdi:close"></span></button>
            `;
            toolbar.innerHTML = toolsHTML;
        } else {
            if (mobileTray && mobileTools) {
                mobileType.textContent = block.type.toUpperCase() + " SETTINGS";
                mobileTools.innerHTML = `
                    <button onclick="ui.editBlock('${block.id}')" class="flex flex-col items-center gap-2"><span class="p-5 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl"><span class="iconify text-3xl" data-icon="mdi:pencil"></span></span></button>
                    <button onclick="editor.duplicateBlock('${block.id}')" class="flex flex-col items-center gap-2"><span class="p-5 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem]"><span class="iconify text-3xl" data-icon="mdi:content-copy"></span></span></button>
                    <button onclick="editor.deleteBlock('${block.id}'); ui.toggleMobileTray(false);" class="flex flex-col items-center gap-2"><span class="p-5 bg-red-100 dark:bg-red-900/50 text-red-500 rounded-[1.5rem]"><span class="iconify text-3xl" data-icon="mdi:trash-can-outline"></span></span></button>
                `;
                this.toggleMobileTray(true);
            }
        }
    },

    /**
     * Modal & Tray Primitives
     */
    showModal(config) {
        const modal = document.getElementById('modal-generic');
        const content = document.getElementById('modal-generic-content');
        if (!modal || !content) return;

        const { title, body, actions = [] } = config;

        content.innerHTML = `
            <div class="bottom-tray flex flex-col max-h-[90dvh]">
                <div class="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6 shrink-0 lg:hidden"></div>
                <div class="flex justify-between items-start mb-8 px-2">
                    <h2 class="text-3xl font-black tracking-tighter">${title}</h2>
                    <button onclick="ui.hideModal()" class="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><span class="iconify text-2xl" data-icon="mdi:close"></span></button>
                </div>
                <div class="flex-1 overflow-y-auto no-scrollbar mb-8 px-2 text-slate-600 dark:text-slate-400 font-medium leading-relaxed">${body}</div>
                <div class="flex flex-col sm:flex-row-reverse gap-4 pt-6 border-t dark:border-slate-800">
                    ${actions.length > 0 ? actions.map((act, i) => `
                        <button id="modal-act-${i}" class="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${act.primary ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/30' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                            ${act.label}
                        </button>
                    `).join('') : `<button onclick="ui.hideModal()" class="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Close</button>`}
                </div>
            </div>
        `;

        actions.forEach((act, i) => {
            const btn = document.getElementById(`modal-act-${i}`);
            if (btn) btn.onclick = (e) => { e.preventDefault(); if (act.callback) act.callback(); this.hideModal(); };
        });

        modal.classList.add('active');
    },

    hideModal() {
        const modal = document.getElementById('modal-generic');
        if (modal) modal.classList.remove('active');
    },

    toggleMobileTray(state) {
        const tray = document.getElementById('mobile-selection-tray');
        if (tray) state ? tray.classList.add('active') : tray.classList.remove('active');
    },

    toggleSettings() {
        this.showModal({
            title: "Settings",
            body: `
                <div class="space-y-6">
                    <div class="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800">
                        <div><p class="font-bold">Dark Mode</p><p class="text-[10px] text-slate-500 uppercase tracking-widest">Visual Theme</p></div>
                        <button onclick="ui.toggleTheme()" class="px-6 py-2 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 font-black text-[10px] uppercase shadow-sm">Toggle</button>
                    </div>
                    <div class="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800">
                        <div><p class="font-bold">Grid Snapping</p><p class="text-[10px] text-slate-500 uppercase tracking-widest">Alignment</p></div>
                        <button onclick="ui.toggleSnapping()" class="px-6 py-2 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 font-black text-[10px] uppercase shadow-sm">${app.state.gridSnapping ? 'ON' : 'OFF'}</button>
                    </div>
                    <div class="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 space-y-4">
                        <p class="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">API Credentials</p>
                        <input id="key-unsplash" type="text" placeholder="Unsplash Client ID" value="${assets.keys.unsplash}" class="w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-2xl p-4 text-xs font-mono">
                        <input id="key-pexels" type="text" placeholder="Pexels API Key" value="${assets.keys.pexels}" class="w-full bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-2xl p-4 text-xs font-mono">
                        <button onclick="ui.saveAssetKeys()" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Save Keys</button>
                    </div>
                </div>
            `,
            actions: [{ label: 'Done', primary: true }]
        });
    },

    toggleTheme() {
        document.documentElement.classList.toggle('dark');
        this.hideModal();
        setTimeout(() => this.toggleSettings(), 350);
    },

    toggleSnapping() {
        app.state.gridSnapping = !app.state.gridSnapping;
        app.saveToStorage();
        this.hideModal();
        this.notify('Snapping Updated', 'info');
        setTimeout(() => this.toggleSettings(), 350);
    },

    saveAssetKeys() {
        const unsplash = document.getElementById('key-unsplash').value;
        const pexels = document.getElementById('key-pexels').value;
        assets.saveKeys({ unsplash, pexels });
        this.notify('Keys Saved', 'success');
    },

    notify(message, type = 'info') {
        if (window.navigator.vibrate) window.navigator.vibrate(50);
        const container = document.getElementById('notification-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = `notification bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300`;
        const icon = type === 'success' ? 'mdi:check-circle' : (type === 'error' ? 'mdi:alert-circle' : 'mdi:information');
        el.innerHTML = `<span class="iconify text-2xl ${type === 'success' ? 'text-green-500' : 'text-indigo-500'}" data-icon="${icon}"></span><span class="font-bold text-sm">${message}</span>`;
        container.appendChild(el);
        setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 400); }, 3000);
    },

    prompt(title, label, defaultValue, callback) {
        const inputId = 'prompt-input-' + Math.random().toString(36).substr(2, 9);
        this.showModal({
            title,
            body: `
                <div class="space-y-2">
                    <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">${label}</label>
                    <textarea id="${inputId}" class="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-[2rem] p-6 outline-none focus:ring-2 ring-indigo-500 transition-all no-scrollbar resize-none font-medium leading-relaxed" rows="5">${defaultValue}</textarea>
                </div>
            `,
            actions: [{ label: 'Save', primary: true, callback: () => callback(document.getElementById(inputId).value) }, { label: 'Cancel', primary: false }]
        });
        setTimeout(() => { const i = document.getElementById(inputId); if(i){ i.focus(); i.select(); } }, 100);
    },

    showPollWizard() {
        this.showModal({
            title: "Create Live Poll",
            body: `
                <div class="space-y-4">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Question</label>
                        <input id="poll-wiz-q" type="text" placeholder="e.g. What is your favorite color?" class="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-indigo-500">
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Options (Comma separated)</label>
                        <textarea id="poll-wiz-opts" placeholder="Red, Blue, Green, Yellow" class="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-indigo-500 resize-none" rows="3"></textarea>
                    </div>
                </div>
            `,
            actions: [
                { label: 'Create Poll', primary: true, callback: () => {
                    const q = document.getElementById('poll-wiz-q').value;
                    const opts = document.getElementById('poll-wiz-opts').value.split(',').map(o => '- ' + o.trim()).join('\n');
                    const content = `# ${q}\n${opts}`;
                    editor.insertComponent('poll', content);
                }},
                { label: 'Cancel', primary: false }
            ]
        });
    },

    showBoardWizard() {
        this.showModal({
            title: "Create Interactive Board",
            body: `
                <div class="space-y-2">
                    <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Board Prompt</label>
                    <input id="board-wiz-p" type="text" placeholder="e.g. Share your ideas for the project..." class="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-amber-500">
                </div>
            `,
            actions: [
                { label: 'Create Board', primary: true, callback: () => {
                    const p = document.getElementById('board-wiz-p').value;
                    editor.insertComponent('board', p);
                }},
                { label: 'Cancel', primary: false }
            ]
        });
    },

    showCollaborateModal() {
        const isHosting = app.state.isHost && p2p.peer;
        const currentId = p2p.peer ? p2p.peer.id : '...';

        this.showModal({
            title: "Live Collaboration",
            body: `
                <div class="space-y-6">
                    <div class="p-6 bg-indigo-50 dark:bg-indigo-950/40 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900">
                        <div class="flex items-center gap-3 mb-4">
                            <span class="p-2 bg-indigo-600 rounded-xl text-white"><span class="iconify" data-icon="mdi:broadcast"></span></span>
                            <p class="font-black text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Host Session</p>
                        </div>
                        
                        <div class="space-y-4">
                            <div class="flex gap-2">
                                <input id="host-id-display" type="text" readonly value="${isHosting ? currentId : 'ID: ...'}" class="flex-1 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-mono outline-none">
                                <button onclick="p2p.initHost()" class="px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">Start</button>
                            </div>

                            <div id="host-share-tools" class="${isHosting ? '' : 'hidden'} space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div class="flex justify-center bg-white dark:bg-slate-950 p-6 rounded-3xl border dark:border-slate-800 shadow-inner">
                                    <div id="modal-qr-container" class="w-32 h-32 flex items-center justify-center"></div>
                                </div>
                                <button onclick="ui.copyJoinLink()" class="w-full py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                    <span class="iconify text-lg" data-icon="mdi:content-copy"></span> Copy Link
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="relative flex items-center justify-center py-2">
                        <div class="absolute w-full h-px bg-slate-200 dark:bg-slate-800"></div>
                        <span class="relative bg-white dark:bg-slate-900 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">OR</span>
                    </div>

                    <div class="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-[2.5rem] border dark:border-slate-800">
                        <div class="flex items-center gap-3 mb-4">
                            <span class="p-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400"><span class="iconify" data-icon="mdi:link-variant"></span></span>
                            <p class="font-black text-[10px] uppercase tracking-widest text-slate-500">Join Session</p>
                        </div>
                        <div class="flex gap-2">
                            <input id="join-id-input" type="text" placeholder="Enter Host ID" class="flex-1 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-mono outline-none">
                            <button onclick="p2p.joinSession()" class="px-6 bg-slate-900 dark:bg-slate-700 hover:bg-black text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">Join</button>
                        </div>
                    </div>
                </div>
            `,
            actions: [{ label: "Close", primary: false }]
        });

        if (isHosting) {
            setTimeout(() => this.generateQR('modal-qr-container', currentId, 128), 100);
        }
    },

    showNavigatorMenu(e) {
        if (e.preventDefault) e.preventDefault();
        const item = e.target.closest('.nav-item');
        if (!item) return;
        const index = Array.from(item.parentNode.children).indexOf(item);
        this.showContextMenu(e, [
            { label: 'Duplicate', icon: 'mdi:content-copy', action: () => { editor.duplicateSlide(index); this.toggleMobileNavigator(false); } },
            { label: 'Delete', icon: 'mdi:trash-can-outline', action: () => { editor.deleteSlide(index); this.toggleMobileNavigator(false); } },
            'divider',
            { label: 'Move Up', icon: 'mdi:arrow-up', action: () => editor.moveSlide(index, -1) },
            { label: 'Move Down', icon: 'mdi:arrow-down', action: () => editor.moveSlide(index, 1) }
        ]);
    },

    showEditorMenu(e) {
        const blockEl = e.target.closest('.component-block');
        let items = [
            { label: 'Text', icon: 'mdi:format-text', action: () => editor.insertComponent('text') },
            { label: 'Image', icon: 'mdi:image', action: () => editor.insertComponent('image') },
            { label: 'Poll', icon: 'mdi:poll', action: () => editor.insertComponent('poll') },
            { label: 'Board', icon: 'mdi:post-it-note-outline', action: () => editor.insertComponent('board') }
        ];
        if (blockEl) {
            items.unshift('divider');
            items.unshift({ label: 'Delete Block', icon: 'mdi:trash-can-outline', action: () => editor.deleteBlock(blockEl.id.replace('canvas-','')) });
            items.unshift({ label: 'Edit Content', icon: 'mdi:pencil', action: () => this.editBlock(blockEl.id.replace('canvas-','')) });
        }
        this.showContextMenu(e, items);
    },

    toggleMobileNavigator(state) {
        const nav = document.getElementById('navigator-container');
        if (!nav) return;
        state ? nav.classList.add('active') : nav.classList.remove('active');
        if (state && window.navigator.vibrate) window.navigator.vibrate(10);
    },

    showMobileAddMenu() {
        this.showModal({
            title: "Add Component",
            body: `<div class="grid grid-cols-2 gap-4 pb-10">
                <button onclick="editor.insertComponent('text'); ui.hideModal();" class="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 flex flex-col items-center gap-4 transition-all active:scale-90"><span class="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-500/30"><span class="iconify text-3xl" data-icon="mdi:format-text"></span></span><span class="font-black text-[10px] uppercase tracking-widest text-slate-500">Text</span></button>
                <button onclick="editor.insertComponent('image'); ui.hideModal();" class="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 flex flex-col items-center gap-4 transition-all active:scale-90"><span class="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-500/30"><span class="iconify text-3xl" data-icon="mdi:image"></span></span><span class="font-black text-[10px] uppercase tracking-widest text-slate-500">Image</span></button>
                <button onclick="ui.showPollWizard();" class="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 flex flex-col items-center gap-4 transition-all active:scale-90"><span class="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-500/30"><span class="iconify text-3xl" data-icon="mdi:poll"></span></span><span class="font-black text-[10px] uppercase tracking-widest text-slate-500">Poll</span></button>
                <button onclick="ui.showBoardWizard();" class="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 flex flex-col items-center gap-4 transition-all active:scale-90"><span class="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-500/30"><span class="iconify text-3xl" data-icon="mdi:post-it-note-outline"></span></span><span class="font-black text-[10px] uppercase tracking-widest text-slate-500">Board</span></button>
            </div>`,
            actions: []
        });
    },

    addLongPressListener(el, callback) {
        let timer;
        const start = (e) => {
            const pos = e.touches ? e.touches[0] : e;
            timer = setTimeout(() => {
                if (window.navigator.vibrate) window.navigator.vibrate(50);
                callback(pos);
            }, 600);
        };
        const cancel = () => clearTimeout(timer);
        el.addEventListener('touchstart', start, { passive: true });
        el.addEventListener('touchend', cancel, { passive: true });
        el.addEventListener('touchmove', cancel, { passive: true });
        el.addEventListener('mousedown', (e) => { if(e.button !== 0) return; start(e); });
        el.addEventListener('mouseup', cancel);
        el.addEventListener('mouseleave', cancel);
    },

    copyJoinLink() {
        const peerId = p2p.peer ? p2p.peer.id : null;
        if (!peerId) { this.notify('No active session', 'error'); return; }
        const url = window.location.href.split('#')[0] + '#join=' + peerId;
        navigator.clipboard.writeText(url).then(() => this.notify('Link Copied', 'success')).catch(() => this.notify('Copy Failed', 'error'));
    },

    generateQR(containerId, peerId, size = 128) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        new QRCode(container, { text: window.location.href.split('#')[0] + '#join=' + peerId, width: size, height: size, colorDark : "#312e81", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H });
    }
};
