const $ = id => document.getElementById(id);
const genId = () => Math.random().toString(36).substr(2, 9);

/* --- CONSTANTS --- */
window.TYPES = {
    notice: { col: '#fef3c7', bor: '#d97706', icon: '👁️', lbl: 'Notice' },
    wonder: { col: '#bae6fd', bor: '#0284c7', icon: '❓', lbl: 'Wonder' },
    idea:   { col: '#bbf7d0', bor: '#16a34a', icon: '💡', lbl: 'Idea' },
    test:   { col: '#fecaca', bor: '#dc2626', icon: '🧪', lbl: 'Testable' },
    meta:   { col: '#f8fafc', bor: '#64748b', icon: '📝', lbl: 'Note' },
    sketch: { col: '#ffffff', bor: '#64748b', icon: '✏️', lbl: 'Sketch' },
    claim: { col: '#fffbeb', bor: '#d97706', icon: '🤔', lbl: 'Claim' },
    evidence: { col: '#f0f9ff', bor: '#0284c7', icon: '📊', lbl: 'Evidence' },
    reasoning: { col: '#f0fdf4', bor: '#16a34a', icon: '🔗', lbl: 'Reasoning' }
};

/* --- STATE & HISTORY --- */
window.State = {
    id: null, name: 'My Board',
    items: [], ink: [], selection: [],
    view: { x: 0, y: 0, z: 1 },
    tool: 'pan', students: {}, drag: null,
    
    // NEW: Centralized Activity State
    // Types: 'LOCKED' | 'OPEN' | 'ZONE_ACT' | 'WIDGET_ACT' | 'EXIT_TICKET'
    activity: { type: 'LOCKED', targetId: null, payload: null }, 
    
    activeSorts: {}, comments: [],
    touch: { dist: 0 },
    draw: { color: '#ef4444', width: 4 },
    isCoHost: false
};

window.ActionHistory = {
    stack: [], index: -1,
    push: () => {
        const snapshot = JSON.stringify({ items: State.items, ink: State.ink });
        if(ActionHistory.index > -1 && ActionHistory.stack[ActionHistory.index] === snapshot) return;
        ActionHistory.stack = ActionHistory.stack.slice(0, ActionHistory.index + 1);
        ActionHistory.stack.push(snapshot);
        if(ActionHistory.stack.length > 20) ActionHistory.stack.shift(); else ActionHistory.index++;
    },
    undo: () => {
        if(ActionHistory.index > 0) {
            ActionHistory.index--;
            const s = JSON.parse(ActionHistory.stack[ActionHistory.index]);
            State.items = s.items; State.ink = s.ink;
            Render.all(); Board.save(true);
            UI.toast("Undo");
            if(State.isCoHost || Network.peer) Network.broadcast({type:'FULL_SYNC', items:State.items, ink:State.ink});
        }
    },
    redo: () => {
        if (ActionHistory.index < ActionHistory.stack.length - 1) {
            ActionHistory.index++;
            const s = JSON.parse(ActionHistory.stack[ActionHistory.index]);
            State.items = s.items; State.ink = s.ink;
            Render.all(); Board.save(true);
            UI.toast("Redo");
            if (State.isCoHost || Network.peer) Network.broadcast({type:'FULL_SYNC', items:State.items, ink:State.ink});
        }
    }
};

/* --- AUTO SCROLL SYSTEM --- */
window.AutoScroll = {
    active: false,
    vx: 0, vy: 0,
    margin: 50,
    // Max pixel shift per frame relative to screen size (not world size)
    maxSpeed: 15,
    interval: null,
    lastEvt: null,
    
    start: () => {
        if(AutoScroll.active) return;
        AutoScroll.active = true;
        AutoScroll.loop();
    },
    
    stop: () => {
        AutoScroll.active = false;
        AutoScroll.vx = 0; AutoScroll.vy = 0;
        if(AutoScroll.interval) cancelAnimationFrame(AutoScroll.interval);
        AutoScroll.interval = null;
    },
    
    check: (e) => {
        AutoScroll.lastEvt = e;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const m = AutoScroll.margin;
        
        AutoScroll.vx = 0; 
        AutoScroll.vy = 0;

        // Calculate intensity (0 to 1) based on closeness to edge
        // Apply maxSpeed and adjust for zoom level so it feels consistent
        // We clamp the zoom divisor so it doesn't go crazy when zoomed way out
        const zFactor = Math.max(0.5, State.view.z);

        if (e.clientX < m) {
            const intensity = (m - e.clientX) / m;
            AutoScroll.vx = (AutoScroll.maxSpeed * intensity) / zFactor;
        } else if (e.clientX > w - m) {
            const intensity = (e.clientX - (w - m)) / m;
            AutoScroll.vx = -(AutoScroll.maxSpeed * intensity) / zFactor;
        }
        
        if (e.clientY < m) {
            const intensity = (m - e.clientY) / m;
            AutoScroll.vy = (AutoScroll.maxSpeed * intensity) / zFactor;
        } else if (e.clientY > h - m) {
            const intensity = (e.clientY - (h - m)) / m;
            AutoScroll.vy = -(AutoScroll.maxSpeed * intensity) / zFactor;
        }
    },
    
    loop: () => {
        if (!AutoScroll.active) return;
        
        if (AutoScroll.vx !== 0 || AutoScroll.vy !== 0) {
            State.view.x += AutoScroll.vx;
            State.view.y += AutoScroll.vy;
            Render.sync();
            
            // Re-trigger move logic to update item position relative to new view
            if (State.drag && State.drag.mode === 'move' && AutoScroll.lastEvt) {
                Modes.Move.move(AutoScroll.lastEvt);
            }
        }
        
        AutoScroll.interval = requestAnimationFrame(AutoScroll.loop);
    }
};

/* --- HIERARCHY & DATA MANAGER --- */
window.HierarchyManager = {
    link: (childId, zoneId, index = -1) => {
        const zone = State.items.find(i => i.id === zoneId);
        const child = State.items.find(i => i.id === childId);
        if (!zone || !child || zone.type !== 'zone') return;

        if (child.parentZone && child.parentZone !== zoneId) {
            HierarchyManager.unlink(child.id);
        }

        if (!zone.children) zone.children = [];
        
        const currentIdx = zone.children.indexOf(childId);
        if (currentIdx > -1) zone.children.splice(currentIdx, 1);

        if (index >= 0 && index <= zone.children.length) {
            zone.children.splice(index, 0, childId);
        } else {
            zone.children.push(childId);
        }
        child.parentZone = zoneId;
    },

    unlink: (childId) => {
        const child = State.items.find(i => i.id === childId);
        if (!child || !child.parentZone) return;

        const zone = State.items.find(i => i.id === child.parentZone);
        if (zone && zone.children) {
            zone.children = zone.children.filter(id => id !== childId);
        }
        delete child.parentZone;
    },

    getDescendants: (itemId) => {
        const item = State.items.find(i => i.id === itemId);
        if (!item || item.type !== 'zone' || !item.children) {
            return [];
        }
        let descendants = [...item.children];
        item.children.forEach(childId => {
            descendants.push(...HierarchyManager.getDescendants(childId));
        });
        return descendants;
    },

    delete: (ids) => {
        if (!Array.isArray(ids)) ids = [ids];
        const itemsToDelete = new Set(ids);
        
        ids.forEach(id => {
            const item = State.items.find(i => i.id === id);
            if (item && item.groupId) {
                State.items.forEach(i => {
                    if (i.groupId === item.groupId) itemsToDelete.add(i.id);
                });
            }
        });

        const finalIds = Array.from(itemsToDelete);
        finalIds.forEach(id => {
            const item = State.items.find(i => i.id === id);
            if (!item) return;
            if (item.type === 'zone' && item.children) {
                [...item.children].forEach(cid => HierarchyManager.unlink(cid));
            }
            if (item.parentZone) {
                HierarchyManager.unlink(id);
            }
            Network.broadcast({type:'DELETE_NOTE', id: id});
        });

        State.items = State.items.filter(i => !finalIds.includes(i.id));
        State.selection = State.selection.filter(id => !finalIds.includes(id));
        Render.all();
        ActionHistory.push();
        Board.save(true);
    }
};


/* --- ROBUST LAYOUT ENGINE --- */
window.LayoutSystem = {
    padding: 20,
    gap: 15,
    headerH: 50,
    
    // Main entry point
    update: (zoneId, ghostItem = null, ghostIndex = -1) => {
        const zone = State.items.find(i => i.id === zoneId);
        if(!zone || !zone.children) return;

        // 1. Get real children objects
        let items = zone.children
            .map(id => State.items.find(i => i.id === id))
            .filter(i => i); // Filter out potential nulls

        // 2. Filter out the item currently being dragged (it will be represented by ghostItem)
        if(ghostItem) {
            items = items.filter(i => i.id !== ghostItem.id);
        }

        // 3. Insert Ghost Item for calculation if present
        if (ghostItem && ghostIndex > -1) {
            // Clamp index
            if(ghostIndex > items.length) ghostIndex = items.length;
            items.splice(ghostIndex, 0, ghostItem);
        }

        // 4. Delegate to specific layout strategy
        let contentHeight = 0;
        if (zone.zoneType === 'cer') {
            contentHeight = LayoutSystem.layoutColumns(zone, items, 3);
        } else if (zone.zoneType === 'consensus') {
            contentHeight = LayoutSystem.layoutConsensus(zone, items);
        } else {
            contentHeight = LayoutSystem.layoutFlow(zone, items);
        }

        // 5. Update Zone Height to fit content (with minimum)
        const minH = 300; 
        const newH = Math.max(minH, contentHeight + 40);
        
        // Only update DOM/State if height changed significantly to avoid jitter
        if(Math.abs(zone.h - newH) > 2) {
            zone.h = newH;
            const el = document.getElementById(zoneId);
            if(el) el.style.height = newH + 'px';
        }
    },

    // Standard Multi-Row Flow Layout
    layoutFlow: (zone, items) => {
        const effectiveW = zone.w - (LayoutSystem.padding * 2);
        let x = LayoutSystem.padding;
        let y = LayoutSystem.headerH + (zone.zoneType === 'exit' ? 40 : 0);
        let currentRowH = 0;

        items.forEach(item => {
            // Check if wrapping is needed
            if (x + item.w > effectiveW + LayoutSystem.padding && x > LayoutSystem.padding) {
                // Wrap to next row
                x = LayoutSystem.padding;
                y += currentRowH + LayoutSystem.gap;
                currentRowH = 0;
            }

            LayoutSystem.apply(zone, item, x, y);

            // Advance X
            x += item.w + LayoutSystem.gap;
            
            // Track max height of current row
            if (item.h > currentRowH) currentRowH = item.h;
        });

        return y + currentRowH + LayoutSystem.padding;
    },

    // Column Layout (CER)
    layoutColumns: (zone, items, colCount) => {
        const colW = (zone.w - (LayoutSystem.padding * 2)) / colCount;
        const colY = new Array(colCount).fill(LayoutSystem.headerH + 10);

        items.forEach(item => {
            // Determine column based on Semantic Type
            let colIdx = 0;
            if (item.sub === 'claim') colIdx = 0;
            else if (item.sub === 'evidence') colIdx = 1;
            else if (item.sub === 'reasoning') colIdx = 2;
            else {
                // Fallback: Geometric position
                if(item._isVirtual) {
                   const relX = item._dragX - zone.x;
                   colIdx = Math.floor(relX / colW);
                } else {
                   const center = (item.x - zone.x) + (item.w/2);
                   colIdx = Math.floor(center / colW);
                }
            }

            if(colIdx < 0) colIdx = 0;
            if(colIdx >= colCount) colIdx = colCount - 1;

            // Center item in column
            const tx = LayoutSystem.padding + (colIdx * colW) + (colW/2 - item.w/2);
            const ty = colY[colIdx];

            LayoutSystem.apply(zone, item, tx, ty);
            
            colY[colIdx] += item.h + LayoutSystem.gap;
        });

        return Math.max(...colY) + LayoutSystem.padding;
    },

    // Consensus Layout (Scatter/Random Fill for manual arrangement)
    layoutConsensus: (zone, items) => {
        // Consensus layout is a "Free Canvas". 
        // We do not force positions unless item is new/virtual and needs a default.
        // We mainly calculate the required height.
        
        let maxY = 0;

        items.forEach(item => {
            // Calculate relative position
            let relX = item.x - zone.x;
            let relY = item.y - zone.y;

            // If virtual (dragging), use drag pos
            if (item._isVirtual) {
                relX = item._dragX - zone.x;
                relY = item._dragY - zone.y;
            }

            // Apply position to DOM/Ghost (ensures visual sync)
            LayoutSystem.apply(zone, item, relX, relY);

            // Track max height
            const bottom = relY + item.h;
            if (bottom > maxY) maxY = bottom;
        });

        // Return calculated height with padding, but don't shrink below current unless dragged up
        return Math.max(zone.h, maxY + 50);
    },

    // Apply calculated position to DOM or Ghost
    apply: (zone, item, relX, relY) => {
        const absX = zone.x + relX;
        const absY = zone.y + relY;

        if(item._isVirtual) {
            const ghost = document.getElementById('ghost-layer');
            ghost.innerHTML = `<div class="ghost-slot" style="transform: translate(${absX}px, ${absY}px); width:${item.w}px; height:${item.h}px;"></div>`;
        } else {
            item.x = absX;
            item.y = absY;
            const el = document.getElementById(item.id);
            if(el && !el.classList.contains('dragging')) {
                el.style.transform = `translate(${absX}px, ${absY}px)`;
            }
        }
    },

    getIndex: (zone, x, y, excludeId = null) => {
        if(!zone.children) return 0;
        
        const items = zone.children
            .filter(id => id !== excludeId)
            .map(id => State.items.find(i=>i.id===id))
            .filter(i=>i);
        
        if (items.length === 0) return 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemCenterY = item.y + item.h / 2;
            if (y < itemCenterY && x < (item.x + item.w)) {
                return i;
            }
        }
        return items.length;
    }
};

/* --- UI & UTILS --- */
window.UI = {
    toast: (msg) => {
        const t = document.createElement('div'); t.className='toast'; t.innerText=msg;
        $('toast-container').appendChild(t); setTimeout(() => t.remove(), 3000);
    },
    toggleMenu: () => { $('sidebar').classList.toggle('closed'); },
    toggleDrawer: (id) => {
        document.querySelectorAll('.drawer').forEach(d => {
            if(d.id === `drawer-${id}`) d.classList.toggle('open');
            else d.classList.remove('open');
        });
        if(id === 'draw') window.setTool('draw'); 
    },
    closeAllMenus: () => {
        const ctx = $('context-menu');
        if(ctx) ctx.style.display = 'none';
        document.querySelectorAll('.item.show-menu').forEach(e => e.classList.remove('show-menu'));
        document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open'));
        $('sidebar').classList.add('closed');
    },
    showTemplates: () => { UI.renderTplList('system'); $('modal-templates').style.display='flex'; UI.toggleDrawer(null); },
    saveTemplate: async () => {
        const name = prompt("Template Name:");
        if(!name) return;
        const tpl = { id: genId(), name: name, items: JSON.parse(JSON.stringify(State.items)) };
        await DB.saveTemplate(tpl);
        UI.toast("Template Saved");
    },
    renderTplList: async (type) => {
        const list = $('tpl-list');
        if(type === 'system') {
            const sysTpls = [
                { name: "See-Think-Wonder", items: [{type:'zone',title:'I See',x:0,y:0,w:300,h:400},{type:'zone',title:'I Think',x:320,y:0,w:300,h:400},{type:'zone',title:'I Wonder',x:640,y:0,w:300,h:400}] },
                { name: "Frayer Model", items: [{type:'zone',title:'Definition',x:0,y:0,w:300,h:200},{type:'zone',title:'Characteristics',x:320,y:0,w:300,h:200},{type:'zone',title:'Examples',x:0,y:220,w:300,h:200},{type:'zone',title:'Non-Examples',x:320,y:220,w:300,h:200}] },
                { name: "K-W-L Chart", items: [{type:'zone',title:'What I Know',x:0,y:0,w:300,h:500},{type:'zone',title:'What I Want to Know',x:320,y:0,w:300,h:500},{type:'zone',title:'What I Learned',x:640,y:0,w:300,h:500}] },
                { name: "Venn Diagram", items: [{type:'zone',title:'Topic A',x:0,y:0,w:300,h:400},{type:'zone',title:'Both',x:320,y:0,w:300,h:400},{type:'zone',title:'Topic B',x:640,y:0,w:300,h:400}] },
                { name: "Four Corners", items: [{type:'zone',title:'Strongly Agree',x:0,y:0,w:300,h:250},{type:'zone',title:'Agree',x:320,y:0,w:300,h:250},{type:'zone',title:'Disagree',x:0,y:270,w:300,h:250},{type:'zone',title:'Strongly Disagree',x:320,y:270,w:300,h:250}] },
                { name: "Compass Points", items: [{type:'zone',title:'North (Need to Know)',x:320,y:0,w:300,h:200},{type:'zone',title:'West (Worrisome)',x:0,y:220,w:300,h:200},{type:'zone',title:'East (Excited)',x:640,y:220,w:300,h:200},{type:'zone',title:'South (Stance/Steps)',x:320,y:440,w:300,h:200}] }
            ];
            list.innerHTML = sysTpls.map((t,i) => `<button class="btn-s" onclick='UI.loadTemplate(${JSON.stringify(t)})'>${t.name}</button>`).join('');
        } else {
            const userTpls = await DB.getAll('templates');
            list.innerHTML = userTpls.length ? userTpls.map(t => `<button class="btn-s" onclick='UI.loadTemplate(${JSON.stringify(t)})'>${t.name}</button>`).join('') : '<div>No saved templates</div>';
        }
    },
    loadTemplate: (t) => {
        const groupId = genId(); // Create a new group for this template
        t.items.forEach(i => {
            const item = { ...i, id: genId(), groupId: groupId }; // Assign new ID and group ID
            item.x += -State.view.x + 100; item.y += -State.view.y + 100;
            State.items.push(item);
        });
        Render.all(); ActionHistory.push(); Board.save(true); $('modal-templates').style.display='none';
        if(State.isCoHost || Network.peer) Network.broadcast({type:'FULL_SYNC', items:State.items, ink:State.ink});
    },
    toggleA11y: () => {
        const v = $('a11y-view');
        if(v.style.display==='block') { v.style.display='none'; return; }
        v.style.display='block';
        const content = State.items.map(i => {
            let txt = i.text || i.title || i.q || "Item";
            return `<div style="border-bottom:1px solid #eee; padding:10px"><strong>${i.type.toUpperCase()}</strong>: ${txt}</div>`;
        }).join('');
        $('a11y-content').innerHTML = content || "Board is empty.";
    },
    toggleZoneResults: (id) => {
        const el = document.getElementById(`zr-${id}`);
        if(el) {
            el.classList.toggle('active');
            if(el.classList.contains('active') && State.activity && State.activity.targetId === id) {
                if(State.activity.type === 'ZONE_ACT' && State.activity.payload.subType === 'ACT_DISCUSS') Network.updateDiscussion();
                else Network.updateResults(id);
            }
        }
    },
    toggleFullScreen: () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    },
    showSettingsModal: () => {
        $('modal-settings').style.display = 'flex';
        UI.settingsTab(0);
        // Ensure QR code and host ID are populated
        const hostId = localStorage.getItem('dqb_host_id');
        if (hostId) {
            $('settings-host-id').innerText = hostId;
            const qrTgt = $('settings-qr-tgt');
            qrTgt.innerHTML = '';
            new QRCode(qrTgt, { text: hostId, width: 180, height: 180 });
        }
    },
    settingsTab: (n) => {
        const modal = $('modal-settings');
        modal.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', i===n));
        modal.querySelectorAll('.tab-content').forEach((c,i) => c.classList.toggle('active', i===n));
    },
    toggleOpenNotes: () => {
        const isOpen = State.activity.type === 'OPEN';
        Network.toggleOpenMode(!isOpen);
    },
    updateOpenNotesButton: (isOpen) => {
        const drawerBtn = $('drawer-open-notes-btn');
        if (drawerBtn) {
            drawerBtn.innerHTML = isOpen ? '🔒 Lock Board' : '🔓 Open Board';
            if (isOpen) {
                drawerBtn.style.background = '#c2410c';
                drawerBtn.style.color = '#fef2f2';
            } else {
                drawerBtn.style.background = ''; // Revert to default .sub-btn style
                drawerBtn.style.color = '';
            }
        }
    },
    setMinimapPosition: (val) => {
        const cont = $('minimap-container');
        cont.style.top = (val.includes('top')) ? '20px' : 'auto';
        cont.style.bottom = (val.includes('bottom')) ? '100px' : 'auto';
        cont.style.left = (val.includes('left')) ? '20px' : 'auto';
        cont.style.right = (val.includes('right')) ? '20px' : 'auto';
        localStorage.setItem('dqb_minimap_pos', val);
    },
    setMinimapSize: (val) => {
        const cont = $('minimap-container');
        const aspect = 4/3;
        cont.style.width = val + 'px';
        cont.style.height = (val / aspect) + 'px';
        $('minimap-size-val').innerText = `${val}px`;
        Render.minimap();
        localStorage.setItem('dqb_minimap_size', val);
    },
    loadMinimapSettings: () => {
        const pos = localStorage.getItem('dqb_minimap_pos') || 'top-right';
        const size = localStorage.getItem('dqb_minimap_size') || '200';
        $('minimap-pos').value = pos;
        $('minimap-size').value = size;
        UI.setMinimapPosition(pos);
        UI.setMinimapSize(size);
    }
};

/* --- PERSISTENCE --- */
window.DB = {
    db: null,
    init: () => new Promise(resolve => {
        const req = indexedDB.open('DQB_Ultimate', 2);
        req.onupgradeneeded = e => { 
            const db = e.target.result; 
            if(!db.objectStoreNames.contains('boards')) db.createObjectStore('boards', { keyPath: 'id' });
            if(!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
        };
        req.onsuccess = e => { DB.db = e.target.result; resolve(); Board.list(); };
    }),
    save: (board) => { 
        if(State.isCoHost) return; // Co-hosts don't save to local DB
        const tx = DB.db.transaction('boards', 'readwrite'); tx.objectStore('boards').put(board); return new Promise(r => tx.oncomplete = r); 
    },
    saveTemplate: (tpl) => { const tx = DB.db.transaction('templates', 'readwrite'); tx.objectStore('templates').put(tpl); return new Promise(r => tx.oncomplete = r); },
    getAll: (store) => new Promise(resolve => { const req = DB.db.transaction(store, 'readonly').objectStore(store).getAll(); req.onsuccess = () => resolve(req.result); })
};

window.Board = {
    list: async () => {
        const boards = await DB.getAll('boards');
        const c = $('saved-list');
        if(boards.length === 0) { c.innerHTML = '<div style="padding:10px; color:#94a3b8">No saved boards</div>'; return; }
        c.innerHTML = boards.map(b => `<div class="board-row" onclick="Board.load('${b.id}')"><div><b>${b.name}</b><br><span style="font-size:0.8rem; color:#64748b">${new Date(b.ts).toLocaleString()}</span></div><div>➡️</div></div>`).join('');
    },
    create: () => { 
        State.id = genId(); State.items=[]; State.ink=[]; State.name="My Board"; 
        State.view = { x: 0, y: 0, z: 1 };
        localStorage.setItem('lastBoard', State.id);
        ActionHistory.stack=[]; ActionHistory.index=-1; ActionHistory.push();
        Board.start(); 
    },
    load: async (id) => { 
        const b = (await DB.getAll('boards')).find(x => x.id === id); 
        if(b) { 
            State.id=b.id; State.items=b.items; State.ink=b.ink||[]; State.name=b.name; 
            State.view = b.view || { x: 0, y: 0, z: 1 };
            localStorage.setItem('lastBoard', State.id);
            ActionHistory.stack=[]; ActionHistory.index=-1; ActionHistory.push();
            Board.start(); 
        } 
    },
    start: () => { 
        $('landing').style.display='none'; $('app').style.display='block'; $('board-name').value=State.name; 
        Render.loop(); Render.all();
        setTool(State.tool);
        UI.loadMinimapSettings();
        UI.updateOpenNotesButton(State.activity.type === 'OPEN');
        if(!State.isCoHost) {
            const lastPeer = localStorage.getItem('dqb_host_id');
            Network.host(lastPeer);
        }
    },
    setStartView: () => {
        Board.save(true);
        UI.toast("✅ Start view set and saved!");
    },
    save: async (silent) => { 
        await DB.save({ id: State.id, name: State.name, items: State.items, ink: State.ink, view: State.view, ts: Date.now() }); 
        if(!silent) UI.toast("💾 Board Saved"); 
    },
    exit: () => { localStorage.removeItem('lastBoard'); location.reload(); },
    import: (input) => {
        const f = input.files[0]; if(!f) return;
        const r = new FileReader();
        r.onload = e => { const d = JSON.parse(e.target.result); State.id=genId(); State.items=d.items||[]; State.ink=d.ink||[]; State.name=d.name||"Imported"; Board.start(); };
        r.readAsText(f);
    },
    // Collision-Aware Placement Algorithm
    getFreeSpace: (x, y, w, h) => {
        let attempts = 0;
        let nx = x, ny = y;
        
        // Define padding for overlap check
        const pad = 10; 
        
        // Helper to check if rect (nx, ny, w, h) collides with any item in State.items
        const checkCollision = (cx, cy) => {
            return State.items.some(i => 
                cx < i.x + i.w + pad && cx + w + pad > i.x &&
                cy < i.y + i.h + pad && cy + h + pad > i.y
            );
        };

        // Spiral search
        let angle = 0;
        let radius = 0;
        const step = 20;

        while(checkCollision(nx, ny) && attempts < 150) {
            attempts++;
            if(attempts === 1) { radius = 50; }
            else {
                angle += 0.5;
                radius = 30 + (angle * 10);
            }
            nx = x + Math.cos(angle) * radius;
            ny = y + Math.sin(angle) * radius;
        }
        
        // If still colliding after 150 tries, just offset slightly from original
        if (attempts >= 150) {
            nx = x + (Math.random() * 40 - 20);
            ny = y + (Math.random() * 40 - 20);
        }

        return { x: nx, y: ny };
    }
};

/* --- INK & DRAWING --- */
window.InkManager = {
    currentPath: [],
    setColor: (c) => { State.draw.color = c; window.setTool('draw'); UI.toast("Color Changed"); },
    setWidth: (w) => { State.draw.width = w; window.setTool('draw'); },
    start: (x, y) => { InkManager.currentPath = [{x,y}]; },
    move: (x, y) => { InkManager.currentPath.push({x,y}); InkManager.renderTemp(); },
    end: () => {
        if(InkManager.currentPath.length > 1) {
            State.ink.push({ id: genId(), points: [...InkManager.currentPath], color: State.draw.color, width: State.draw.width });
            Render.ink(); ActionHistory.push(); Board.save(true);
            if(State.isCoHost || Network.peer) Network.broadcast({type:'INK_ADD', ink:State.ink[State.ink.length-1]});
        }
        InkManager.currentPath = []; InkManager.renderTemp();
    },
    renderTemp: () => {
        const svg = $('ink-layer'); const temp = document.getElementById('temp-ink'); if(temp) temp.remove();
        if(InkManager.currentPath.length < 2) return;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", InkManager.pointsToPath(InkManager.currentPath));
        path.setAttribute("stroke", State.draw.color);
        path.setAttribute("stroke-width", State.draw.width);
        path.setAttribute("fill", "none"); path.setAttribute("stroke-linecap", "round");
        path.id = "temp-ink"; svg.appendChild(path);
    },
    pointsToPath: (pts) => { if(pts.length===0) return ""; let d=`M ${pts[0].x} ${pts[0].y}`; for(let i=1;i<pts.length;i++) d+=` L ${pts[i].x} ${pts[i].y}`; return d; },
    clear: () => { if(confirm("Clear all drawings?")) { State.ink = []; Render.ink(); ActionHistory.push(); Board.save(true); Network.broadcast({type:'FULL_SYNC', items:State.items, ink:State.ink}); } },
    eraseAt: (x, y) => {
        const thresh = 20 / State.view.z;
        const initLen = State.ink.length;
        State.ink = State.ink.filter(s => { return !s.points.some(p => Math.hypot(p.x - x, p.y - y) < thresh); });
        if(State.ink.length !== initLen) { Render.ink(); ActionHistory.push(); Board.save(true); Network.broadcast({type:'FULL_SYNC', items:State.items, ink:State.ink}); }
    }
};

/* --- RENDER --- */
window.Render = {
    loop: () => { Render.sync(); requestAnimationFrame(Render.loop); },
    sync: () => {
        const t = `scale(${State.view.z}) translate(${State.view.x}px, ${State.view.y}px)`;
        $('world').style.transform = t;
        $('bg-grid').style.backgroundPosition = `${State.view.x*State.view.z}px ${State.view.y*State.view.z}px`;

        const isDragging = State.drag && State.drag.mode === 'move';
        
        State.items.forEach(i => {
            const el = document.getElementById(i.id);
            if(el) {
                // Dragging is handled by direct transform in Modes.Move.move for performance
                if (!isDragging || !State.drag.moveTargets.find(t => t.id === i.id)) {
                     el.style.transform = `translate(${i.x}px, ${i.y}px)`;
                }
                
                el.style.width = i.w + 'px'; if(i.h) el.style.height = i.h + 'px';
                el.classList.toggle('selected', State.selection.includes(i.id));
                el.classList.toggle('grouped', !!i.groupId);

                if(i.type==='zone') { const lbl = el.querySelector('.zone-label'); if(lbl && lbl.innerText !== i.title) lbl.innerText = i.title; }

                const cmts = State.comments.filter(c => c.targetId === i.id);
                const badge = el.querySelector('.cmt-badge');
                if(cmts.length > 0) {
                    if(!badge) {
                        const b = document.createElement('div'); b.className='cmt-badge'; b.innerText=cmts.length;
                        b.title = "View Comments";
                        b.onpointerdown = (e) => { e.stopPropagation(); Actions.showComments(i.id); };
                        el.appendChild(b);
                    } else { badge.innerText = cmts.length; }
                } else if (badge) {
                    badge.remove();
                }
            }
        });
        
        Render.minimap();
    },
    all: () => {
        const layer = $('items-layer');
        State.items.sort((a,b) => (a.type==='zone' ? -1 : 1));

        State.items.forEach(i => {
            let el = document.getElementById(i.id);
            if(!el) { el = Render.createItem(i); layer.appendChild(el); }
            
            if(!el.style.transform) el.style.transform = `translate(${i.x}px, ${i.y}px)`;
            
            const baseZ = i.type === 'zone' ? 1 : (i.z || 10);
            el.style.zIndex = baseZ;
            
            if(i.type==='poll') Render.updatePoll(el, i);
            if(i.type==='spin') Render.updateSpin(el, i);
            if(i.type==='graph') Render.updateGraph(el, i);

            if(i.type === 'note' && !i.src) {
                 const txt = el.querySelector('textarea');
                 if (txt && txt.value !== i.text) txt.value = i.text;
            }
        });
        Array.from(layer.children).forEach(c => { if(!State.items.find(i=>i.id===c.id)) c.remove(); });
        Render.ink();

        const arrBtn = $('btn-arrange');
        if(arrBtn) arrBtn.style.display = State.selection.length > 1 ? 'flex' : 'none';
        const mobArr = $('mt-arrange');
        if(mobArr) mobArr.style.display = State.selection.length > 1 ? 'flex' : 'none';
    },
    ink: () => {
        $('ink-layer').innerHTML = State.ink.map(s => `<path d="${InkManager.pointsToPath(s.points)}" stroke="${s.color}" stroke-width="${s.width}" fill="none" stroke-linecap="round"/>`).join('');
    },
    minimap: () => {
        const canvas = $('minimap');
        const cont = $('minimap-container');
        canvas.width = cont.offsetWidth;
        canvas.height = cont.offsetHeight;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate World Bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        // Include items
        if (State.items.length > 0) {
            State.items.forEach(i => {
                minX = Math.min(minX, i.x);
                minY = Math.min(minY, i.y);
                maxX = Math.max(maxX, i.x + i.w);
                maxY = Math.max(maxY, i.y + i.h);
            });
        } else {
            minX = 0; minY = 0; maxX = window.innerWidth; maxY = window.innerHeight;
        }


        // Include Viewport
        const vw = window.innerWidth / State.view.z;
        const vh = window.innerHeight / State.view.z;
        const vx = -State.view.x;
        const vy = -State.view.y;

        minX = Math.min(minX, vx);
        minY = Math.min(minY, vy);
        maxX = Math.max(maxX, vx + vw);
        maxY = Math.max(maxY, vy + vh);

        // Add padding
        const padding = 100;
        minX -= padding; minY -= padding; maxX += padding; maxY += padding;

        const worldW = maxX - minX;
        const worldH = maxY - minY;
        if (worldW <= 0 || worldH <= 0) return;
        
        const scale = Math.min(canvas.width / worldW, canvas.height / worldH);

        const mapX = (val) => (val - minX) * scale;
        const mapY = (val) => (val - minY) * scale;

        // Draw Items
        State.items.forEach(i => {
            ctx.fillStyle = i.type === 'zone' ? 'rgba(255, 255, 255, 0.2)' : (TYPES[i.sub] ? TYPES[i.sub].bor : '#94a3b8');
            if (i.type === 'zone') {
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1;
                ctx.strokeRect(mapX(i.x), mapY(i.y), i.w * scale, i.h * scale);
            } else {
                ctx.fillRect(mapX(i.x), mapY(i.y), i.w * scale, i.h * scale);
            }
        });

        // Draw Viewport
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(mapX(vx), mapY(vy), vw * scale, vh * scale);

        // Save transforms for interaction
        canvas.worldInfo = { minX, minY, scale };
    },
    createItem: (d) => {
        const el = document.createElement('div'); el.id=d.id; el.className=`item ${d.type}`;
        
        // --- CONSENSUS LOGIC ---
        // Check if this item belongs to a Consensus Zone
        const parent = d.parentZone ? State.items.find(x => x.id === d.parentZone) : null;
        const isConsensusChild = parent && parent.zoneType === 'consensus';
        if (isConsensusChild) {
            el.classList.add('consensus-child');
        }
        // -----------------------

        let inner = '';
        
        let isActive = d.isOpen;
        let btnText = isActive ? "🟢 Open" : "📡 Open";
        let btnClass = isActive ? "btn-toggle active" : "btn-toggle";
        let btnAction = `Network.toggleZone('${d.id}')`;
        
        if (d.type === 'poll' || d.type === 'graph' || (d.zoneType === 'exit')) {
             btnText = isActive ? "🔴 Stop" : "📡 Broadcast";
             if(d.zoneType === 'exit') btnAction = `Network.toggleZone('${d.id}')`;
             else if(d.type === 'poll') btnAction = `Network.broadcastPoll('${d.id}')`; 
             else if(d.type === 'graph') btnAction = `Network.broadcastGraph('${d.id}')`;
        }

        let btnHtml = `<span id="zbtn-${d.id}" class="${btnClass}" onpointerdown="event.stopPropagation()" onclick="${btnAction}">${btnText}</span>`;
        let resBtn = `<span id="btn-res-${d.id}" class="btn-toggle results-btn" onpointerdown="event.stopPropagation()" onclick="UI.toggleZoneResults('${d.id}')">💬 Results</span>`;

        if(d.type === 'note') {
            if(d.sub === 'sketch' || d.src) {
                // Sketch or Image Note
                inner = `<div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
                    <img src="${d.src}" draggable="false" style="flex:1;width:100%;object-fit:contain;background:${isConsensusChild ? 'transparent' : '#f8fafc'}">
                    ${!isConsensusChild ? `<textarea class="caption-in" placeholder="Caption...">${d.text||''}</textarea>` : ''}
                </div>`;
            } else {
                // Text Note
                inner = `<textarea class="note-in" placeholder="Empty note..." ${isConsensusChild ? 'style="border:none;background:transparent;resize:none;font-weight:bold"' : ''}>${d.text||''}</textarea>`;
            }
        } else if (d.type === 'zone') {
            if(d.zoneType === 'cer') inner = `<div class="cer-grid"><div class="cer-col">CLAIM</div><div class="cer-col">EVIDENCE</div><div class="cer-col">REASONING</div></div>`;
            else if(d.zoneType === 'consensus') inner = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-weight:bold;font-size:1.5rem;opacity:0.5;pointer-events:none">CONSENSUS AREA</div>`;
            else if(d.zoneType === 'exit') {
                inner = `<div style="padding:15px; text-align:center; color:#1e293b; font-weight:bold; border-bottom:1px solid #e2e8f0; background:#f8fafc">
                    ${d.prompt}
                </div><div style="flex:1; position:relative"></div>`;
            }
            else inner = `<div style="padding:20px;text-align:center;color:#94a3b8;pointer-events:none;display:flex;align-items:center;justify-content:center;height:100%"></div>`;

            inner += `<div id="zr-${d.id}" class="zone-res-box"></div>`;
            el.innerHTML = `<div class="zone-label">${d.title}</div>` + el.innerHTML;
        } else {
             if(d.type === 'poll') { inner = `<div class="poll-q" style="padding:8px;font-weight:bold">${d.q}</div><div class="poll-opts"></div>`; }
             else if(d.type === 'graph') { inner = `<div class="graph-bars" style="display:flex;align-items:flex-end;height:100%;padding:10px;gap:5px"></div>`; }
             else if(d.type === 'spin') inner = `<div style="padding:10px; display:flex; flex-direction:column; align-items:center"><svg class="spin-svg" viewBox="0 0 100 100" width="120" height="120"></svg><button class="btn-s" style="margin-top:8px; padding:4px 8px; font-size:0.8rem" onpointerdown="event.stopPropagation()" onclick="Actions.spin('${d.id}')">SPIN</button></div>`;
        }

        const head = TYPES[d.sub] || TYPES.meta;
        const title = d.type==='zone' ? (d.zoneType==='cer'?'CER Builder':(d.zoneType==='consensus'?'Consensus Model':(d.zoneType==='exit'?'Exit Ticket':'Zone'))) : (d.type==='poll'?'Poll':(d.type==='spin'?'Spinner':(d.type==='graph'?'Live Graph':(d.author || head.lbl))));
        
        if(d.type === 'note' || d.type === 'spin') { btnHtml = ''; resBtn = ''; }

        el.innerHTML += `
            <div class="jiggle-wrapper">
                <div class="i-head">
                    <div style="display:flex;gap:5px;align-items:center">
                        <span class="icon-span">${d.type==='note'?head.icon:(d.type==='poll'?'📊':(d.type==='spin'?'🎡':(d.type==='graph'?'📈':'')))}</span>
                        <span class="auth-span">${title}</span>
                        ${btnHtml}
                        ${resBtn}
                    </div>
                    <div class="menu-trigger" onpointerdown="event.stopPropagation()" onclick="Actions.showContextMenu(event, '${d.id}')">⋮</div>
                </div>
                <div class="i-body">${inner}</div>
                <div class="resize-h"></div>
            </div>`;

        const w = el.querySelector('.jiggle-wrapper');
        if(d.type==='note') {
            if (!isConsensusChild) {
                w.style.background = head.col;
                w.style.borderColor = head.bor;
                const h = el.querySelector('.i-head');
                h.style.background = head.bor + '33'; 
                h.style.color = head.bor;
            }
        }
        else if(d.type==='zone') { 
            w.style.border = '2px dashed #cbd5e1';
            if(d.zoneType === 'consensus') { w.classList.add('consensus-bg'); w.style.border = '2px solid #0ea5e9'; } 
            else if(d.zoneType === 'exit') { w.style.border = '2px solid #6366f1'; w.style.background = '#fefeff'; }
            else { w.style.background = 'rgba(255,255,255,0.5)'; }
        }

        const ta = el.querySelector('textarea');
        if(ta) ta.oninput = e => { 
            d.text = e.target.value; 
            if(d._timeout) clearTimeout(d._timeout);
            d._timeout = setTimeout(() => { Network.broadcast({type:'NOTE_UPDATE', note:d}); }, 500);
        };

        return el;
    },
    updatePoll: (el, d) => {
        const tot = d.opts.reduce((a,b)=>a+b.v, 0);
        el.querySelector('.poll-opts').innerHTML = d.opts.map(o => `<div style="margin:5px;background:#f1f5f9;border-radius:4px;position:relative;height:24px"><div style="position:absolute;height:100%;background:#93c5fd;border-radius:4px;width:${tot?(o.v/tot)*100:0}%"></div><div style="position:absolute;inset:0;display:flex;justify-content:space-between;padding:0 8px;align-items:center;font-size:0.8rem;font-weight:700"><span>${o.lbl}</span><span>${o.v}</span></div></div>`).join('');
    },
    updateGraph: (el, d) => {
        const max = Math.max(...d.data, 10);
        el.querySelector('.graph-bars').innerHTML = d.data.map(v => `<div style="flex:1;background:#6366f1;border-radius:4px 4px 0 0;transition:height 0.5s;height:${(v/max)*100}%;position:relative;min-height:1px"><div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:0.7rem;font-weight:bold">${v}</div></div>`).join('');
    },
    updateSpin: (el, d) => {
        const svg = el.querySelector('.spin-svg');
        const colors = ['#fecaca','#fed7aa','#fde68a','#bbf7d0','#bae6fd','#c7d2fe'];
        const slice = 360/d.opts.length;
        svg.innerHTML = d.opts.map((o,i) => {
            const a1 = (i*slice)*Math.PI/180, a2 = ((i+1)*slice)*Math.PI/180;
            const x1=50+50*Math.cos(a1), y1=50+50*Math.sin(a1), x2=50+50*Math.cos(a2), y2=50+50*Math.sin(a2);
            return `<path d="M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z" fill="${colors[i%6]}" stroke="white" stroke-width="1"/>`;
        }).join('') + `<polygon points="50,10 45,-5 55,-5" fill="#333"/>`;
        svg.style.transform = `rotate(${d.ang}deg)`;
        svg.style.transition = "transform 3s cubic-bezier(0.2,0.8,0.2,1)";
    }
};

/* --- ACTIONS --- */
window.Actions = {
    create: (type, sub) => {
        let cx = -State.view.x + window.innerWidth/2/State.view.z - 100;
        let cy = -State.view.y + window.innerHeight/2/State.view.z - 75;
        const id = genId();
        let it = { id, type, w:200, h:150, groupId: null };
        if(type==='note') { it.sub=sub; it.text=''; }
        if(type==='zone') { 
            const name = prompt("Name your new zone:", "New Zone");
            if(!name) return;
            it.title=name; it.w=300; it.h=300; it.children=[];
        }
        if(type==='cer') { it.type='zone'; it.zoneType='cer'; it.title="Argument Builder (CER)"; it.w=600; it.h=400; it.children=[]; }
        if(type==='consensus') { it.type='zone'; it.zoneType='consensus'; it.title="Consensus Model"; it.w=600; it.h=600; it.children=[]; }
        if(type==='poll') { it.q="Question?"; it.opts=[{lbl:'Yes',v:0},{lbl:'No',v:0}]; }
        if(type==='spin') { it.ang=0; it.opts=['A','B','C','D']; it.w=200; it.h=220; }
        if(type==='graph') { it.title="Class Data"; it.data=[]; it.w=300; it.h=200; }

        const pos = Board.getFreeSpace(cx, cy, it.w, it.h);
        it.x = pos.x; it.y = pos.y;

        State.items.push(it); Render.all(); ActionHistory.push(); Board.save(true);
        UI.toggleDrawer(null);
        if(State.isCoHost || Network.peer) Network.broadcast({type:'ADD_ITEM', item:it});
    },
    createExit: (mode) => {
        let cx = -State.view.x + window.innerWidth/2/State.view.z - 200;
        let cy = -State.view.y + window.innerHeight/2/State.view.z - 150;
        const id = genId();

        let promptTxt = "Exit Ticket";
        let opts = null;

        if(mode === 'short') promptTxt = prompt("Short Answer Question:", "What was the most important thing you learned?");
        else if(mode === 'smiley') promptTxt = prompt("Statement to rate:", "I feel confident about today's lesson.");
        else if(mode === 'mc') {
            promptTxt = prompt("Multiple Choice Question:", "Which is correct?");
            const o = prompt("Options (comma separated):", "Option A, Option B, Option C");
            if(o) opts = o.split(',');
        }
        else if(mode === 'multi') {
            promptTxt = prompt("Select all that apply:", "Which topics did we cover?");
            const o = prompt("Options (comma separated):", "Topic A, Topic B, Topic C");
            if(o) opts = o.split(',');
        }
        else if(mode === 'lw') promptTxt = "List one thing you Learned and one thing you Wonder.";

        if(!promptTxt && mode !== 'lw') return;

        let it = { 
            id, type: 'zone', zoneType: 'exit', exitMode: mode, 
            title: 'Exit Ticket', prompt: promptTxt, opts: opts,
            w: 400, h: 300, children: [],
            x: cx, y: cy // Will be overridden by free space
        };

        const pos = Board.getFreeSpace(cx, cy, it.w, it.h);
        it.x = pos.x; it.y = pos.y;

        State.items.push(it); Render.all(); ActionHistory.push(); Board.save(true);
        UI.toggleDrawer(null);
        if(State.isCoHost || Network.peer) Network.broadcast({type:'ADD_ITEM', item:it});
    },
    showContextMenu: (e, id) => {
        const menu = $('context-menu');
        const item = State.items.find(x => x.id === id);
        if(!item) return;

        if (!State.selection.includes(id)) {
            Actions.sel(id);
        }
        
        const selection = State.items.filter(i => State.selection.includes(i.id));
        const isGroupSelected = selection.length > 1;
        const firstSelectedItem = selection[0] || item;
        const isInGroup = !!firstSelectedItem.groupId;

        let html = '';
        if (isGroupSelected) {
            if (isInGroup) {
                html += `<div class="ctx-row"><button class="ctx-btn" onclick="Actions.ungroupSelection()">Ungroup</button></div>`;
            } else {
                html += `<div class="ctx-row"><button class="ctx-btn" onclick="Actions.groupSelection()">Group Items</button></div>`;
            }
            
            // ADDED: Check if notes are in the selection and add the "Move to Zone" button
            const hasNotesInSelection = selection.some(i => i.type === 'note');
            if (hasNotesInSelection) {
                html += `<div class="ctx-row"><button class="ctx-btn" onclick="Actions.showZoneList(event)">Move to Zone ➡</button></div>`;
            }

            // ADDED: Save as Template for selection
            html += `<div class="ctx-row"><button class="ctx-btn" onclick="Actions.saveSelectionAsTemplate()">💾 Save Template</button></div>`;

            html += `<div class="ctx-row"><button class="ctx-btn btn-del" onclick="Actions.delete()">Delete All</button></div>`;

        } else { // Single item selection logic remains the same
             if(item.type === 'note') {
                html += `<div class="ctx-row">
                    <button class="ctx-btn" style="background:#fef3c7" onclick="Actions.setType('${id}','notice')">👁️</button>
                    <button class="ctx-btn" style="background:#bae6fd" onclick="Actions.setType('${id}','wonder')">❓</button>
                    <button class="ctx-btn" style="background:#bbf7d0" onclick="Actions.setType('${id}','idea')">💡</button>
                    <button class="ctx-btn" style="background:#fecaca" onclick="Actions.setType('${id}','test')">🧪</button>
                </div>
                <div class="ctx-row">
                    <button class="ctx-btn" onclick="Actions.toggleLock('${id}')">${item.locked?'Unlock 🔓':'Lock 🔒'}</button>
                    <button class="ctx-btn btn-del" onclick="Actions.delete('${id}')">Delete</button>
                </div>
                <div class="ctx-row"><button class="ctx-btn" onclick="Actions.showZoneList(event)">Move to Zone ➡</button></div>`;
                 if (isInGroup) {
                    html += `<div class="ctx-row"><button class="ctx-btn" onclick="Actions.ungroupSelection()">Ungroup</button></div>`;
                }
            } else if(item.type === 'zone') {
                html += `<div class="ctx-row">
                    <button class="ctx-btn" onclick="Network.startActivity('vote')">🗳️ Vote</button>
                    <button class="ctx-btn" onclick="Network.startActivity('sort')">🔢 Rank</button>
                    <button class="ctx-btn" onclick="Network.startActivity('discuss')">💬 Discuss</button>
                </div>
                <div class="ctx-row"><button class="ctx-btn" onclick="Actions.rename('${id}')">Rename</button></div>
                <div class="ctx-row">
                    <button class="ctx-btn btn-del" onclick="Actions.delete('${id}')">Delete</button>
                </div>`;
            } else if(item.type === 'poll') {
                html += `<div class="ctx-row"><button class="ctx-btn" onclick="Actions.editPoll('${id}')">✏️ Edit</button><button class="ctx-btn btn-del" onclick="Actions.delete('${id}')">Delete</button></div>`;
            } else {
                html += `<div class="ctx-row"><button class="ctx-btn btn-del" onclick="Actions.delete('${id}')">Delete</button></div>`;
            }
        }
        
        menu.innerHTML = html; menu.style.display = 'block'; Actions.posMenu(menu, e);
    },
    saveSelectionAsTemplate: async () => {
        if(State.selection.length === 0) return;
        const name = prompt("Template Name:");
        if(!name) return;

        // Get items
        const selectedItems = State.selection.map(id => State.items.find(i => i.id === id)).filter(Boolean);

        // Calculate bounding box to normalize positions
        const minX = Math.min(...selectedItems.map(i => i.x));
        const minY = Math.min(...selectedItems.map(i => i.y));

        // Clone and offset
        const tplItems = selectedItems.map(i => {
            const clone = JSON.parse(JSON.stringify(i));
            clone.x -= minX;
            clone.y -= minY;
            return clone;
        });

        const tpl = { id: genId(), name: name, items: tplItems };
        await DB.saveTemplate(tpl);
        UI.toast("Template Saved");
        UI.closeAllMenus();
    },
    showZoneList: (e) => {
        e.stopPropagation();
        const menu = $('context-menu');
        const zones = State.items.filter(i => i.type === 'zone');
        let html = `<div style="max-height:200px;overflow-y:auto">`;
        if(zones.length > 0) {
            html += zones.map(z => `<div class="ctx-row"><button class="ctx-btn" onclick="Actions.moveToZone('${z.id}')">${z.title}</button></div>`).join('');
        }
        html += `<div class="ctx-row" style="border-top:1px solid #e2e8f0; margin-top:5px; padding-top:5px"><button class="ctx-btn" onclick="Actions.groupToZone()">+ New Zone</button></div>`;
        html += `</div>`;
        menu.innerHTML = html;
    },
    moveToZone: (zoneId) => {
        const items = State.selection.map(id => State.items.find(i => i.id === id)).filter(i => i && i.type === 'note');
        if(items.length === 0) return;
        items.forEach(i => HierarchyManager.link(i.id, zoneId));
        LayoutSystem.update(zoneId);
        Render.all(); UI.closeAllMenus(); ActionHistory.push(); Board.save(true);
        if(State.isCoHost || Network.peer) {
            const zone = State.items.find(z => z.id === zoneId);
            if(zone) Network.broadcast({type:'ZONE_REORDER', zoneId:zoneId, children:zone.children});
        }
    },
    posMenu: (menu, e) => {
        const rect = e.target.getBoundingClientRect();
        let left = rect.left; let top = rect.bottom + 10;
        if(left + 240 > window.innerWidth) left = window.innerWidth - 250;
        if(top + 150 > window.innerHeight) top = rect.top - 150;
        menu.style.left = left + 'px'; menu.style.top = top + 'px';
    },
    groupToZone: () => {
        const sel = State.selection.map(id => State.items.find(i => i.id === id)).filter(i => i && i.type === 'note');
        if(sel.length === 0) return;
        
        const name = prompt("Name your new zone:", "Group");
        if(!name) return;

        let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
        sel.forEach(i => { minX = Math.min(minX, i.x); minY = Math.min(minY, i.y); maxX = Math.max(maxX, i.x+i.w); maxY = Math.max(maxY, i.y+i.h); });
        
        const z = { 
            id: genId(), type: 'zone', title: name, 
            x: minX - 20, y: minY - 50, 
            w: (maxX - minX) + 40, h: (maxY - minY) + 70, 
            children: sel.map(i => i.id)
        };
        
        sel.forEach(i => i.parentZone = z.id);
        State.items.push(z);
        
        sel.forEach(i => HierarchyManager.link(i.id, z.id));
        LayoutSystem.update(z.id);
        
        Actions.sel(z.id); UI.closeAllMenus(); Render.all(); ActionHistory.push(); Board.save(true);
        if(State.isCoHost || Network.peer) {
            Network.broadcast({type:'ADD_ITEM', item:z});
            Network.broadcast({type:'ZONE_REORDER', zoneId:z.id, children:z.children});
        }
        setTimeout(() => { sel.forEach(i => { const el = $(i.id); if(el) el.classList.add('snap-anim'); }); }, 50);
    },
    groupSelection: () => {
        if (State.selection.length < 2) return;
        const groupId = genId();
        State.selection.forEach(id => {
            const item = State.items.find(i => i.id === id);
            if (item) item.groupId = groupId;
        });
        UI.closeAllMenus();
        UI.toast("Items Grouped");
        Board.save(true);
        Render.all();
        Network.broadcast({type:'GROUP_ITEMS', ids: State.selection, groupId: groupId});
    },
    ungroupSelection: () => {
        const item = State.items.find(i => State.selection.includes(i.id));
        if (!item || !item.groupId) return;
        const groupId = item.groupId;
        State.items.forEach(i => {
            if (i.groupId === groupId) {
                i.groupId = null;
            }
        });
        UI.closeAllMenus();
        UI.toast("Items Ungrouped");
        Board.save(true);
        Render.all();
        Network.broadcast({type:'UNGROUP_ITEMS', groupId: groupId});
    },
    setType: (id, sub) => { const i = State.items.find(x=>x.id===id); if(i && i.type==='note') { i.sub = sub; const oldEl = document.getElementById(id); if(oldEl) oldEl.remove(); Render.all(); UI.closeAllMenus(); Board.save(true); Network.broadcast({type:'NOTE_UPDATE', note:i}); } },
    delete: (id) => {
        const targets = id ? [id] : State.selection;
        if (targets.length === 0) return;
        HierarchyManager.delete(targets);
        UI.closeAllMenus();
    },
    sel: (id) => { 
        State.selection=[id]; 
        const i = State.items.find(x=>x.id===id);
        if(i && i.type==='zone') {
            if(State.activeSorts[i.id] || State.activity && State.activity.targetId === i.id) {
                 Tab(1);
                 $('act-results').innerHTML = `<div style="padding:10px;font-weight:bold;color:#6366f1">Zone: ${i.title}</div><div id="zone-res-${i.id}">Loading results...</div>`;
                 Network.updateResults(i.id);
            }
        }
        Render.all(); 
    },
    spin: (id) => { const i = State.items.find(x=>x.id===id); i.ang += 720 + Math.random()*360; Render.all(); },
    rename: (id) => { const i = State.items.find(x=>x.id===id); const n = prompt("Rename Zone:", i.title); if(n) { i.title=n; Render.sync(); Board.save(true); if(State.isCoHost || Network.peer) Network.broadcast({type:'NOTE_UPDATE', note:i}); } },
    editPoll: (id) => {
        const p = State.items.find(x=>x.id===id); if(!p) return;
        const q = prompt("Poll Question:", p.q);
        if(q) { p.q = q; const opts = prompt("Options (comma separated):", p.opts.map(o=>o.lbl).join(',')); if(opts) { p.opts = opts.split(',').map(s => ({lbl:s.trim(), v:0})); Render.all(); Board.save(true); } }
        UI.closeAllMenus();
    },
    showComments: (id) => {
        State.activeCommentId = id; 
        const cmts = State.comments.filter(c => c.targetId === id);
        $('cmt-list').innerHTML = cmts.map(c => `<div class="disc-item"><div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#94a3b8;margin-bottom:4px"><span>${c.author}</span></div><span class="disc-tag dt-${c.tag}">${c.tag.toUpperCase()}</span><div style="color:#334155">${c.text}</div></div>`).join('');
        $('modal-comments').style.display='flex';
        $('cmt-input').value = ''; 
    },
    postComment: () => {
        const id = State.activeCommentId;
        const txt = $('cmt-input').value;
        if(!id || !txt) return;
        const cmt = { type:'COMMENT', targetId:id, text:txt, author:'Teacher', tag:'feedback' };
        State.comments.push(cmt);
        Network.broadcast(cmt); 
        $('cmt-input').value = '';
        Actions.showComments(id); 
        Render.all(); 
    },
    toggleLock: (id) => { const i = State.items.find(x=>x.id===id); if(i) { i.locked = !i.locked; Render.all(); UI.closeAllMenus(); Board.save(true); } },
    layoutZone: (zoneId) => { LayoutSystem.update(zoneId); },
    addToZone: (zoneId, noteId) => {
        HierarchyManager.link(noteId, zoneId);
        LayoutSystem.update(zoneId); 
        Render.all();
    },
    align: (mode) => {
        // 1. Filter targets: Only items whose parent is NOT also selected
        const allSelected = State.selection.map(id => State.items.find(i => i.id === id)).filter(x=>x);
        if(allSelected.length < 2) return;
        
        const items = allSelected.filter(item => {
            // If item has a parent zone, and that parent zone is also in the selection, exclude this item (it moves with parent)
            if (item.parentZone && State.selection.includes(item.parentZone)) return false;
            return true;
        });
        
        if(items.length < 2) return; // Need at least 2 top-level items to align

        if(mode === 'left') { const min = Math.min(...items.map(i=>i.x)); items.forEach(i=>i.x=min); }
        if(mode === 'center') { const avg = items.reduce((a,b)=>a+(b.x+b.w/2),0)/items.length; items.forEach(i=>i.x=avg-i.w/2); }
        if(mode === 'right') { const max = Math.max(...items.map(i=>i.x+i.w)); items.forEach(i=>i.x=max-i.w); }
        if(mode === 'top') { const min = Math.min(...items.map(i=>i.y)); items.forEach(i=>i.y=min); }
        if(mode === 'middle') { const avg = items.reduce((a,b)=>a+(b.y+b.h/2),0)/items.length; items.forEach(i=>i.y=avg-i.h/2); }
        if(mode === 'bottom') { const max = Math.max(...items.map(i=>i.y+i.h)); items.forEach(i=>i.y=max-i.h); }
        
        // Update children of any moved zones
        items.forEach(t => {
            if(t.type === 'zone') LayoutSystem.update(t.id);
        });

        Render.sync(); ActionHistory.push(); Board.save(true);
        if(State.isCoHost || Network.peer) Network.broadcast({type:'BATCH_UPDATE', items:items});
    },
    distribute: (axis) => {
        const allSelected = State.selection.map(id => State.items.find(i => i.id === id)).filter(x=>x);
        if(allSelected.length < 3) return;

        const items = allSelected.filter(item => {
            if (item.parentZone && State.selection.includes(item.parentZone)) return false;
            return true;
        });

        if(items.length < 3) return;

        if(axis === 'h') {
            items.sort((a,b) => a.x - b.x); const min = items[0].x; const max = items[items.length-1].x; const span = max - min; const step = span / (items.length - 1);
            items.forEach((item, i) => { item.x = min + (step * i); });
        } else {
            items.sort((a,b) => a.y - b.y); const min = items[0].y; const max = items[items.length-1].y; const span = max - min; const step = span / (items.length - 1);
            items.forEach((item, i) => { item.y = min + (step * i); });
        }

        items.forEach(t => {
            if(t.type === 'zone') LayoutSystem.update(t.id);
        });

        Render.sync(); ActionHistory.push(); Board.save(true);
        if(State.isCoHost || Network.peer) Network.broadcast({type:'BATCH_UPDATE', items:items});
    },
    matchSize: () => {
        const allSelected = State.selection.map(id => State.items.find(i => i.id === id)).filter(x=>x);
        if(allSelected.length < 2) return;

        const items = allSelected.filter(item => {
            if (item.parentZone && State.selection.includes(item.parentZone)) return false;
            return true;
        });

        const maxW = Math.max(...items.map(i=>i.w)); const maxH = Math.max(...items.map(i=>i.h));
        items.forEach(i => { i.w = maxW; i.h = maxH; });
        
        items.forEach(t => {
            if(t.type === 'zone') LayoutSystem.update(t.id);
        });

        Render.sync(); ActionHistory.push(); Board.save(true);
        if(State.isCoHost || Network.peer) Network.broadcast({type:'BATCH_UPDATE', items:items});
    },
    arrangeGrid: () => {
        let items = State.selection.length > 0 
            ? State.selection.map(id => State.items.find(i => i.id === id)).filter(x=>x) 
            : State.items.filter(i => i.type === 'note');
        
        if(items.length === 0) return;

        // Filter out children if parent is also selected
        items = items.filter(item => !item.parentZone || !State.selection.includes(item.parentZone));

        const cols = Math.ceil(Math.sqrt(items.length)); const startX = Math.min(...items.map(i=>i.x)); const startY = Math.min(...items.map(i=>i.y)); const pad = 20;
        items.sort((a,b) => (a.y - b.y) || (a.x - b.x));
        let cx = startX, cy = startY; let rowH = 0;
        items.forEach((item, i) => {
            if(i > 0 && i % cols === 0) { cx = startX; cy += rowH + pad; rowH = 0; }
            item.x = cx; item.y = cy; cx += item.w + pad; if(item.h > rowH) rowH = item.h;
        });

        items.forEach(t => {
            if(t.type === 'zone') LayoutSystem.update(t.id);
        });

        Render.sync(); ActionHistory.push(); Board.save(true);
        if(State.isCoHost || Network.peer) Network.broadcast({type:'BATCH_UPDATE', items:items});
    },
    collectByType: () => {
        const types = ['notice', 'wonder', 'idea', 'test', 'meta', 'sketch'];
        let startX = -State.view.x + 100; let startY = -State.view.y + 100;
        types.forEach(t => {
            const items = State.items.filter(i => i.type === 'note' && (i.sub || 'meta') === t);
            if(items.length === 0) return;
            const cols = Math.ceil(Math.sqrt(items.length)); let cx = startX, cy = startY; let rowH = 0, maxGroupW = 0;
            items.forEach((item, i) => {
                if(i > 0 && i % cols === 0) { cx = startX; cy += rowH + 20; rowH = 0; }
                item.x = cx; item.y = cy; cx += item.w + 20; if(item.h > rowH) rowH = item.h; if(cx - startX > maxGroupW) maxGroupW = cx - startX;
            });
            startX += maxGroupW + 100;
        });
        Render.sync(); ActionHistory.push(); Board.save(true);
        if(State.isCoHost || Network.peer) Network.broadcast({type:'FULL_SYNC', items:State.items, ink:State.ink});
    },
    collectByUser: () => {
        const users = [...new Set(State.items.map(i=>i.author))];
        let startX = -State.view.x + 100; let startY = -State.view.y + 100;
        users.forEach(u => {
            const items = State.items.filter(i => i.author === u);
            if(items.length === 0) return;
            const cols = Math.ceil(Math.sqrt(items.length)); let cx = startX, cy = startY; let rowH = 0, maxGroupW = 0;
            items.forEach((item, i) => {
                if(i > 0 && i % cols === 0) { cx = startX; cy += rowH + 20; rowH = 0; }
                item.x = cx; item.y = cy; cx += item.w + 20; if(item.h > rowH) rowH = item.h; if(cx - startX > maxGroupW) maxGroupW = cx - startX;
            });
            startX += maxGroupW + 100;
        });
        Render.sync(); ActionHistory.push(); Board.save(true);
        if(State.isCoHost || Network.peer) Network.broadcast({type:'FULL_SYNC', items:State.items, ink:State.ink});
    },
    bringFront: () => {
        const sel = State.selection.map(id => State.items.find(i => i.id === id)).filter(x=>x);
        if(sel.length === 0) return;
        const maxZ = Math.max(...State.items.map(i => i.z || 0));
        sel.forEach(i => i.z = maxZ + 1);
        Render.all();
    },
    sendBack: () => {
        const sel = State.selection.map(id => State.items.find(i => i.id === id)).filter(x=>x);
        if(sel.length === 0) return;
        const minZ = Math.min(...State.items.map(i => i.z || 0));
        sel.forEach(i => i.z = minZ - 1);
        Render.all();
    },
    duplicate: () => {
        const sel = State.selection.map(id => State.items.find(i => i.id === id)).filter(x=>x);
        if(sel.length === 0) return;
        sel.forEach(i => {
            const newItem = JSON.parse(JSON.stringify(i));
            newItem.id = genId();
            newItem.x += 20; newItem.y += 20;
            State.items.push(newItem);
            if(State.isCoHost || Network.peer) Network.broadcast({type:'ADD_ITEM', item:newItem});
        });
        Render.all();
    }
}

/* --- MAIN INITIALIZATION & EVENT LISTENERS --- */
document.addEventListener('DOMContentLoaded', () => {
    DB.init();

    const viewport = $('viewport');
    let panStart = null;

    const getXY = (e) => {
        const rect = viewport.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = (clientX - rect.left) / State.view.z - State.view.x;
        const y = (clientY - rect.top) / State.view.z - State.view.y;
        return {x, y};
    };

    const onPointerDown = (e) => {
        if(e.target.closest('.sidebar-toggle, .menu-trigger, .ctx-menu, .drawer, #sidebar, .modal-bg')) return;
        UI.closeAllMenus();
        
        if (e.button === 2 || e.ctrlKey) { // Right-click or Ctrl-click for context menu
             Actions.showContextMenu(e, null);
             return;
        }

        const {x, y} = getXY(e);
        const target = e.target.closest('.item');

        if(State.tool === 'pan') {
            panStart = { x: e.clientX, y: e.clientY, vx: State.view.x, vy: State.view.y };
            viewport.classList.add('panning');
        } else if (State.tool === 'select' || State.tool === 'move') {
            Modes.Select.down(e, x, y, target);
        } else if (State.tool === 'draw' || State.tool === 'eraser' || State.tool === 'laser') {
            Modes.Draw.down(e, x, y);
        }
    };

    const onPointerMove = (e) => {
        const {x, y} = getXY(e);
        if(panStart) {
            State.view.x = panStart.vx + (e.clientX - panStart.x) / State.view.z;
            State.view.y = panStart.vy + (e.clientY - panStart.y) / State.view.z;
        } else if (State.tool === 'select' || State.tool === 'move') {
            Modes.Select.move(e, x, y);
        } else if (State.tool === 'draw' || State.tool === 'eraser' || State.tool === 'laser') {
            Modes.Draw.move(e, x, y);
        }
    };

    const onPointerUp = (e) => {
        panStart = null;
        viewport.classList.remove('panning');
        if (State.tool === 'select' || State.tool === 'move') {
            Modes.Select.up(e);
        } else if (State.tool === 'draw' || State.tool === 'eraser' || State.tool === 'laser') {
            Modes.Draw.up(e);
        }
    };
    
    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointerleave', onPointerUp); // End drag/pan if pointer leaves

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const scroll = e.deltaY * -0.001;
        const newZoom = State.view.z * (1 + scroll);
        const minZoom = 0.1, maxZoom = 5;
        if(newZoom > minZoom && newZoom < maxZoom) {
            const rect = viewport.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            State.view.x = (State.view.x - mouseX / State.view.z) * (newZoom / State.view.z) + mouseX / newZoom;
            State.view.y = (State.view.y - mouseY / State.view.z) * (newZoom / State.view.z) + mouseY / newZoom;
            State.view.z = newZoom;
        }
    }, {passive: false});
    
    // Global key listeners
    document.addEventListener('keydown', e => {
        if(e.key === ' ' && !e.target.matches('input, textarea')) { e.preventDefault(); window.setTool('pan'); }
        if(e.key === 'v') window.setTool('select');
        if(e.key === 'd') window.setTool('draw');
        if(e.key.toLowerCase() === 'z' && e.ctrlKey && e.shiftKey) ActionHistory.redo();
        else if(e.key.toLowerCase() === 'z' && e.ctrlKey) ActionHistory.undo();
        if(e.key === 'Delete' || e.key === 'Backspace') {
            if(!e.target.matches('input, textarea')) Actions.delete();
        }
    });
});

function Tab(n) {
    ['roster','activity'].forEach((id,i) => { 
        $(`tab-${id}`).classList.toggle('active', i===n); 
        $(`sidebar`).querySelectorAll('.tab-btn')[i].classList.toggle('active', i===n);
    });
}

function setTool(t) {
    State.tool = t;
    ['pan','select','draw'].forEach(id => {
        const dt = $(`dt-${id}`);
        const mt = $(`mt-${id}`);
        if(dt) dt.classList.toggle('active', id === t);
        if(mt) mt.classList.toggle('active', id === t);
    });
    $('viewport').className = `tool-${t}`;
}
