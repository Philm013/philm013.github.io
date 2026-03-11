/**
 * LiveDeck - Main Application Controller
 */

const app = {
    state: {
        view: 'creator', // 'creator' or 'player'
        isSpatial: false,
        gridSnapping: true,
        smartAlignment: true,
        currentDeck: {
            title: 'Welcome to LiveDeck',
            content: `:::block {"id":"blk-123","type":"text","x":400,"y":200,"w":1120,"h":300,"z":1}
# Welcome to LiveDeck 4.0
### The Ultimate Interactive Presentation Engine
:::

---

:::block {"id":"blk-456","type":"text","x":400,"y":100,"w":1120,"h":150,"z":1}
## Real-Time Audience Engagement
:::

:::block {"id":"blk-789","type":"poll","x":400,"y":300,"w":1120,"h":500,"z":2}
What is your favorite new feature?
- WYSIWYG Absolute Editor
- Professional 3D Spatial Engine
- Real-Time P2P Polls & Boards
- Standalone HTML Export
:::`,
            settings: {
                theme: 'light',
                spatialLayout: 'linear' // or 'grid', 'circle', 'custom'
            }
        },
        currentSlide: 0,
        gridSnapping: true,
        audienceMode: 'full', // 'full' or 'interactive'
        peer: null,
        connection: null,
        isHost: false
    },

    async init() {
        console.log('LiveDeck Initializing...');
        
        // Mobile Detection for CSS
        if (window.innerWidth <= 1024) {
            document.body.classList.add('is-mobile');
        }

        // Initialize Database First
        await db.init();

        // Load from storage if available
        await this.loadFromStorage();
        
        // Initialize UI
        this.updateUI();
        this.bindEvents();
        
        // Initialize Modules
        assets.init();
        session.init();
        components.init(); // MUST BE FIRST: Register block types
        components.addReactionBar(); // Add persistent reaction bar
        ui.init();
        editor.init();
        player.init();
        p2p.init();
        onboarding.init();
        gamification.init();

        // Check for Dark Mode preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        }

        // Check for join ID in URL hash
        const hash = window.location.hash;
        if (hash.startsWith('#join=')) {
            const hostId = hash.split('=')[1];
            setTimeout(() => {
                document.getElementById('join-id-input').value = hostId;
                p2p.joinSession();
            }, 1000);
        } else {
            // Trigger initial render for the current view
            this.switchView(this.state.view);
        }
    },

    setAudienceMode(mode) {
        this.state.audienceMode = mode;
        this.updateUI();
        this.saveToStorage();
        
        if (app.state.isHost) {
            p2p.broadcast({
                type: 'audience-mode-change',
                mode: mode
            });
        }
        
        const label = mode === 'full' ? 'Full Slides' : 'Interactive Layer Only';
        ui.notify(`Audience Mode: ${label}`, 'info');
    },

    bindEvents() {
        // Title Change
        const titleInput = document.getElementById('deck-title');
        if (titleInput) {
            titleInput.addEventListener('input', (e) => {
                this.state.currentDeck.title = e.target.value;
                this.saveToStorage();
            });
        }

        // Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveToStorage();
            }
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'Enter')) {
                e.preventDefault();
                this.presentFromCurrent();
            }
        });
    },

    switchView(viewName) {
        this.state.view = viewName;
        this.updateUI();
        
        // Handle Mobile Bottom Nav visibility
        const bottomNav = document.getElementById('bottom-nav');
        if (bottomNav) {
            if (viewName === 'player') {
                bottomNav.style.transform = 'translateY(100%)';
                setTimeout(() => bottomNav.classList.add('hidden'), 300);
            } else {
                bottomNav.classList.remove('hidden');
                setTimeout(() => bottomNav.style.transform = 'translateY(0)', 10);
            }
        }

        if (viewName === 'player') {
            player.render();
        } else {
            editor.renderCanvas();
        }
        
        this.saveToStorage();
    },

    presentFromCurrent() {
        this.switchView('player');
        ui.notify('Starting Presentation', 'info');
    },

    toggleMenu() {
        if (window.ui) ui.showCollaborateModal();
    },

    toggleSpatialMode() {
        this.state.isSpatial = !this.state.isSpatial;
        this.updateUI();
        this.saveToStorage();
        
        const mode = this.state.isSpatial ? 'Spatial' : 'Linear';
        ui.notify(`${mode} Mode Active`, 'success');

        if (this.state.view === 'player') {
            player.render();
        } else {
            editor.renderCanvas();
        }
    },

    updateUI() {
        const titleEl = document.getElementById('deck-title');
        if (titleEl) titleEl.value = this.state.currentDeck.title;
        
        document.body.classList.remove('view-creator-active', 'view-player-active');
        document.body.classList.add(`view-${this.state.view}-active`);

        // Update Button States
        const btnCreator = document.getElementById('btn-view-creator');
        const btnPlayer = document.getElementById('btn-view-player');
        
        if (btnCreator && btnPlayer) {
            if (this.state.view === 'creator') {
                btnCreator.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm');
                btnCreator.classList.remove('text-slate-500');
                btnPlayer.classList.add('text-slate-500');
                btnPlayer.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm');
            } else {
                btnPlayer.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm');
                btnPlayer.classList.remove('text-slate-500');
                btnCreator.classList.add('text-slate-500');
                btnCreator.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm');
            }
        }

        // Update spatial button state
        const btn = document.getElementById('btn-spatial');
        if (btn) {
            if (this.state.isSpatial) {
                btn.classList.add('text-indigo-600', 'bg-indigo-50');
            } else {
                btn.classList.remove('text-indigo-600', 'bg-indigo-50');
            }
        }

        // Update audience mode buttons
        const btnFull = document.getElementById('btn-mode-full');
        const btnLayer = document.getElementById('btn-mode-layer');
        const modeCont = document.getElementById('audience-mode-container');

        if (this.state.isHost) {
            if (modeCont) modeCont.classList.remove('hidden');
            if (btnFull && btnLayer) {
                if (this.state.audienceMode === 'full') {
                    btnFull.className = 'px-2 py-1 rounded bg-white dark:bg-slate-700 shadow-sm text-indigo-600';
                    btnLayer.className = 'px-2 py-1 rounded text-slate-500';
                } else {
                    btnLayer.className = 'px-2 py-1 rounded bg-white dark:bg-slate-700 shadow-sm text-indigo-600';
                    btnFull.className = 'px-2 py-1 rounded text-slate-500';
                }
            }
        } else {
            if (modeCont) modeCont.classList.add('hidden');
        }
    },

    async saveToStorage() {
        const stateToSave = {
            view: this.state.view,
            currentDeck: this.state.currentDeck,
            isSpatial: this.state.isSpatial,
            gridSnapping: this.state.gridSnapping,
            audienceMode: this.state.audienceMode
        };
        await db.saveSetting('LiveDeck_State', stateToSave);
    },

    async loadFromStorage() {
        const saved = await db.getSetting('LiveDeck_State');
        if (saved) {
            this.state.view = saved.view || 'creator';
            this.state.currentDeck = saved.currentDeck || this.state.currentDeck;
            this.state.isSpatial = saved.isSpatial || false;
            this.state.gridSnapping = saved.gridSnapping !== undefined ? saved.gridSnapping : true;
            this.state.audienceMode = saved.audienceMode || 'full';
        }
    }
};

// Start the app
window.addEventListener('DOMContentLoaded', () => app.init());
