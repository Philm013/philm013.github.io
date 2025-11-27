
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
        app.users[conn.peer] = { username: conn.metadata.username };
        conn.on('open', () => {
            // Send existing rally point and waypoints to new user
            if(app.rallyMarker) conn.send({ type: 'rally', lat: app.rallyMarker.getLatLng().lat, lng: app.rallyMarker.getLatLng().lng });
            app.waypoints.forEach(wp => conn.send({ type: 'waypoint_new', waypoint: wp }));
        });
        conn.on('data', (data) => {
            if(!data.username) data.username = conn.metadata.username;
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
                app.handleData(data); // Host handles it for map updates etc.
                app.broadcast(data, conn.peer); // Host broadcasts to others
            }
        });
        conn.on('close', () => { 
            app.connections = app.connections.filter(c => c.peer !== conn.peer); 
            app.removeMarker(conn.peer); 
            app.broadcast({ type: 'disconnect', from: conn.peer });
            delete app.users[conn.peer];
        });
    },

    broadcast: (data, exclude) => app.connections.forEach(c => { if(c.peer !== exclude && c.open) c.send(data); }),

    send: (data) => {
        data = { ...data, username: app.username, from: app.myId, battery: app.battery };
        
        // Show own message in UI immediately
        if (data.type === 'chat' || data.type === 'private_chat' || data.type === 'waypoint_chat' || data.type === 'rally_chat') {
            app.handleData(data);
        }

        if (app.isHost) {
            if (data.to) { // Private message from host
                const recipient = app.connections.find(c => c.peer === data.to);
                if (recipient && recipient.open) {
                    recipient.send(data);
                }
            } else { // Broadcast from host
                if (data.type !== 'ping' && !data.type.includes('chat')) { // prevent re-displaying own public chat
                    app.handleData(data);
                }
                app.broadcast(data);
            }
        } else if (app.conn?.open) { // Client sends everything to host
            app.conn.send(data);
        }
    },

    handleData: (data) => {
        // Keep user list updated
        if (data.from && data.username) {
            app.users[data.from] = { username: data.username };
        }

        switch(data.type) {
            case 'loc': app.updateMarker(data); break;
            case 'chat': app.addChat(data); break;
            case 'private_chat': app.addChat(data); break;
            case 'sonar': app.triggerSonar(data); break;
            case 'rally': app.setRally(data); break;
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
            case 'waypoint_chat': app.addChat(data); break;
            case 'rally_chat': app.addChat(data); break;
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
