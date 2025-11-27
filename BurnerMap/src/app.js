// Main app logic
Object.assign(app, {
    init: () => {
        const setVh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        window.addEventListener('resize', setVh); setVh();
        if(navigator.getBattery) navigator.getBattery().then(b => { app.battery = Math.round(b.level*100); b.addEventListener('levelchange', () => app.battery = Math.round(b.level*100)); });

        const saved = JSON.parse(localStorage.getItem('burner_v13'));
        const urlParams = new URLSearchParams(window.location.search);
        const joinId = urlParams.get('join');
        if (saved && (!joinId || joinId === saved.hostId)) { app.username = saved.username; app.hostId = saved.hostId; document.getElementById('username-input').value = app.username; }
        if (joinId) app.hostId = joinId;
        app.isHost = !app.hostId;
        if(app.isHost) document.getElementById('btn-focus').classList.remove('hidden');
    },

    startSession: () => {
        const input = document.getElementById('username-input');
        if(!input.value.trim()) return input.focus();
        app.username = input.value.trim();
        document.getElementById('modal-onboarding').style.opacity = '0';
        setTimeout(() => document.getElementById('modal-onboarding').style.display = 'none', 500);
        document.getElementById('view-map').style.visibility = 'visible';
        app.initMap(); app.initPeer(); app.startLocation();
        localStorage.setItem('burner_v13', JSON.stringify({ username: app.username, hostId: app.hostId }));
    },

    burn: () => { if(confirm('Burn Session?')) { localStorage.removeItem('burner_v13'); window.location.href = window.location.pathname; }},

    getShareUrl: () => {
        const joinId = app.isHost ? app.myId : app.hostId;
        if (!joinId) return null;
        const url = new URL(window.location.pathname, window.location.origin);
        url.searchParams.set('join', joinId);
        return url.href;
    },

    startPrivateChat: (user) => {
        app.privateChat = { id: user.from, username: user.username, isWaypoint: !!user.isWaypoint };
        document.getElementById('msg-list').innerHTML = '';
        app.switchTab('chat');
        app.updateChatUI();
    },

    exitPrivateChat: () => {
        app.privateChat = null;
        document.getElementById('msg-list').innerHTML = '';
        app.updateChatUI();
    }
});

window.onload = app.init;