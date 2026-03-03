/**
 * LiveDeck - Modular Components System (WYSIWYG V4)
 * 
 * Manages the registration, rendering, and interaction logic for all block types.
 */

const components = {
    registry: {},

    init() {
        console.log('Components System Initialized');
        this.registerDefaultComponents();
    },

    /**
     * Registers a new component type.
     * @param {Object} def Component definition.
     */
    register(def) {
        this.registry[def.type] = def;
    },

    /**
     * Renders a block object into an HTML string or DOM node.
     * @param {Object} block Block configuration.
     * @param {string} contextPrefix Prefix for the DOM ID to prevent collisions across views.
     * @returns {string} HTML string.
     */
    renderBlock(block, contextPrefix = 'canvas-') {
        let component = this.registry[block.type] || this.registry['text'];
        
        // Final fallback if registry is empty or 'text' is missing
        if (!component) {
            console.warn(`Component type "${block.type}" not found and no fallback available.`);
            return `<div class="component-block absolute" id="${contextPrefix}${block.id}" style="left:${block.x}px; top:${block.y}px;">Error: Missing Component</div>`;
        }

        let contentHTML = component.render(block, contextPrefix);
        
        // Wrap all blocks in an absolute positioned container
        return `
            <div id="${contextPrefix}${block.id}" class="component-block absolute" 
                 data-type="${block.type}"
                 style="
                    left: ${block.x}px; 
                    top: ${block.y}px; 
                    width: ${block.w === 'auto' ? 'auto' : block.w + 'px'}; 
                    height: ${block.h === 'auto' ? 'auto' : block.h + 'px'};
                    z-index: ${block.z || 1};
                 ">
                ${contentHTML}
            </div>
        `;
    },

    /**
     * Registers the built-in component types.
     */
    registerDefaultComponents() {
        this.register({
            type: 'text',
            render: (block) => {
                const content = block.content || '';
                let parsed = content;
                
                if (window.marked) {
                    try {
                        parsed = (typeof marked.parse === 'function') ? marked.parse(content) : marked(content);
                    } catch (e) {
                        console.error("Marked error:", e);
                    }
                }
                
                // Ensure there is at least some content to avoid invisible blocks
                if (!parsed.trim()) parsed = '<p class="opacity-20 italic text-sm">Empty text block...</p>';
                
                return `<div class="p-6 w-full h-full overflow-hidden markdown-content">${parsed}</div>`;
            }
        });

        this.register({
            type: 'poll',
            render: (block) => {
                const lines = block.content.split('\n').filter(l => l.trim() !== '');
                const question = lines[0] ? lines[0].replace(/^#+\s*/, '') : 'Poll Question?';
                const options = lines.slice(1).map(l => l.replace(/^[-*]\s*/, '').trim());
                
                let sessionPoll = (window.session && session.state.polls[block.id]) || { results: {}, published: false };
                let totalVotes = Object.values(sessionPoll.results).reduce((a, b) => a + b, 0);

                let optionsHTML = options.map((opt, i) => {
                    const votes = sessionPoll.results[i] || 0;
                    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    
                    if (sessionPoll.published || app.state.isHost) {
                        return `
                            <div class="w-full p-4 bg-white/10 border border-white/20 rounded-2xl mb-2 relative overflow-hidden flex justify-between items-center group">
                                <div class="absolute inset-y-0 left-0 bg-indigo-500/50 transition-all duration-500" style="width: ${pct}%"></div>
                                <span class="font-bold relative z-10">${opt}</span>
                                <span class="font-black relative z-10">${pct}% (${votes})</span>
                            </div>
                        `;
                    } else {
                        return `
                            <button onclick="components.submitVote('${block.id}', ${i})" class="w-full p-4 bg-white/10 hover:bg-indigo-500/20 border border-white/20 rounded-2xl text-left transition-all mb-2 flex justify-between items-center group pointer-events-auto">
                                <span class="font-bold">${opt}</span>
                            </button>
                        `;
                    }
                }).join('');

                return `
                    <div class="interactive-card p-8 w-full h-full shadow-2xl bg-indigo-900/80 text-white border-indigo-500/50 flex flex-col">
                        <h3 class="text-3xl font-black tracking-tight mb-6 flex items-center gap-3">
                            <span class="p-2 bg-indigo-500 rounded-lg"><span class="iconify" data-icon="mdi:poll"></span></span>
                            ${question}
                        </h3>
                        <div class="flex-1 overflow-y-auto no-scrollbar">${optionsHTML}</div>
                    </div>
                `;
            }
        });

        this.register({
            type: 'image',
            render: (block) => {
                const url = block.content.trim() || 'https://via.placeholder.com/800x600?text=Image+URL';
                return `<img src="${url}" class="w-full h-full object-cover rounded-xl shadow-lg border dark:border-slate-700" alt="Image" draggable="false">`;
            }
        });

        this.register({
            type: 'board',
            render: (block) => {
                const prompt = block.content.trim() || 'Add your thoughts...';
                let sessionBoard = (window.session && session.state.boards[block.id]) || [];
                
                let notesHTML = sessionBoard.map(data => `
                    <div class="${data.color} p-4 rounded-xl text-slate-900 shadow-xl transform rotate-${(Math.random()*6-3).toFixed(0)}">
                        <p class="font-bold text-sm leading-tight">${data.text}</p>
                    </div>
                `).join('');

                if (sessionBoard.length === 0) {
                    notesHTML = `<div class="col-span-full text-center text-amber-500/50 italic">No notes yet...</div>`;
                }

                return `
                    <div class="interactive-card p-8 w-full h-full shadow-2xl bg-amber-900/80 text-white border-amber-500/50 flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-2xl font-black flex items-center gap-3">
                                <span class="p-2 bg-amber-500 rounded-lg"><span class="iconify" data-icon="mdi:post-it-note-outline"></span></span>
                                ${prompt}
                            </h3>
                            <button onclick="components.addBoardNote('${block.id}', '${prompt}')" class="bg-amber-500 px-4 py-2 rounded-xl font-bold uppercase hover:bg-amber-600 transition-all pointer-events-auto text-slate-900">+ Note</button>
                        </div>
                        <div id="board-${block.id}" class="flex-1 grid grid-cols-2 gap-4 overflow-y-auto content-start">
                             ${notesHTML}
                        </div>
                    </div>
                `;
            }
        });

        // Feature 1: Collaborative Whiteboard Registry
        this.register({
            type: 'whiteboard',
            render: (block) => {
                return `
                    <div class="interactive-card p-4 w-full h-full shadow-2xl bg-white text-slate-900 border-slate-200 flex flex-col relative overflow-hidden group">
                        <div class="absolute top-4 left-4 z-10 flex gap-2">
                            <button onclick="components.setWhiteboardTool('${block.id}', 'pen')" class="p-2 bg-indigo-600 text-white rounded-lg shadow-sm border border-indigo-700 pointer-events-auto"><span class="iconify" data-icon="mdi:pencil"></span></button>
                            <button onclick="components.clearWhiteboard('${block.id}')" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg shadow-sm border border-slate-200 pointer-events-auto"><span class="iconify" data-icon="mdi:delete-sweep"></span></button>
                        </div>
                        <canvas id="whiteboard-${block.id}" 
                                class="whiteboard-canvas flex-1 w-full h-full rounded-2xl cursor-crosshair bg-slate-50 border-2 border-dashed border-slate-200 pointer-events-auto"
                                onmousedown="components.handleWhiteboardStart(event, '${block.id}')"
                                ontouchstart="components.handleWhiteboardStart(event, '${block.id}')"></canvas>
                        <div class="absolute bottom-4 right-4 text-[8px] font-black uppercase text-slate-300">Whiteboard Component</div>
                    </div>
                `;
            }
        });
    },

    /**
     * Whiteboard Logic
     */
    whiteboardState: {}, // { blockId: { ctx, isDrawing, lastPos, tool } }

    initWhiteboard(id) {
        const canvas = document.getElementById(`whiteboard-${id}`);
        if (!canvas) return;
        
        // Ensure canvas internal size matches displayed size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#6366f1';

        this.whiteboardState[id] = {
            ctx,
            isDrawing: false,
            lastPos: { x: 0, y: 0 },
            tool: 'pen'
        };
    },

    handleWhiteboardStart(e, id) {
        if (!this.whiteboardState[id]) this.initWhiteboard(id);
        const state = this.whiteboardState[id];
        state.isDrawing = true;
        state.lastPos = this.getWhiteboardPos(e, id);

        const moveHandler = (moveE) => this.handleWhiteboardMove(moveE, id);
        const endHandler = () => {
            state.isDrawing = false;
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('mouseup', endHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('touchend', endHandler);
        };

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('touchmove', moveHandler, { passive: false });
        window.addEventListener('touchend', endHandler);
    },

    handleWhiteboardMove(e, id) {
        const state = this.whiteboardState[id];
        if (!state || !state.isDrawing) return;
        if (e.type === 'touchmove') e.preventDefault();

        const currentPos = this.getWhiteboardPos(e, id);
        this.drawOnWhiteboard(id, state.lastPos, currentPos, state.tool, true);
        state.lastPos = currentPos;
    },

    getWhiteboardPos(e, id) {
        const canvas = document.getElementById(`whiteboard-${id}`);
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Account for scaling if needed, but clientRect is usually enough for relative pos
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    },

    drawOnWhiteboard(id, from, to, tool, shouldBroadcast = false) {
        if (!this.whiteboardState[id]) this.initWhiteboard(id);
        const state = this.whiteboardState[id];
        const ctx = state.ctx;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        if (shouldBroadcast && window.p2p) {
            p2p.broadcast({
                type: 'whiteboard-draw',
                blockId: id,
                from,
                to,
                tool
            });
        }
    },

    clearWhiteboard(id, shouldBroadcast = true) {
        if (!this.whiteboardState[id]) this.initWhiteboard(id);
        const state = this.whiteboardState[id];
        state.ctx.clearRect(0, 0, state.ctx.canvas.width, state.ctx.canvas.height);
        
        if (shouldBroadcast && window.p2p) {
            p2p.broadcast({ type: 'whiteboard-clear', blockId: id });
        }
    },

    setWhiteboardTool(id, tool) {
        if (!this.whiteboardState[id]) this.initWhiteboard(id);
        this.whiteboardState[id].tool = tool;
        ui.notify(`Whiteboard Tool: ${tool.toUpperCase()}`, 'info');
    },

    renderParticipantView(block) {
        if (block.type === 'poll') {
            const lines = block.content.split('\n').filter(l => l.trim() !== '');
            const question = lines[0] ? lines[0].replace(/^#+\s*/, '') : 'Poll Question?';
            const options = lines.slice(1).map(l => l.replace(/^[-*]\s*/, '').trim());
            
            let optionsHTML = options.map((opt, i) => `
                <button onclick="components.submitVote('${block.id}', ${i})" class="w-full p-4 bg-white/10 hover:bg-indigo-500/20 border border-white/20 rounded-2xl text-left transition-all mb-2 flex justify-between items-center group">
                    <span class="font-bold">${opt}</span>
                </button>
            `).join('');

            return `
                <div class="interactive-card p-6 w-full shadow-2xl bg-indigo-900/80 text-white border-indigo-500/50 flex flex-col mb-6">
                    <h3 class="text-xl font-black tracking-tight mb-4 flex items-center gap-3">
                        <span class="p-2 bg-indigo-500 rounded-lg"><span class="iconify" data-icon="mdi:poll"></span></span>
                        ${question}
                    </h3>
                    <div id="participant-poll-${block.id}">${optionsHTML}</div>
                </div>
            `;
        } else if (block.type === 'board') {
            const prompt = block.content.trim() || 'Add your thoughts...';
            return `
                <div class="interactive-card p-6 w-full shadow-2xl bg-amber-900/80 text-white border-amber-500/50 flex flex-col mb-6">
                    <h3 class="text-xl font-black tracking-tight mb-4 flex items-center gap-3">
                        <span class="p-2 bg-amber-500 rounded-lg"><span class="iconify" data-icon="mdi:post-it-note-outline"></span></span>
                        ${prompt}
                    </h3>
                    <div class="space-y-3">
                        <textarea id="board-input-${block.id}" class="w-full bg-slate-900/50 border border-white/20 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-amber-500 transition-all resize-none" rows="3" placeholder="Type your response..."></textarea>
                        <button onclick="components.submitBoardNote('${block.id}', '${prompt}')" class="w-full bg-amber-500 px-4 py-3 rounded-xl font-bold uppercase hover:bg-amber-600 transition-all shadow-lg text-slate-900">Send Note</button>
                    </div>
                </div>
            `;
        }
        return '';
    },

    submitVote(blockId, optIdx) {
        if (app.state.isHost) {
            if(window.session) session.recordVote(blockId, optIdx);
        } else if (p2p && p2p.peer) {
            p2p.broadcast({ type: 'vote', blockId, optIdx });
        }
        ui.notify('Vote recorded!', 'success');
    },

    submitBoardNote(blockId, prompt) {
        const input = document.getElementById(`board-input-${blockId}`);
        const note = input ? input.value : null;
        if (!note) return;
        
        const color = ['bg-yellow-200', 'bg-blue-200', 'bg-pink-200', 'bg-green-200'][Math.floor(Math.random()*4)];
        const data = { id: Math.random().toString(36).substr(2, 9), text: note, color, prompt };
        
        if (app.state.isHost) {
            if(window.session) session.addBoardNote(blockId, data);
        } else if(p2p && p2p.peer) {
            p2p.broadcast({ type: 'board-note', blockId, data });
        }
        
        if (input) input.value = '';
        ui.notify('Note sent!', 'success');
    },

    renderParticipantView(block) {
        if (block.type === 'poll') {
            const lines = block.content.split('\n').filter(l => l.trim() !== '');
            const question = lines[0] ? lines[0].replace(/^#+\s*/, '') : 'Poll Question?';
            const options = lines.slice(1).map(l => l.replace(/^[-*]\s*/, '').trim());
            
            let sessionPoll = (window.session && session.state.polls[block.id]) || { results: {}, published: false };
            let totalVotes = Object.values(sessionPoll.results).reduce((a, b) => a + b, 0);

            let optionsHTML = options.map((opt, i) => {
                const votes = sessionPoll.results[i] || 0;
                const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                
                if (sessionPoll.published) {
                    return `
                        <div class="w-full p-5 bg-white/10 border border-white/20 rounded-[1.5rem] mb-3 relative overflow-hidden flex justify-between items-center">
                            <div class="absolute inset-y-0 left-0 bg-indigo-500/40 transition-all duration-1000" style="width: ${pct}%"></div>
                            <span class="font-bold relative z-10">${opt}</span>
                            <span class="font-black relative z-10 text-xs">${pct}%</span>
                        </div>
                    `;
                } else {
                    return `
                        <button onclick="components.submitVote('${block.id}', ${i})" class="w-full p-5 bg-white/5 hover:bg-indigo-600 border border-white/10 rounded-[1.5rem] text-left transition-all mb-3 font-bold active:scale-95">
                            ${opt}
                        </button>
                    `;
                }
            }).join('');

            return `
                <div class="bg-indigo-900/40 p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl mb-8">
                    <h3 class="text-2xl font-black tracking-tighter mb-6 flex items-center gap-3">
                        <span class="p-2 bg-indigo-600 rounded-xl"><span class="iconify" data-icon="mdi:poll"></span></span>
                        ${question}
                    </h3>
                    <div id="participant-poll-${block.id}">${optionsHTML}</div>
                </div>
            `;
        } else if (block.type === 'board') {
            const prompt = block.content.trim() || 'Collaborative Board';
            return `
                <div class="bg-amber-900/40 p-8 rounded-[2.5rem] border border-amber-500/20 shadow-2xl mb-8 text-left">
                    <h3 class="text-2xl font-black tracking-tighter mb-6 flex items-center gap-3">
                        <span class="p-2 bg-amber-600 rounded-xl"><span class="iconify text-slate-900" data-icon="mdi:post-it-note-outline"></span></span>
                        ${prompt}
                    </h3>
                    <div class="space-y-4">
                        <textarea id="board-input-${block.id}" class="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:ring-2 ring-amber-500 transition-all resize-none" rows="3" placeholder="Type your response..."></textarea>
                        <button onclick="components.submitBoardNote('${block.id}', '${prompt}')" class="w-full bg-amber-500 py-4 rounded-2xl font-black uppercase tracking-widest text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-xl">Post Note</button>
                    </div>
                </div>
            `;
        }
        return '';
    },

    askQuestion() {
        ui.prompt("Ask a Question", "Type your question for the presenter", "", (text) => {
            if (!text) return;
            if (app.state.isHost) {
                session.addQuestion(text, 'Host');
            } else if (p2p && p2p.peer) {
                p2p.broadcast({ type: 'question', text, user: 'Participant' });
            }
            ui.notify('Question sent!', 'success');
        });
    },

    voteQuestion(id) {
        if (app.state.isHost) {
            session.voteQuestion(id);
        } else if (p2p && p2p.peer) {
            p2p.broadcast({ type: 'vote-question', id });
        }
    },

    renderBoardNote(data) {
        const container = document.getElementById(`board-${data.prompt.replace(/\s/g, '')}`);
        if (!container) return;
        
        const empty = container.querySelector('.italic');
        if (empty) empty.remove();
        
        const div = document.createElement('div');
        div.className = `${data.color} p-4 rounded-xl text-slate-900 shadow-xl transform rotate-${(Math.random()*6-3).toFixed(0)}`;
        div.innerHTML = `<p class="font-bold text-sm leading-tight">${data.text}</p>`;
        container.appendChild(div);
    },

    handleRemoteUpdate(data) {
        console.log("Remote update received:", data);
        if (data.component === 'board') {
            this.renderBoardNote(data);
        }
        // Additional handling for poll results could go here
    },

    addReactionBar() {
        if (document.getElementById('reaction-bar')) return;
        const bar = document.createElement('div');
        bar.id = 'reaction-bar';
        bar.className = 'fixed bottom-8 right-6 flex flex-col items-end gap-3 z-[90] pointer-events-auto';
        
        const categories = [
            { id: 'emoji', icon: 'mdi:emoticon-outline', color: 'bg-yellow-500', items: ['👍', '❤️', '🔥', '😂', '😮', '🎉'], isText: false },
            { id: 'phrase', icon: 'mdi:message-text-outline', color: 'bg-indigo-500', items: ["Wow!", "Faster!", "Slower!", "Question?"], isText: true },
            { id: 'super', icon: 'mdi:flash-outline', color: 'bg-red-500', isSuper: true }
        ];

        categories.forEach(cat => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex flex-row-reverse items-center gap-3 group';
            
            const panel = document.createElement('div');
            panel.id = `reaction-panel-${cat.id}`;
            panel.className = 'hidden items-center gap-2 p-2 bg-slate-900/95 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl animate-in slide-in-from-right-4 duration-300';
            
            if (cat.isSuper) {
                const s1 = document.createElement('button');
                s1.className = 'px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black rounded-full transition-all';
                s1.textContent = 'MEGA 🔥';
                s1.onclick = () => { if(window.gamification) gamification.triggerSuperAnimation('🔥', false); this.toggleReactionPanel(cat.id); };
                panel.appendChild(s1);
                
                const s2 = document.createElement('button');
                s2.className = 'px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-full transition-all';
                s2.textContent = 'MEGA "WOW!"';
                s2.onclick = () => { if(window.gamification) gamification.triggerSuperAnimation('Wow!', true); this.toggleReactionPanel(cat.id); };
                panel.appendChild(s2);
            } else {
                cat.items.forEach(item => {
                    const btn = document.createElement('button');
                    btn.className = `flex items-center justify-center transition-all hover:scale-125 cursor-pointer ${cat.isText ? 'px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold text-white' : 'w-9 h-9 rounded-full bg-white/5 text-xl'}`;
                    btn.textContent = item;
                    btn.onclick = () => {
                        this.sendReaction(item, cat.isText);
                        this.toggleReactionPanel(cat.id);
                    };
                    panel.appendChild(btn);
                });
            }

            const trigger = document.createElement('button');
            trigger.className = `w-12 h-12 rounded-full ${cat.color} text-white shadow-xl flex items-center justify-center hover:scale-110 transition-all cursor-pointer border-4 border-white/10`;
            trigger.innerHTML = `<span class="iconify text-xl" data-icon="${cat.icon}"></span>`;
            trigger.onclick = () => this.toggleReactionPanel(cat.id);

            wrapper.appendChild(trigger);
            wrapper.appendChild(panel);
            bar.appendChild(wrapper);
        });

        const target = document.getElementById('view-player');
        if (target) target.appendChild(bar);
    },

    toggleReactionPanel(id) {
        const panels = document.querySelectorAll('[id^="reaction-panel-"]');
        panels.forEach(p => {
            if (p.id === `reaction-panel-${id}`) {
                p.classList.toggle('hidden');
                p.classList.toggle('flex');
            } else {
                p.classList.add('hidden');
                p.classList.remove('flex');
            }
        });
    },

    sendReaction(content, isText = false) {
        if (window.p2p) {
            p2p.showReaction(content, isText);
            p2p.broadcast({ type: 'reaction', content, isText });
            if (window.gamification) {
                gamification.trackReaction(content, isText);
                if (app.state.isHost) player.updateStats('reactions');
            }
        }
    }
};

