
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
        const list = document.getElementById('msg-list');
        const isMe = d.from === app.myId;
        const div = document.createElement('div');
        div.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'}`;
        div.innerHTML = `<div class="${isMe?'bg-blue-600 text-white':'glass'} px-5 py-3 rounded-2xl max-w-[85%] text-sm font-medium border border-white/10 shadow">${d.msg}</div><span class="text-[9px] opacity-50 mt-1 px-2 font-bold uppercase">${d.username}</span>`;
        list.appendChild(div);
        document.getElementById('chat-scroll').scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
        if(!isMe && document.getElementById('view-chat').style.transform !== 'translate3d(0px, 0px, 0px)') { document.getElementById('unread-dot').classList.remove('hidden'); app.showToast(`Msg: ${d.username}`); app.notify('msg'); }
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

    toggleQR: () => { const m = document.getElementById('modal-qr'); if(m.classList.contains('hidden')) { m.classList.remove('hidden'); document.getElementById('qrcode').innerHTML=""; new QRCode(document.getElementById('qrcode'),{text:window.location.href,width:220,height:220}); } else m.classList.add('hidden'); },

    copyLink: () => { navigator.clipboard.writeText(window.location.href).then(() => app.showToast('Copied')); },

    updateStatus: (type, msg) => { document.getElementById('conn-status').innerText = msg; document.getElementById('status-dot').className = `w-2 h-2 rounded-full shadow-lg ${type=='online'?'bg-emerald-500':type=='wait'?'bg-amber-400':'bg-red-500'}`; },

    showToast: (msg) => { const t = document.getElementById('toast'); t.innerText = msg; t.style.opacity = '1'; t.style.transform = 'translate(-50%, 0)'; setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translate(-50%, 16px)'; }, 2500); },
});
