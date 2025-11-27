
// Contains all network related functions
Object.assign(app, {
    initPeer: () => {
        app.updateStatus('wait', 'INIT...');
        app.peer = new Peer(null, { debug: 0 });
        app.peer.on('open', (id) => {
            app.myId = id;
            if(app.isHost) { app.updateStatus('online', 'HOST'); app.peer.on('connection', app.handleHostConn); }
            else app.connectToHost();
        });
    },

    connectToHost: () => {
        app.updateStatus('wait', 'JOINING...');
        app.conn = app.peer.connect(app.hostId, { metadata: { username: app.username } });
        app.conn.on('open', () => { app.updateStatus('online', 'LINKED'); app.showToast('Secure Channel Active'); });
        app.conn.on('data', app.handleData);
        app.conn.on('close', () => app.updateStatus('error', 'LOST HOST'));
    },

    handleHostConn: (conn) => {
        app.connections.push(conn);
        conn.on('open', () => { if(app.rallyMarker) conn.send({ type: 'rally', lat: app.rallyMarker.getLatLng().lat, lng: app.rallyMarker.getLatLng().lng }); });
        conn.on('data', (data) => {
            if(!data.username) data.username = conn.metadata.username;
            if(!data.from) data.from = conn.peer;
            app.handleData(data);
            app.broadcast(data, conn.peer);
        });
        conn.on('close', () => { app.connections = app.connections.filter(c => c.peer !== conn.peer); app.removeMarker(conn.peer); });
    },

    broadcast: (data, exclude) => app.connections.forEach(c => { if(c.peer !== exclude && c.open) c.send(data); }),

    send: (data) => {
        data = { ...data, username: app.username, from: app.myId, battery: app.battery };
        if(app.isHost) { if(data.type !== 'ping') app.handleData(data); app.broadcast(data); }
        else if (app.conn?.open) { app.conn.send(data); if(data.type === 'chat') app.handleData(data); }
    },

    handleData: (data) => {
        switch(data.type) {
            case 'loc': app.updateMarker(data); break;
            case 'chat': app.addChat(data); break;
            case 'sonar': app.triggerSonar(data); break;
            case 'rally': app.setRally(data); break;
            case 'focus': 
                app.map.flyTo([data.lat, data.lng], 18); 
                app.showToast('Host Forced Focus'); 
                app.notify('alert');
                break;
        }
    },

    sendSonar: () => { if(app.myLocation) { app.send({ type: 'sonar', lat: app.myLocation.lat, lng: app.myLocation.lng }); app.triggerSonar(app.myLocation); } },

    sendMessage: (e) => { e.preventDefault(); const i = document.getElementById('msg-input'); if(i.value.trim()){ app.send({ type: 'chat', msg: i.value.trim() }); i.value = ''; } },
});
