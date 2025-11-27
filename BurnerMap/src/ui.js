
// Contains all UI related functions
Object.assign(app, {
    initUI: () => {
        document.getElementById('msg-input').addEventListener('keyup', app.handleMentionInput);
        document.addEventListener('click', () => app.hideMentionSuggestions());
    },

    toggleTheme: () => {
        app.isLight = !app.isLight;
        document.body.className = app.isLight ? '' : 'dark';
        document.getElementById('theme-icon').className = app.isLight ? "fa-solid fa-moon" : "fa-solid fa-sun";
        
        // This is a bit of a hack, but this function is called once at the start
        // which makes it a good place to initialize UI components.
        if (!app.uiInitialized) {
            app.initUI();
            app.uiInitialized = true;
        }

        // Deselect the dark layer and select the light layer if not in satellite mode
        if(app.layerMode !== 'sat') {
            if (app.isLight) {
                if (app.map.hasLayer(app.layers.dark)) app.map.removeLayer(app.layers.dark);
                if (!app.map.hasLayer(app.layers.light)) app.layers.light.addTo(app.map);
                app.layerMode = 'light';
            } else {
                if (app.map.hasLayer(app.layers.light)) app.map.removeLayer(app.layers.light);
                if (!app.map.hasLayer(app.layers.dark)) app.layers.dark.addTo(app.map);
                app.layerMode = 'dark';
            }
        }
    },

    handleMentionInput: (e) => {
        const input = e.target;
        const text = input.value;
        const cursorPos = input.selectionStart;
        
        const atMatch = text.substring(0, cursorPos).match(/@([\w\s]*)$/);
        
        if (atMatch) {
            const query = atMatch[1].toLowerCase();
            const mentions = [];
            Object.values(app.users).forEach(user => mentions.push(user.username));
            app.waypoints.forEach(wp => mentions.push(wp.name));
            if(app.rallyMarker) mentions.push('Rally Point');

            const filtered = mentions.filter(name => name.toLowerCase().includes(query));
            app.showMentionSuggestions(filtered, atMatch);
        } else {
            app.hideMentionSuggestions();
        }
    },

    showMentionSuggestions: (suggestions, match) => {
        const container = document.getElementById('mention-suggestions');
        if (suggestions.length === 0) {
            app.hideMentionSuggestions();
            return;
        }
        container.innerHTML = suggestions.map(name => `<div class="mention-item" onclick="app.selectMention(event, '${name}')">${name}</div>`).join('');
        container.classList.remove('hidden');
    },

    hideMentionSuggestions: () => {
        document.getElementById('mention-suggestions').classList.add('hidden');
    },

    selectMention: (e, name) => {
        e.stopPropagation();
        const input = document.getElementById('msg-input');
        const text = input.value;
        const cursorPos = input.selectionStart;
        const atMatch = text.substring(0, cursorPos).match(/@([\w\s]*)$/);
        const newText = text.substring(0, atMatch.index) + `@${name} ` + text.substring(cursorPos);
        
        input.value = newText;
        input.focus();
        app.hideMentionSuggestions();
    },

    addChat: (d, fromHistory = false) => {
        const isMe = d.from === app.myId;

        if (!fromHistory) {
            // Message filtering logic
            if (app.privateChat) { // We are in a private/waypoint/rally chat
                if (d.to !== app.privateChat.id) {
                    if ((d.type === 'private_chat' || d.type === 'waypoint_chat' || d.type === 'rally_chat') && !isMe) {
                        app.showToast(`New msg from ${d.username}`);
                        app.notify('msg');
                    }
                    return; 
                }
            } else { // We are in public chat
                if (d.type !== 'chat') {
                    if (!isMe) {
                        const chatType = d.type.replace('_', ' ');
                        app.showToast(`New ${chatType}`);
                        app.notify('msg');
                        document.getElementById('unread-dot').classList.remove('hidden');
                    }
                    return; 
                }
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
        } else if (d.type === 'rally_chat') {
            indicator = '<span class="font-bold text-orange-500 text-[10px]">[RALLY] </span>';
        }

        let processedMsg = d.msg;
        if(d.type === 'chat') { 
            const mentions = [];
            Object.entries(app.users).forEach(([id, user]) => mentions.push({id: id, name: user.username, type: 'user'}));
            app.waypoints.forEach(wp => mentions.push({id: wp.id, name: wp.name, type: 'waypoint'}));
            if(app.rallyMarker) mentions.push({id: 'rally', name: 'Rally Point', type: 'rally'});
            
            mentions.sort((a, b) => b.name.length - a.name.length);

            mentions.forEach(entity => {
                const regex = new RegExp(`@${entity.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(?!\\w)`, 'g');
                processedMsg = processedMsg.replace(regex, `<span class="mention" onclick="app.panToEntity('${entity.type}', '${entity.id}')">@${entity.name}</span>`);
            });
        }
        
        div.innerHTML = `<div class="${isMe ? 'bg-blue-600 text-white' : 'glass'} px-5 py-3 rounded-2xl max-w-[85%] text-sm font-medium border border-white/10 shadow">${indicator}${processedMsg}</div><span class="text-[9px] opacity-50 mt-1 px-2 font-bold uppercase">${d.username}</span>`;
        list.appendChild(div);
        
        // Always scroll when a new message is added, unless rendering history.
        if (!fromHistory) {
            document.getElementById('chat-scroll').scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
        }

        if (!isMe && document.getElementById('view-chat').style.transform !== 'translate3d(0px, 0px, 0px)') {
            document.getElementById('unread-dot').classList.remove('hidden');
        }
        if (!isMe && !fromHistory) {
            app.notify('msg');
        }
    },
    renderChat: (chatId) => {
        const list = document.getElementById('msg-list');
        list.innerHTML = '';
        const history = app.chatHistory[chatId] || [];
        history.forEach(msg => app.addChat(msg, true)); // pass true to skip filtering and caching
        list.scrollTo({ top: list.scrollHeight });
    },

    notify: (type) => {
        if(type === 'msg') document.getElementById('sound-msg').play().catch(()=>{});
        if(type === 'alert') { document.getElementById('sound-alert').play().catch(()=>{}); if(navigator.vibrate) navigator.vibrate([200, 100, 200]); }
    },

    renderRoster: () => {
        const list = document.getElementById('roster-list');
        list.innerHTML = '';

        // Add self to the top
        const selfHtml = `<div class="glass p-4 rounded-lg flex items-center justify-between">
            <span class="font-bold">${app.username} (You)</span>
            <button class="text-blue-500" onclick="app.locateMe()"><i class="fa-solid fa-location-crosshairs"></i></button>
        </div>`;
        list.insertAdjacentHTML('beforeend', selfHtml);

        // Add other users
        Object.entries(app.users).forEach(([id, user]) => {
            if (id === app.myId) return;
            const userHtml = `<div class="glass p-4 rounded-lg flex items-center justify-between">
                <span class="font-bold">${user.username}</span>
                <button class="text-blue-500" onclick="app.panToEntity('user', '${id}')"><i class="fa-solid fa-crosshairs"></i></button>
            </div>`;
            list.insertAdjacentHTML('beforeend', userHtml);
        });
    },

    switchTab: (tab) => {
        const chatView = document.getElementById('view-chat');
        const rosterView = document.getElementById('view-roster');
        
        // Reset all views and buttons
        chatView.style.transform = 'translate3d(100%, 0, 0)';
        rosterView.style.transform = 'translate3d(-100%, 0, 0)';
        document.getElementById('btn-map').classList.remove('active');
        document.getElementById('btn-chat').classList.remove('active');
        document.getElementById('btn-roster').classList.remove('active');

        if (tab === 'map') {
            document.getElementById('btn-map').classList.add('active');
        } else if (tab === 'chat') {
            chatView.style.transform = 'translate3d(0, 0, 0)';
            document.getElementById('btn-chat').classList.add('active');
            document.getElementById('unread-dot').classList.add('hidden');
            // Render the correct chat when switching to the tab
            if (app.privateChat) {
                app.renderChat(app.privateChat.id);
            } else {
                app.renderChat('public');
            }
        } else if (tab === 'roster') {
            rosterView.style.transform = 'translate3d(0, 0, 0)';
            document.getElementById('btn-roster').classList.add('active');
            app.renderRoster();
        }
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
            let title = `Chat`;
            let panAction = '';
            let targetEntity = null;

            if (app.privateChat.isRally) {
                title = `Rally Point Chat`;
                if (app.rallyMarker) targetEntity = app.rallyMarker;
            } else if (app.privateChat.isWaypoint) {
                title = `Waypoint Chat: ${app.privateChat.username}`;
                targetEntity = app.markers[app.privateChat.id];
            } else { // private user chat
                title = `Private chat with ${app.privateChat.username}`;
                targetEntity = app.markers[app.privateChat.id];
            }

            if (targetEntity) {
                const latlng = targetEntity.getLatLng();
                panAction = `app.map.flyTo([${latlng.lat}, ${latlng.lng}], 18); app.switchTab('map');`;
            }

            header.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-bold ${panAction ? 'cursor-pointer' : ''}" onclick="${panAction || ''}">
                        ${title} 
                        ${panAction ? '<i class="fa-solid fa-crosshairs text-xs ml-2"></i>' : ''}
                    </span>
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
