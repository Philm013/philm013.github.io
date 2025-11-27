
// Contains all UI related functions
Object.assign(app, {
    toggleTheme: () => {
        app.isLight = !app.isLight;
        document.body.className = app.isLight ? 'light' : 'dark';
        document.getElementById('theme-icon').className = app.isLight ? "fa-solid fa-moon" : "fa-solid fa-sun";
        if(app.layerMode !== 'sat') {
            if(app.isLight) { app.map.removeLayer(app.layers.dark); app.layers.light.addTo(app.map); app.layerMode = 'light'; }
            else { app.map.removeLayer(app.layers.light); app.layers.dark.addTo(app.map); app.layerMode = 'dark'; }
        }
    },

    toggleStrobe: () => {
        const s = document.getElementById('strobe-overlay');
        s.style.display = s.style.display === 'block' ? 'none' : 'block';
    },

    addChat: (d) => {
        const isMe = d.from === app.myId;

        // Message filtering logic
        if (app.privateChat) { // We are in a private/waypoint chat
            if (d.to !== app.privateChat.id) {
                // This message is not for the current private/waypoint chat
                // But if it's a new private message, notify user and maybe auto-switch
                if (d.type === 'private_chat' && !isMe) {
                    app.showToast(`New private msg from ${d.username}`);
                    app.notify('msg');
                }
                return; // Don't display
            }
        } else { // We are in public chat
            if (d.type !== 'chat') {
                // Incoming private/waypoint message while in public chat
                if (!isMe) {
                    const chatType = d.type === 'private_chat' ? 'private msg' : 'waypoint msg';
                    app.showToast(`New ${chatType} from ${d.username}`);
                    app.notify('msg');
                    document.getElementById('unread-dot').classList.remove('hidden');
                }
                return; // Don't display
            }
        }

        const list = document.getElementById('msg-list');
        const div = document.createElement('div');
        div.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'}`;
        
        let indicator = '';
        if (d.type === 'private_chat') {
            indicator = '<span class="font-bold text-red-400 text-[10px]">[PRIVATE] </span>';
        } else if (d.type === 'waypoint_chat') {
            indicator = '<span class="font-bold text-green-400 text-[10px]">[POI] </span>';
        }
        
        div.innerHTML = `<div class="${isMe ? 'bg-blue-600 text-white' : 'glass'} px-5 py-3 rounded-2xl max-w-[85%] text-sm font-medium border border-white/10 shadow">${indicator}${d.msg}</div><span class="text-[9px] opacity-50 mt-1 px-2 font-bold uppercase">${d.username}</span>`;
        list.appendChild(div);
        document.getElementById('chat-scroll').scrollTo({ top: list.scrollHeight, behavior: 'smooth' });

        if (!isMe && document.getElementById('view-chat').style.transform !== 'translate3d(0px, 0px, 0px)') {
            document.getElementById('unread-dot').classList.remove('hidden');
        }
        if (!isMe) {
            app.notify('msg');
        }
    },

    notify: (type) => {
        if(type === 'msg') document.getElementById('sound-msg').play().catch(()=>{});
        if(type === 'alert') { document.getElementById('sound-alert').play().catch(()=>{}); if(navigator.vibrate) navigator.vibrate([200, 100, 200]); }
    },

    switchTab: (tab) => {
        const chat = document.getElementById('view-chat');
        if(tab === 'map') { chat.style.transform = 'translate3d(100%, 0, 0)'; document.getElementById('btn-map').classList.add('active'); document.getElementById('btn-chat').classList.remove('active'); }
        else { chat.style.transform = 'translate3d(0, 0, 0)'; document.getElementById('btn-chat').classList.add('active'); document.getElementById('btn-map').classList.remove('active'); document.getElementById('unread-dot').classList.add('hidden'); }
    },

    toggleQR: () => {
        const m = document.getElementById('modal-qr');
        if (m.classList.contains('hidden')) {
            const url = app.getShareUrl();
            if (!url) {
                app.showToast('Session not ready for sharing');
                return;
            }
            m.classList.remove('hidden');
            document.getElementById('qrcode').innerHTML = "";
            new QRCode(document.getElementById('qrcode'), { text: url, width: 220, height: 220, colorDark: "#000000", colorLight: "#ffffff" });
        } else {
            m.classList.add('hidden');
        }
    },

    copyLink: (e) => {
        e.stopPropagation();
        const url = app.getShareUrl();
        if (!url) {
            app.showToast('Session not ready for sharing');
            return;
        }
        navigator.clipboard.writeText(url).then(() => app.showToast('Share Link Copied'));
    },

    updateStatus: (type, msg) => { document.getElementById('conn-status').innerText = msg; document.getElementById('status-dot').className = `w-2 h-2 rounded-full shadow-lg ${type=='online'?'bg-emerald-500':type=='wait'?'bg-amber-400':'bg-red-500'}`; },

    showToast: (msg) => { const t = document.getElementById('toast'); t.innerText = msg; t.style.opacity = '1'; t.style.transform = 'translate(-50%, 0)'; setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translate(-50%, 16px)'; }, 2500); },

    updateChatUI: () => {
        const header = document.getElementById('chat-header');
        const scroll = document.getElementById('chat-scroll');
        if (app.privateChat) {
            const title = app.privateChat.isWaypoint ? `Waypoint Chat: ${app.privateChat.username}` : `Private chat with ${app.privateChat.username}`;
            header.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-bold">${title}</span>
                    <button onclick="app.exitPrivateChat()" class="text-xs font-bold uppercase">Exit</button>
                </div>
            `;
            header.classList.remove('hidden');
            scroll.style.paddingTop = '180px';
        } else {
            header.classList.add('hidden');
            scroll.style.paddingTop = '120px';
        }
    },

    showActions: (content, buttons) => {
        const modal = document.getElementById('modal-actions');
        document.getElementById('action-content').innerHTML = content;
        const buttonsContainer = document.getElementById('action-buttons');
        buttonsContainer.innerHTML = '';
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `w-full p-4 rounded-xl font-bold text-lg ${btn.class || 'bg-white/10'}`;
            button.innerText = btn.label;
            button.onclick = (e) => {
                e.stopPropagation();
                app.hideActions();
                btn.action();
            };
            buttonsContainer.appendChild(button);
        });
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
    },

    hideActions: () => {
        const modal = document.getElementById('modal-actions');
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },
});
