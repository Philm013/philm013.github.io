// Main app logic
Object.assign(app, {
    init: () => {
        const setVh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        window.addEventListener('resize', setVh); setVh();
        if(navigator.getBattery) navigator.getBattery().then(b => { app.battery = Math.round(b.level*100); b.addEventListener('levelchange', () => app.battery = Math.round(b.level*100)); });

        const urlParams = new URLSearchParams(window.location.search);
        const joinId = urlParams.get('join');
        const saved = JSON.parse(localStorage.getItem('meetup_v1'));

        if (joinId) {
            // User is explicitly joining. They are a CLIENT.
            app.hostId = joinId;
            app.isHost = false;
            // Load their saved username for convenience
            if (saved) {
                app.username = saved.username;
                document.getElementById('username-input').value = app.username;
            }
        } else {
            // User is NOT joining. They are a new HOST.
            app.hostId = null;
            app.isHost = true;
            // Load their saved username for convenience, but ignore any old hostId
            if (saved) {
                app.username = saved.username;
                document.getElementById('username-input').value = app.username;
            }
        }

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
        localStorage.setItem('meetup_v1', JSON.stringify({ username: app.username, hostId: app.hostId }));
    },

    burn: () => { if(confirm('Burn Session?')) { localStorage.removeItem('meetup_v1'); window.location.href = window.location.pathname; }},

    getShareUrl: () => {
        const joinId = app.isHost ? app.myId : app.hostId;
        if (!joinId) return null;
        const url = new URL(window.location.pathname, window.location.origin);
        url.searchParams.set('join', joinId);
        return url.href;
    },

    startPrivateChat: (target) => {
        app.privateChat = { 
            id: target.from, 
            username: target.username, 
            isWaypoint: !!target.isWaypoint,
            isRally: !!target.isRally,
        };
        app.renderChat(target.from);
        app.switchTab('chat');
        app.updateChatUI();
    },

    exitPrivateChat: () => {
        app.privateChat = null;
        app.renderChat('public');
        app.updateChatUI();
    }
});

window.onload = app.init;