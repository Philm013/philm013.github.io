
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
        app.peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            app.showToast(`Error: ${err.type}`);
            app.updateStatus('error', err.type);
        });
        app.peer.on('disconnected', () => {
            app.updateStatus('error', 'Reconnecting...');
            console.log('PeerJS disconnected. Attempting to reconnect...');
            app.peer.reconnect();
        });
    },

    connectToHost: () => {
        app.updateStatus('wait', 'JOINING...');
        app.conn = app.peer.connect(app.hostId, { metadata: { username: app.username } });
        app.conn.on('open', () => { app.updateStatus('online', 'LINKED'); app.showToast('Secure Channel Active'); });
        app.conn.on('data', app.handleData);
        app.conn.on('close', () => app.updateStatus('error', 'LOST HOST'));
        app.conn.on('error', (err) => {
            console.error('PeerJS connection error:', err);
            app.showToast(`Connection Error: ${err.type}`);
        });
    },

    handleHostConn: (conn) => {
        app.connections.push(conn);
        const username = conn.metadata?.username || `Ghost_${conn.peer.slice(-4)}`;
        app.users[conn.peer] = { username: username };
        
        conn.on('open', () => {
            // Send existing rally point and waypoints to new user
            if(app.rallyMarker) conn.send({ type: 'rally', lat: app.rallyMarker.getLatLng().lat, lng: app.rallyMarker.getLatLng().lng });
            app.waypoints.forEach(wp => conn.send({ type: 'waypoint_new', waypoint: wp }));
            app.showToast(`${username} has joined.`);
        });
        conn.on('data', (data) => {
            // Ensure username and from are set, even if client fails to send them
            if(!data.username) data.username = app.users[conn.peer]?.username || `Ghost_${conn.peer.slice(-4)}`;
            if(!data.from) data.from = conn.peer;

            if (data.to) { // Private message
                if (data.to === app.myId) { // To host
                    app.handleData(data);
                } else { // To another client, forward it
                    const recipient = app.connections.find(c => c.peer === data.to);
                    if (recipient && recipient.open) {
                        recipient.send(data);
                    }
                }
            } else { // Broadcast message
                app.handleData(data);
                app.broadcast(data, conn.peer);
            }
        });
        conn.on('close', () => { 
            const closedUsername = app.users[conn.peer]?.username || 'A user';
            app.showToast(`${closedUsername} has left.`);
            app.connections = app.connections.filter(c => c.peer !== conn.peer); 
            app.removeMarker(conn.peer); 
            app.broadcast({ type: 'disconnect', from: conn.peer });
            delete app.users[conn.peer];
        });
        conn.on('error', (err) => {
            console.error('PeerJS connection error:', err);
            app.showToast(`Connection Error with a user: ${err.type}`);
        });
    },

    broadcast: (data, exclude) => app.connections.forEach(c => { if(c.peer !== exclude && c.open) c.send(data); }),

    send: (data) => {
        data = { ...data, username: app.username, from: app.myId, battery: app.battery };
        
        // Cache and display own messages
        if (data.type.includes('chat')) {
            let chatId = data.type === 'chat' ? 'public' : data.to;
            if (!app.chatHistory[chatId]) app.chatHistory[chatId] = [];
            app.chatHistory[chatId].push(data);
            app.addChat(data);
        }

        // Send over network
        if (app.isHost) {
            if (data.to) { // Private message from host
                const recipient = app.connections.find(c => c.peer === data.to);
                if (recipient && recipient.open) {
                    recipient.send(data);
                }
            } else { // Broadcast from host
                app.broadcast(data);
            }
        } else if (app.conn?.open) { // Client sends everything to host
            app.conn.send(data);
        }

        // Host also processes non-chat data for itself
        if (app.isHost && !data.type.includes('chat')) {
            app.handleData(data);
        }
    },

    handleData: (data) => {
        // Keep user list updated
        if (data.from && data.username) {
            app.users[data.from] = { username: data.username };
        }

        // Cache received chat messages
        if (data.from !== app.myId && data.type.includes('chat')) {
            let chatId = data.type === 'chat' ? 'public' : data.from;
            if (!app.chatHistory[chatId]) app.chatHistory[chatId] = [];
            app.chatHistory[chatId].push(data);
        }

        switch(data.type) {
            case 'loc': app.updateMarker(data); break;
            case 'chat':
            case 'private_chat':
            case 'waypoint_chat':
            case 'rally_chat':
                app.addChat(data); 
                break;
            case 'sonar': app.triggerSonar(data); break;
            case 'rally': app.setRally(data); break;
            case 'suggest_rally':
                if (app.isHost) {
                    if (confirm(`${data.username} suggests a new rally point here. Set it?`)) {
                        app.setRally(data);
                        app.send({ type: 'rally', lat: data.lat, lng: data.lng });
                    }
                }
                break;
            case 'focus': 
                app.map.flyTo([data.lat, data.lng], 18); 
                app.showToast('Host Forced Focus'); 
                app.notify('alert');
                break;
            case 'disconnect': 
                app.removeMarker(data.from); 
                delete app.users[data.from];
                break;
            case 'waypoint_new': app.drawWaypoint(data.waypoint); if(!app.waypoints.find(w => w.id === data.waypoint.id)) app.waypoints.push(data.waypoint); break;
            case 'waypoint_update': app.updateWaypoint(data.waypoint); break;
            case 'waypoint_delete': app.removeWaypoint(data.id); break;
            case 'rally_delete': if (app.rallyMarker) { app.map.removeLayer(app.rallyMarker); app.rallyMarker = null; } break;
        }
    },

    sendSonar: () => { if(app.myLocation) { app.send({ type: 'sonar', lat: app.myLocation.lat, lng: app.myLocation.lng }); app.triggerSonar(app.myLocation); } },

    sendMessage: (e) => {
        e.preventDefault();
        const i = document.getElementById('msg-input');
        if (!i.value.trim()) return;

        let msgType = 'chat';
        if (app.privateChat) {
            if (app.privateChat.isWaypoint) msgType = 'waypoint_chat';
            else if (app.privateChat.isRally) msgType = 'rally_chat';
            else msgType = 'private_chat';
        }

        const msg = {
            type: msgType,
            msg: i.value.trim(),
            to: app.privateChat ? app.privateChat.id : undefined,
        };
        
        app.send(msg);
        i.value = '';
    },
});
