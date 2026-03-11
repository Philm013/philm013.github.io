/**
 * LiveDeck - Presentation Player Module (V5 with Lobby & Visibility Modes)
 */

const player = {
    canvas: null,
    slides: [],
    currentIndex: 0,
    hudLocked: false,
    inLobby: true,
    sidebarOpen: false,
    viewerUiVisible: true,
    stats: {
        reactions: 0,
        peers: 0
    },
    activeTool: 'none', // 'none', 'laser', 'pen'
    drawings: [], // { type, points, color }
    hudTimeout: null,

    init() {
        this.canvas = document.getElementById('player-canvas');
        this.laserCanvas = document.getElementById('laser-layer');
        if (this.laserCanvas) {
            this.laserCtx = this.laserCanvas.getContext('2d');
            this.resizeLaserCanvas();
            window.addEventListener('resize', () => this.resizeLaserCanvas());
        }
        this.bindEvents();
    },

    toggleHud() {
        const hud = document.getElementById('player-hud');
        if (!hud) return;
        
        if (hud.classList.contains('visible')) {
            hud.classList.remove('visible');
        } else {
            hud.classList.add('visible');
            // Auto-hide after 5 seconds of inactivity unless locked
            if (!this.hudLocked) {
                clearTimeout(this.hudTimeout);
                this.hudTimeout = setTimeout(() => hud.classList.remove('visible'), 5000);
            }
        }
    },

    resizeLaserCanvas() {
        if (!this.laserCanvas) return;
        this.laserCanvas.width = window.innerWidth;
        this.laserCanvas.height = window.innerHeight;
    },

    setTool(tool) {
        this.activeTool = tool;
        const layer = document.getElementById('laser-layer');
        if (layer) {
            if (tool === 'none') {
                layer.classList.add('pointer-events-none');
                layer.style.cursor = 'default';
            } else {
                layer.classList.remove('pointer-events-none');
                layer.style.cursor = tool === 'laser' ? 'none' : 'crosshair';
            }
        }
        ui.notify(`Tool: ${tool.toUpperCase()}`, 'info');
    },

    clearDrawings() {
        this.drawings = [];
        this.renderLaserLayer();
        if (app.state.isHost) p2p.broadcast({ type: 'clear-laser' });
    },

    renderLaserLayer() {
        if (!this.laserCtx) return;
        const ctx = this.laserCtx;
        ctx.clearRect(0, 0, this.laserCanvas.width, this.laserCanvas.height);

        // Render persistent pen drawings
        this.drawings.forEach(d => {
            if (d.type === 'pen' && d.points.length > 1) {
                ctx.beginPath();
                ctx.strokeStyle = d.color || '#6366f1';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.moveTo(d.points[0].x, d.points[0].y);
                for (let i = 1; i < d.points.length; i++) {
                    ctx.lineTo(d.points[i].x, d.points[i].y);
                }
                ctx.stroke();
            }
        });
    },

    handleLaserMove(x, y) {
        if (!this.laserCtx) return;
        this.renderLaserLayer(); // Clear previous laser dot
        
        if (this.activeTool === 'laser') {
            const ctx = this.laserCtx;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'red';
            ctx.fill();
            
            // Broadcast to participants
            if (app.state.isHost) p2p.broadcast({ type: 'laser-move', x, y });
        }
    },

    updateParticipantList() {
        const container = document.getElementById('participant-list');
        if (!container) return;
        
        const peers = p2p.connections.map(c => ({ id: c.peer, name: c.metadata?.name || 'Anonymous' }));
        if (peers.length === 0) {
            container.innerHTML = '<p class="text-[9px] text-slate-600 italic">No one here yet...</p>';
            return;
        }

        container.innerHTML = peers.map(p => `
            <div class="flex items-center gap-2 bg-white/5 p-2 rounded-lg">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span class="text-[9px] font-bold text-slate-300 truncate">${p.name}</span>
                <span class="text-[7px] text-slate-600 font-mono ml-auto">${p.id.substr(0,4)}</span>
            </div>
        `).join('');
    },

    togglePresenterTools() {
        if (!app.state.isHost) return;
        const sidebar = document.getElementById('presenter-sidebar');
        this.sidebarOpen = !this.sidebarOpen;
        
        if (this.sidebarOpen) {
            sidebar.classList.remove('hidden');
            setTimeout(() => sidebar.classList.remove('translate-x-full'), 10);
            this.updatePresenterConsole();
        } else {
            sidebar.classList.add('translate-x-full');
            setTimeout(() => sidebar.classList.add('hidden'), 500);
        }
    },

    togglePresentationUI() {
        this.viewerUiVisible = !this.viewerUiVisible;
        const hud = document.getElementById('player-hud');
        const reactions = document.getElementById('reaction-bar');
        
        if (this.viewerUiVisible) {
            hud.style.display = 'flex';
            if (reactions) reactions.style.display = 'flex';
            ui.notify('Viewer UI Enabled', 'info');
        } else {
            hud.style.display = 'none';
            if (reactions) reactions.style.display = 'none';
            ui.notify('Viewer UI Hidden (Presenter Mode)', 'info');
        }
    },

    updateStats(type) {
        if (!app.state.isHost) return;
        if (type === 'reactions') this.stats.reactions++;
        if (type === 'peers') this.stats.peers = p2p.connections.length;
        
        const peerEl = document.getElementById('stat-peers');
        const reactEl = document.getElementById('stat-reactions');
        if (peerEl) peerEl.textContent = this.stats.peers;
        if (reactEl) reactEl.textContent = this.stats.reactions;
    },

    updatePresenterConsole() {
        if (!this.sidebarOpen || !app.state.isHost) return;

        // Next slide preview
        const nextIdx = this.currentIndex + 1;
        const nextRender = document.getElementById('next-slide-render');
        const nextEmpty = document.getElementById('next-slide-empty');
        
        if (nextIdx < this.slides.length) {
            if (nextRender) {
                // Feature 5: Fixed Visual Preview in Console
                nextRender.innerHTML = this.slides[nextIdx].blocks.map(b => components.renderBlock(b, 'next-')).join('');
                nextRender.classList.remove('hidden');
            }
            if (nextEmpty) nextEmpty.classList.add('hidden');
        } else {
            if (nextRender) nextRender.classList.add('hidden');
            if (nextEmpty) nextEmpty.classList.remove('hidden');
        }

        // Feature 3: Professional Markdown Presenter Notes
        const currentSlide = this.slides[this.currentIndex];
        const notesEl = document.getElementById('presenter-notes');
        if (notesEl && currentSlide) {
            const notesBlock = currentSlide.blocks.find(b => b.type === 'notes');
            notesEl.innerHTML = notesBlock ? marked.parse(notesBlock.content) : '<p class="opacity-30">No notes for this slide.</p>';
        }

        // Live Component Controls
        const controlsContainer = document.getElementById('presenter-live-controls');
        if (controlsContainer && currentSlide) {
            const interactiveBlocks = currentSlide.blocks.filter(b => b.type === 'poll' || b.type === 'board');
            
            if (interactiveBlocks.length === 0) {
                controlsContainer.innerHTML = '<p class="text-xs text-slate-600 italic">No interactive elements on this slide.</p>';
            } else {
                let html = '';
                interactiveBlocks.forEach(b => {
                    if (b.type === 'poll') {
                        const sessionPoll = window.session && session.state.polls[b.id];
                        const totalVotes = sessionPoll ? Object.values(sessionPoll.results).reduce((x, y) => x + y, 0) : 0;
                        const isPublished = sessionPoll && sessionPoll.published;
                        
                        html += `
                            <div class="bg-indigo-900/30 border border-indigo-500/30 p-3 rounded-xl mb-3">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-[10px] font-bold text-indigo-400 uppercase">Poll</span>
                                    <span class="text-xs font-black">${totalVotes} Votes</span>
                                </div>
                                <button onclick="session.publishPoll('${b.id}')" class="w-full py-2 rounded-lg text-xs font-bold transition-all ${isPublished ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}" ${isPublished ? 'disabled' : ''}>
                                    ${isPublished ? 'Results Published' : 'Publish Results to Audience'}
                                </button>
                            </div>
                        `;
                    }
                });
                controlsContainer.innerHTML = html;
            }
        }

        // Q&A List in Console
        const qaContainer = document.getElementById('presenter-qa-list');
        if (qaContainer) {
            const questions = (window.session && session.state.questions) || [];
            if (questions.length === 0) {
                qaContainer.innerHTML = '<p class="text-[9px] text-slate-600 italic">No questions from the audience yet.</p>';
            } else {
                qaContainer.innerHTML = questions.sort((a,b) => b.votes - a.votes).map(q => `
                    <div class="bg-slate-800/50 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                        <div class="flex-1">
                            <p class="text-[8px] font-black text-indigo-400 uppercase">${q.user}</p>
                            <p class="text-xs text-slate-300 leading-tight">${q.text}</p>
                        </div>
                        <div class="flex flex-col items-center gap-1 bg-white/5 p-1.5 rounded-lg min-w-[30px]">
                            <span class="iconify text-xs text-pink-500" data-icon="mdi:heart"></span>
                            <span class="text-[9px] font-black">${q.votes}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        this.updateStats('peers');
    },

    bindEvents() {
        // Laser / Pen Events
        const laserLayer = document.getElementById('laser-layer');
        if (laserLayer) {
            let isDrawing = false;
            let currentLine = null;
            let lastTapTime = 0;

            const handleStart = (e) => {
                const now = Date.now();
                const isDoubleTap = now - lastTapTime < 300;
                lastTapTime = now;

                if (this.activeTool === 'none') {
                    // Single tap to toggle HUD in player mode
                    if (!isDoubleTap) {
                        this.toggleHud();
                    }
                    return;
                }
                const pos = e.touches ? e.touches[0] : e;
                const rect = laserLayer.getBoundingClientRect();
                const x = pos.clientX - rect.left;
                const y = pos.clientY - rect.top;

                if (this.activeTool === 'laser') {
                    this.handleLaserMove(x, y);
                } else if (this.activeTool === 'pen') {
                    isDrawing = true;
                    currentLine = { type: 'pen', points: [{x, y}], color: '#6366f1' };
                    this.drawings.push(currentLine);
                }
            };

            const handleMove = (e) => {
                if (this.activeTool === 'none') return;
                const pos = e.touches ? e.touches[0] : e;
                const rect = laserLayer.getBoundingClientRect();
                const x = pos.clientX - rect.left;
                const y = pos.clientY - rect.top;

                if (this.activeTool === 'laser') {
                    this.handleLaserMove(x, y);
                } else if (this.activeTool === 'pen' && isDrawing) {
                    currentLine.points.push({x, y});
                    this.renderLaserLayer();
                    if (app.state.isHost) p2p.broadcast({ type: 'pen-draw', points: currentLine.points });
                }
            };

            const handleEnd = () => {
                isDrawing = false;
                currentLine = null;
            };

            laserLayer.addEventListener('mousedown', handleStart);
            laserLayer.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            
            laserLayer.addEventListener('touchstart', (e) => { 
                // Don't prevent default here to allow click events/tap detection unless tool active
                if (this.activeTool !== 'none') e.preventDefault(); 
                handleStart(e); 
            }, { passive: false });
            laserLayer.addEventListener('touchmove', (e) => { 
                if (this.activeTool !== 'none') e.preventDefault(); 
                handleMove(e); 
            }, { passive: false });
            laserLayer.addEventListener('touchend', handleEnd);
        }

        window.addEventListener('keydown', (e) => {
            if (app.state.view !== 'player') return;
            
            // HUD Toggle Shortcut
            if (e.key.toLowerCase() === 'h') {
                this.toggleHudLock();
                this.toggleHud();
                return;
            }

            if (this.inLobby) return;
            
            if (e.key === 'ArrowRight' || e.key === ' ') this.next();
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'Escape') app.switchView('creator');
        });

        // Swipe Gestures
        let touchStartX = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.inLobby) return;
            let touchEndX = e.changedTouches[0].screenX;
            if (touchEndX < touchStartX - 50) this.next();
            if (touchEndX > touchStartX + 50) this.prev();
        }, { passive: true });

        // Add a click listener to the canvas to toggle HUD as well
        this.canvas.addEventListener('click', (e) => {
            // Only toggle if not clicking an interactive element
            if (!e.target.closest('button') && !e.target.closest('.interactive-card')) {
                this.toggleHud();
            }
        });

        window.addEventListener('resize', () => {
            if (app.state.view === 'player') this.updateView();
        });
    },

    banterInterval: null,
    banterList: [
        "Polishing the pixels...",
        "Reticulating splines...",
        "Downloading the presenter's jokes...",
        "Charging the laser pointer...",
        "Warming up the audience...",
        "Herding the cats...",
        "Tuning the microphones..."
    ],

    render() {
        this.canvas = document.getElementById('player-canvas');
        if (!this.canvas) return;

        this.slides = parser.parseDeck(app.state.currentDeck.content);
        this.currentIndex = Math.min(app.state.currentSlide, this.slides.length - 1);
        
        const isActuallyParticipant = p2p.peer && !app.state.isHost;

        // Reset sidebar button visibility
        const btnTools = document.getElementById('btn-presenter-tools');
        if (btnTools) {
            if (app.state.isHost) btnTools.classList.remove('hidden');
            else btnTools.classList.add('hidden');
        }

        // --- LOBBY VS STAGE LOGIC ---
        if (this.inLobby) {
            this.canvas.classList.add('opacity-0');
            if (!isActuallyParticipant) {
                this.showHostLobby();
            } else {
                this.showParticipantLobby();
            }
        } else {
            // Already presenting, refresh the stage
            this.startFromLobby(true);
        }

        this.updateHUD();
        components.addReactionBar();
    },

    showHostLobby() {
        const lobby = document.getElementById('player-lobby');
        if (lobby) {
            lobby.classList.remove('hidden');
            lobby.classList.add('flex');
        }
        const pLobby = document.getElementById('participant-lobby');
        if (pLobby) {
            pLobby.classList.add('hidden');
            pLobby.classList.remove('flex');
        }
        const titleEl = document.getElementById('lobby-deck-title');
        if (titleEl) titleEl.textContent = app.state.currentDeck.title;
        this.generateJoinQR();
    },

    renderMobileSnapped() {
        this.canvas.innerHTML = '';
        this.canvas.className = 'has-snapping w-full h-full';
        
        this.slides.forEach((slide, index) => {
            const section = document.createElement('section');
            section.className = 'snap-section';
            section.id = `slide-${index}`;
            
            const container = document.createElement('div');
            container.className = 'slide-content relative';
            
            // On mobile, scale to fit the 100vw width
            const scale = window.innerWidth / 1920;
            container.style.transform = `scale(${scale}) perspective(1px) translateZ(0)`;

            container.innerHTML = slide.blocks.map(b => components.renderBlock(b, 'player-')).join('');
            
            section.appendChild(container);
            this.canvas.appendChild(section);
        });

        this.canvas.onscroll = () => {
            const idx = Math.round(this.canvas.scrollTop / window.innerHeight);
            if (idx !== this.currentIndex) {
                this.currentIndex = idx;
                this.updateHUD();
                this.syncHost();
                this.updatePresenterConsole();
            }
        };
    },

    showParticipantLobby() {
        document.getElementById('player-lobby').classList.add('hidden');
        document.getElementById('player-lobby').classList.remove('flex');
        const pl = document.getElementById('participant-lobby');
        pl.classList.remove('hidden');
        pl.classList.add('flex');

        const banterEl = document.getElementById('participant-banter');
        if (this.banterInterval) clearInterval(this.banterInterval);
        
        this.banterInterval = setInterval(() => {
            if (banterEl) {
                const text = this.banterList[Math.floor(Math.random() * this.banterList.length)];
                banterEl.style.opacity = 0;
                setTimeout(() => {
                    banterEl.textContent = text;
                    banterEl.style.opacity = 1;
                }, 300);
            }
        }, 4000);
    },

    startFromLobby(isRefresh = false) {
        this.inLobby = false;
        
        const hostLobby = document.getElementById('player-lobby');
        const partLobby = document.getElementById('participant-lobby');
        this.canvas = this.canvas || document.getElementById('player-canvas');
        
        if (hostLobby) { hostLobby.classList.add('hidden'); hostLobby.classList.remove('flex'); }
        if (partLobby) { partLobby.classList.add('hidden'); partLobby.classList.remove('flex'); }
        
        if (this.canvas) {
            this.canvas.classList.remove('opacity-0');
            this.canvas.innerHTML = '';
            this.canvas.className = 'w-full h-full relative';
        }
        
        if (this.banterInterval) clearInterval(this.banterInterval);

        const isActuallyParticipant = p2p.peer && !app.state.isHost;

        // --- DUAL RENDERING PATH ---
        if (isActuallyParticipant && app.state.audienceMode === 'interactive') {
            this.renderParticipantDashboard();
        } else if (window.innerWidth <= 1024) {
            this.renderMobileSnapped();
        } else if (app.state.isSpatial) {
            this.renderSpatial();
        } else {
            this.renderLinear();
        }
        
        this.updateView();

        if (!isRefresh && app.state.isHost && p2p.peer) {
            p2p.broadcast({ type: 'start-presentation' });
        }
    },

    generateJoinQR() {
        const container = document.getElementById('lobby-qr-container');
        const idDisplay = document.getElementById('lobby-session-id');
        if (!container) return;

        container.innerHTML = '';
        
        // Auto-init host if in player mode and not connected
        if (!p2p.peer) {
            p2p.initHost();
            container.innerHTML = '<span class="text-slate-300 animate-pulse">Initializing Session...</span>';
            return;
        }

        const peerId = p2p.peer ? p2p.peer.id : '...';
        idDisplay.textContent = peerId;

        if (peerId === '...') {
            container.innerHTML = '<span class="text-slate-300 animate-pulse">Waiting for PeerJS...</span>';
            return;
        }

        ui.generateQR('lobby-qr-container', peerId, 256);
    },

    toggleHudLock() {
        this.hudLocked = !this.hudLocked;
        const hud = document.getElementById('player-hud');
        const btn = document.getElementById('btn-hud-lock');
        
        if (this.hudLocked) {
            hud.classList.add('locked');
            btn.classList.add('text-indigo-500');
            ui.notify('Player Controls Locked', 'info');
        } else {
            hud.classList.remove('locked');
            btn.classList.remove('text-indigo-500');
            ui.notify('Player Controls Auto-hide', 'info');
        }
    },

    renderLinear() {
        this.canvas.innerHTML = '';
        // If participant and in interactive mode, render the native dashboard instead of full slides
        if (app.state.audienceMode === 'interactive' && !app.state.isHost) {
            this.renderParticipantDashboard();
            return;
        }

        this.slides.forEach((slide, index) => {
            const frame = document.createElement('div');
            frame.className = `slide-frame absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-900 overflow-hidden`;
            frame.id = `slide-${index}`;
            
            const container = document.createElement('div');
            container.className = 'slide-content relative';
            container.style.width = '1920px';
            container.style.height = '1080px';
            container.style.padding = '0';

            let blocksHTML = slide.blocks.map(b => components.renderBlock(b, 'player-')).join('');
            container.innerHTML = blocksHTML;
            
            frame.appendChild(container);
            this.canvas.appendChild(frame);
        });
        this.updateLinearPositions();
    },

    renderSpatial() {
        this.canvas.innerHTML = '';
        if (app.state.audienceMode === 'interactive' && !app.state.isHost) {
            this.renderParticipantDashboard();
            return;
        }

        const container = document.createElement('div');
        container.className = 'spatial-container w-full h-full relative';
        container.id = 'spatial-world';
        this.canvas.appendChild(container);

        this.slides.forEach((slide, index) => {
            const slideEl = document.createElement('div');
            slideEl.className = 'spatial-slide flex items-center justify-center';
            
            const angle = (index / this.slides.length) * Math.PI * 2;
            const radius = 1500 * Math.max(1, this.slides.length / 4);
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            const rotationY = (angle * 180 / Math.PI);

            slideEl.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${rotationY}deg)`;
            
            const contentContainer = document.createElement('div');
            contentContainer.className = 'slide-content relative';
            contentContainer.style.width = '1920px';
            contentContainer.style.height = '1080px';
            contentContainer.style.padding = '0';

            let blocksHTML = slide.blocks.map(b => components.renderBlock(b, 'player-')).join('');
            contentContainer.innerHTML = blocksHTML;
            
            slideEl.appendChild(contentContainer);
            container.appendChild(slideEl);
        });

        this.updateSpatialCamera();
    },

    next() {
        if (this.currentIndex < this.slides.length - 1) {
            this.goToSlide(this.currentIndex + 1);
        }
    },

    prev() {
        if (this.currentIndex > 0) {
            this.goToSlide(this.currentIndex - 1);
        }
    },

    goToSlide(index) {
        this.currentIndex = index;
        app.state.currentSlide = index;
        
        const isMobile = window.innerWidth <= 1024;
        const isActuallyParticipant = p2p.peer && !app.state.isHost;

        if (isActuallyParticipant && app.state.audienceMode === 'interactive') {
            this.renderParticipantDashboard();
        } else if (isMobile) {
            const target = document.getElementById(`slide-${index}`);
            if (target && this.canvas) {
                this.canvas.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
            }
        } else {
            this.updateView();
        }

        this.syncHost();
        this.updatePresenterConsole();
        this.updateHUD();
    },

    updateView() {
        if (this.inLobby) return;

        // Ensure presenter tools button is visible if host
        const btnTools = document.getElementById('btn-presenter-tools');
        if (btnTools) {
            if (app.state.isHost) btnTools.classList.remove('hidden');
            else btnTools.classList.add('hidden');
        }

        // Apply audience mode visibility (only for non-hosts)
        if (app.state.audienceMode === 'interactive' && !app.state.isHost) {
            this.canvas.classList.add('audience-interactive-only');
        } else {
            this.canvas.classList.remove('audience-interactive-only');
        }

        if (app.state.isSpatial) {
            this.updateSpatialCamera();
        } else {
            this.updateLinearPositions();
        }
        this.updateHUD();
    },

    updateLinearPositions() {
        const width = 1920;
        const height = 1080;
        const scale = Math.min(window.innerWidth / width, window.innerHeight / height);

        this.slides.forEach((_, index) => {
            const frame = document.getElementById(`slide-${index}`);
            if (!frame) return;
            
            const content = frame.querySelector('.slide-content');
            if (content) content.style.transform = `scale(${scale}) perspective(1px) translateZ(0)`;

            if (index === this.currentIndex) {
                frame.style.opacity = '1';
                frame.style.visibility = 'visible';
                frame.style.transform = 'translateX(0)';
                frame.style.zIndex = '10';
            } else if (index < this.currentIndex) {
                frame.style.opacity = '0';
                frame.style.visibility = 'hidden';
                frame.style.transform = 'translateX(-100%)';
                frame.style.zIndex = '0';
            } else {
                frame.style.opacity = '0';
                frame.style.visibility = 'hidden';
                frame.style.transform = 'translateX(100%)';
                frame.style.zIndex = '0';
            }
        });
    },

    updateSpatialCamera() {
        const container = document.getElementById('spatial-world');
        if (!container) return;

        const gap = 1500;
        const radius = gap * Math.max(1, this.slides.length / 4);
        const angle = (this.currentIndex / this.slides.length) * Math.PI * 2;
        
        const x = -Math.sin(angle) * radius;
        const z = -Math.cos(angle) * radius;
        const rotationY = -(angle * 180 / Math.PI);

        const viewportScale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080) * 0.8;

        container.style.transformOrigin = 'center center';
        container.style.transform = `scale(${viewportScale}) perspective(1px) translateZ(-1000px) rotateY(${rotationY}deg) translate3d(${x}px, 0, ${z}px)`;
        
        setTimeout(() => {
            container.style.transform = `scale(${viewportScale}) perspective(1px) translateZ(0) rotateY(${rotationY}deg) translate3d(${x}px, 0, ${z}px)`;
        }, 50);
    },

    renderParticipantDashboard() {
        this.canvas.innerHTML = '';
        this.canvas.className = 'w-full h-full overflow-y-auto bg-slate-950 text-white p-6 flex flex-col items-center no-scrollbar';

        const currentSlide = this.slides[this.currentIndex];
        if (!currentSlide) return;

        // Interaction Components Container
        let html = '<div class="w-full max-w-md space-y-8 pb-12 pt-8">';
        
        const interactiveBlocks = currentSlide.blocks.filter(b => b.type !== 'text' && b.type !== 'image' && b.type !== 'notes');
        if (interactiveBlocks.length === 0) {
            html += `
                <div class="flex flex-col items-center justify-center text-center space-y-6 py-12">
                    <div class="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 shadow-inner border border-white/5">
                        <span class="iconify text-4xl" data-icon="mdi:eye-outline"></span>
                    </div>
                    <div>
                        <h3 class="text-xl font-black mb-2 uppercase tracking-tighter">Eyes on Screen</h3>
                        <p class="text-xs text-slate-500 leading-relaxed">The presenter is showing content on the main screen. Stay tuned for the next interaction!</p>
                    </div>
                </div>
            `;
        } else {
            interactiveBlocks.forEach(b => {
                html += components.renderParticipantView(b);
            });
        }

        // Q&A Section (Persistent on Dashboard)
        const qList = (window.session && session.state.questions) || [];
        const qHTML = qList.sort((a,b) => b.votes - a.votes).map(q => `
            <div class="flex items-start gap-4 bg-white/5 p-5 rounded-3xl border border-white/5">
                <div class="flex-1">
                    <p class="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">${q.user}</p>
                    <p class="text-sm font-bold text-slate-200 leading-tight">${q.text}</p>
                </div>
                <button onclick="components.voteQuestion('${q.id}')" class="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-2xl transition-all">
                    <span class="iconify text-2xl ${q.votes > 0 ? 'text-pink-500' : 'text-slate-600'}" data-icon="mdi:heart"></span>
                    <span class="text-[10px] font-black">${q.votes}</span>
                </button>
            </div>
        `).join('') || '<p class="text-center py-12 text-slate-600 italic text-xs">Be the first to ask a question!</p>';

        html += `
            <div class="bg-slate-900/50 rounded-[3rem] p-8 border border-white/5 mb-24 shadow-2xl">
                <div class="flex justify-between items-center mb-8">
                    <div class="flex items-center gap-3">
                        <span class="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20 text-white"><span class="iconify text-xl" data-icon="mdi:frequently-asked-questions"></span></span>
                        <h3 class="text-2xl font-black tracking-tighter uppercase">Q&A</h3>
                    </div>
                    <button onclick="components.askQuestion()" class="bg-indigo-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Ask</button>
                </div>
                <div class="space-y-4">${qHTML}</div>
            </div>
        </div>`;

        this.canvas.innerHTML = html;
        components.addReactionBar();
    },

    updateHUD() {
        document.getElementById('current-slide-num').textContent = this.currentIndex + 1;
        document.getElementById('total-slides-num').textContent = this.slides.length;
        
        // Mobile visibility logic for nav buttons
        const hud = document.getElementById('player-hud');
        if (hud) {
            if (!app.state.isHost) {
                hud.classList.add('is-participant');
            } else {
                hud.classList.remove('is-participant');
            }
        }
    },

    syncHost() {
        if (app.state.isHost && p2p.peer) {
            p2p.broadcast({
                type: 'slide-change',
                index: this.currentIndex
            });
        }
    }
};
