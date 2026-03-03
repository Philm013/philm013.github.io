/**
 * LiveDeck - P2P Collaboration Module (PeerJS)
 */

const p2p = {
    peer: null,
    connections: [],
    
    init() {
        console.log('P2P Module Initialized');
    },

    initHost() {
        app.state.isHost = true; // Set immediately to avoid race conditions
        this.peer = new Peer();
        
        this.peer.on('open', (id) => {
            const display = document.getElementById('host-id-display');
            if (display) display.value = id;

            const lobbyId = document.getElementById('lobby-session-id');
            if (lobbyId) lobbyId.textContent = id;

            this.updateStatus('Hosting', 'green');
            ui.notify('Session Hosted Successfully', 'success');
            
            // Show share tools in modal if they exist
            const tools = document.getElementById('host-share-tools');
            if (tools) tools.classList.remove('hidden');
            
            const qrContainer = document.getElementById('modal-qr-container');
            if (qrContainer) ui.generateQR('modal-qr-container', id, 128);

            // Update Lobby QR if currently in player view
            if (app.state.view === 'player') player.generateJoinQR();
        });

        this.peer.on('connection', (conn) => {
            this.connections.push(conn);
            this.setupConnection(conn);
            
            // Send current state to new peer
            conn.on('open', () => {
                conn.send({
                    type: 'init',
                    deck: app.state.currentDeck,
                    currentIndex: player.currentIndex,
                    audienceMode: app.state.audienceMode,
                    inLobby: player.inLobby,
                    sessionState: window.session ? session.state : {}
                });
            });
        });

        this.peer.on('error', (err) => {
            console.error('Peer Error:', err);
            this.updateStatus('Error', 'red');
        });
    },

    joinSession() {
        const hostId = document.getElementById('join-id-input').value;
        if (!hostId) return;

        this.peer = new Peer();
        
        this.peer.on('open', (id) => {
            const conn = this.peer.connect(hostId);
            this.connections.push(conn);
            this.setupConnection(conn);
            this.updateStatus('Joining...', 'yellow');
            
            // Assume participant goes directly to lobby while joining
            app.switchView('player');
            player.showParticipantLobby();
        });

        this.peer.on('error', (err) => {
            console.error('Peer Error:', err);
            this.updateStatus('Failed', 'red');
            ui.notify('Failed to connect to host', 'error');
        });
    },

    setupConnection(conn) {
        conn.on('data', (data) => {
            console.log('Received P2P Data:', data.type);
            this.handleData(data);
        });

        conn.on('open', () => {
            this.updateStatus('Connected', 'green');
            ui.notify('Connected to Host', 'success');
            app.toggleMenu(); // Close modal on success
            if (app.state.isHost) player.updateParticipantList();
        });

        conn.on('close', () => {
            this.updateStatus('Offline', 'red');
            if (app.state.isHost) player.updateParticipantList();
        });
    },

    handleData(data) {
        switch(data.type) {
            case 'init':
                if (data.sessionState && window.session) session.handleSync(data.sessionState);
                app.state.currentDeck = data.deck;
                app.state.audienceMode = data.audienceMode || 'full';
                app.updateUI();
                player.currentIndex = data.currentIndex;
                
                if (data.inLobby) {
                    app.switchView('player');
                    player.showParticipantLobby();
                } else {
                    app.switchView('player');
                    player.startFromLobby();
                }
                break;
                
            case 'start-presentation':
                if (!app.state.isHost) {
                    player.startFromLobby();
                }
                break;

            case 'slide-change':
                if (!app.state.isHost) {
                    player.currentIndex = data.index;
                    player.updateView();
                }
                break;

            case 'audience-mode-change':
                app.state.audienceMode = data.mode;
                player.updateView(); // Rerender or adjust visibility
                ui.notify(`Presenter changed mode: ${data.mode}`, 'info');
                break;

            case 'session-sync':
                if (!app.state.isHost && window.session) {
                    session.handleSync(data.state);
                }
                break;

            case 'vote':
                if (app.state.isHost && window.session) {
                    session.recordVote(data.blockId, data.optIdx);
                }
                break;

            case 'board-note':
                if (app.state.isHost && window.session) {
                    session.addBoardNote(data.blockId, data.data);
                }
                break;

            case 'question':
                if (app.state.isHost && window.session) {
                    session.addQuestion(data.text, data.user);
                }
                break;

            case 'vote-question':
                if (app.state.isHost && window.session) {
                    session.voteQuestion(data.id);
                }
                break;

            case 'laser-move':
                if (!app.state.isHost) {
                    player.activeTool = 'laser';
                    player.handleLaserMove(data.x, data.y);
                }
                break;

            case 'pen-draw':
                if (!app.state.isHost) {
                    player.drawings.push({ type: 'pen', points: data.points, color: '#6366f1' });
                    player.renderLaserLayer();
                }
                break;

            case 'clear-laser':
                if (!app.state.isHost) {
                    player.clearDrawings();
                }
                break;

            case 'whiteboard-draw':
                if (window.components) {
                    components.drawOnWhiteboard(data.blockId, data.from, data.to, data.tool, false);
                }
                break;

            case 'whiteboard-clear':
                if (window.components) {
                    components.clearWhiteboard(data.blockId, false);
                }
                break;

            case 'component-update':
                // Legacy support
                if (window.components && typeof components.handleRemoteUpdate === 'function') {
                    components.handleRemoteUpdate(data);
                }
                break;

            case 'reaction':
                this.showReaction(data.content || data.emoji, data.isText);
                if (window.gamification) {
                    gamification.trackReaction(data.content || data.emoji, data.isText);
                    // Update host stats if applicable
                    if (app.state.isHost && app.state.view === 'player') {
                        player.updateStats('reactions');
                    }
                }
                break;
        }
    },

    broadcast(data) {
        this.connections.forEach(conn => {
            if (conn.open) conn.send(data);
        });
    },

    updateStatus(text, color) {
        const el = document.getElementById('p2p-status');
        el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-${color}-500 animate-pulse"></span> ${text}`;
        el.className = `flex items-center gap-2 px-3 py-1 bg-${color}-500/10 text-${color}-500 rounded-full text-[10px] font-black tracking-widest uppercase`;
    },

    showReaction(content, isText = false) {
        const div = document.createElement('div');
        div.className = `fixed bottom-0 pointer-events-none z-[100] ${isText ? 'animate-float-up-text bg-white/90 text-indigo-900 px-4 py-2 rounded-2xl shadow-xl font-black text-lg border-2 border-indigo-200' : 'text-4xl animate-float-up'}`;
        div.style.left = (Math.random() * 60 + 20) + '%';
        div.textContent = content;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    }
};
