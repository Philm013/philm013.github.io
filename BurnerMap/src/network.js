// Contains all network related functions
Object.assign(app, {
    initPeer: () => {
        app.updateStatus('wait', 'INIT...');
        app.peer = new Peer(null, { debug: 0 });

        app.peer.on('open', (id) => {
            app.myId = id;
            if(app.isHost) { 
                app.updateStatus('online', 'HOST'); 
                app.peer.on('connection', app.handleHostConn); 
            }
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
        app.peer.on('call', async (call) => {
            if (confirm(`Incoming call from ${call.metadata.username}. Answer?`)) {
                try {
                    app.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    document.getElementById('local-video').srcObject = app.localStream;
                    call.answer(app.localStream);
                    app.setupCallHandlers(call);
                    app.inCall = true;
                    document.getElementById('call-container').classList.remove('hidden');
                } catch (err) {
                    console.error('Failed to get local stream', err);
                    app.showToast('Could not answer call: ' + err.message);
                }
            } else {
                call.close();
            }
        });
    },

    connectToHost: () => {
        app.updateStatus('wait', 'JOINING...');
        app.conn = app.peer.connect(app.hostId, { metadata: { username: app.username } });
        app.conn.on('open', () => { 
            app.updateStatus('online', 'LINKED'); 
            app.showToast('Secure Channel Active'); 
        });
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
            app.showToast(`${username} has joined.`);
            // Send existing state to new user
            if(app.rallyMarker) conn.send({ type: 'rally', lat: app.rallyMarker.getLatLng().lat, lng: app.rallyMarker.getLatLng().lng });
            app.waypoints.forEach(wp => conn.send({ type: 'waypoint_new', waypoint: wp }));
            // Also inform the new user about all other already connected users
            Object.entries(app.users).forEach(([id, user]) => {
                if (id !== conn.peer) { // Don't send the user their own info
                    conn.send({ type: 'user_connect', from: id, username: user.username });
                }
            });
            // Inform all other users about the new user
            app.broadcast({ type: 'user_connect', from: conn.peer, username: username }, conn.peer);
        });

        conn.on('data', (data) => {
            // Re-assign metadata in case it's missing from a payload
            data.from = conn.peer;
            data.username = app.users[conn.peer]?.username;
            // Forward to all other clients
            app.broadcast(data, conn.peer);
            // Host also handles the data
            app.handleData(data);
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

    broadcast: (data, exclude) => {
        if (data.type === 'group_chat_message') {
            const group = app.groupChats[data.to];
            if (group) {
                app.connections.forEach(c => {
                    if (c.peer !== exclude && c.open && group.participants.includes(c.peer)) {
                        c.send(data);
                    }
                });
            }
        } else {
            app.connections.forEach(c => {
                if(c.peer !== exclude && c.open) {
                    c.send(data);
                }
            });
        }
    },

    send: (data) => {
        const fullData = { ...data, username: app.username, from: app.myId, battery: app.battery };
        if (app.isHost) {
            // Host handles its own data and broadcasts to all clients
            app.handleData(fullData);
            app.broadcast(fullData);
        } else if (app.conn?.open) {
            // Client sends data to the host
            app.conn.send(fullData);
        }
    },

    handleData: (data) => {
        // Update user list on connect or loc
        if (data.type === 'user_connect' || (data.type === 'loc' && !app.users[data.from])) {
            app.users[data.from] = { username: data.username };
        }

        // Cache chat messages
        if (data.type.includes('chat') || data.type === 'group_chat_message') {
            let chatId;
            if (data.type === 'chat') chatId = 'public';
            else if (data.type === 'group_chat_message') chatId = data.to;
            else chatId = (data.from === app.myId) ? data.to : data.from;

            if (!app.chatHistory[chatId]) app.chatHistory[chatId] = [];
            
            // Avoid duplicate caching
            const isCached = app.chatHistory[chatId].some(m => m.from === data.from && m.msg === data.msg);
            if (!isCached) {
                app.chatHistory[chatId].push(data);
            }
        }

        switch(data.type) {
            case 'loc': app.updateMarker(data); break;
            case 'chat':
            case 'private_chat':
            case 'waypoint_chat':
            case 'rally_chat':
            case 'group_chat_message':
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
            case 'waypoint_new': if(!app.waypoints.find(w=>w.id===data.waypoint.id)){app.waypoints.push(data.waypoint);app.drawWaypoint(data.waypoint);} break;
            case 'waypoint_update': app.updateWaypoint(data.waypoint); break;
            case 'waypoint_delete': app.removeWaypoint(data.id); break;
            case 'rally_delete': if (app.rallyMarker) { app.map.removeLayer(app.rallyMarker); app.rallyMarker = null; } break;
            case 'user_connect': app.renderRoster?.(); break;
            case 'group_chat_create':
                if (app.isHost) {
                    app.groupChats[data.groupId] = {
                        name: data.groupName,
                        participants: data.participants
                    };
                    app.broadcast({
                        type: 'group_chat_init',
                        groupId: data.groupId,
                        groupName: data.groupName,
                        participants: data.participants
                    });
                }
                break;
            case 'group_chat_init':
                app.groupChats[data.groupId] = {
                    name: data.groupName,
                    participants: data.participants
                };
                app.renderChatList();
                break;
        }
    },

    sendMessage: (e) => {
        e.preventDefault();
        const i = document.getElementById('msg-input');
        const msgText = i.value.trim();
        if (!msgText) return;

        let msgType = 'chat';
        if (app.privateChat) {
            if (app.privateChat.isWaypoint) msgType = 'waypoint_chat';
            else if (app.privateChat.isRally) msgType = 'rally_chat';
            else if (app.privateChat.isGroup) msgType = 'group_chat_message';
            else msgType = 'private_chat';
        }
        
        const msg = {
            type: msgType,
            msg: msgText,
            to: app.privateChat ? app.privateChat.id : undefined,
        };

        // For client, send to host. For host, handle and broadcast.
        app.send(msg);

        // Manually update own UI for chat messages
        if (app.isHost) {
            // Already handled in send -> handleData
        } else {
            // Client needs to handle its own message UI
            const fullMsg = { ...msg, username: app.username, from: app.myId, battery: app.battery };
            app.handleData(fullMsg);
        }

        i.value = '';
    },

    sendSonar: () => { if(app.myLocation) { app.send({ type: 'sonar', lat: app.myLocation.lat, lng: app.myLocation.lng }); } },

    initiateCall: async () => {
        if (!app.privateChat || app.inCall) return;

        try {
            app.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            document.getElementById('local-video').srcObject = app.localStream;
            
            const call = app.peer.call(app.privateChat.id, app.localStream, { metadata: { username: app.username } });
            app.setupCallHandlers(call);
            app.inCall = true;
            document.getElementById('call-container').classList.remove('hidden');
        } catch (err) {
            console.error('Failed to get local stream', err);
            app.showToast('Could not start call: ' + err.message);
        }
    },

    setupCallHandlers: (call) => {
        call.on('stream', (remoteStream) => {
            app.remoteStream = remoteStream;
            document.getElementById('remote-video').srcObject = remoteStream;
        });

        call.on('close', () => {
            app.endCall();
        });

        call.on('error', (err) => {
            console.error('PeerJS call error:', err);
            app.showToast('Call error: ' + err.message);
            app.endCall();
        });

        app.currentCall = call;
    },

    endCall: () => {
        if (app.currentCall) {
            app.currentCall.close();
            app.currentCall = null;
        }
        if (app.localStream) {
            app.localStream.getTracks().forEach(track => track.stop());
            app.localStream = null;
        }
        app.inCall = false;
        document.getElementById('call-container').classList.add('hidden');
    },

    toggleMute: () => {
        if (!app.localStream) return;
        const audioTrack = app.localStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        document.getElementById('mute-btn').innerHTML = audioTrack.enabled ? '<i class="fa-solid fa-microphone"></i>' : '<i class="fa-solid fa-microphone-slash"></i>';
    },

    switchCamera: async () => {
        if (!app.localStream) return;
        const videoTrack = app.localStream.getVideoTracks()[0];
        const currentDeviceId = videoTrack.getSettings().deviceId;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const currentDeviceIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
        const nextDevice = videoDevices[(currentDeviceIndex + 1) % videoDevices.length];

        if (nextDevice) {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: nextDevice.deviceId } },
                audio: true
            });
            const newVideoTrack = newStream.getVideoTracks()[0];
            const sender = app.currentCall.peerConnection.getSenders().find(s => s.track.kind === 'video');
            sender.replaceTrack(newVideoTrack);
            app.localStream.removeTrack(videoTrack);
            app.localStream.addTrack(newVideoTrack);
            videoTrack.stop();
            document.getElementById('local-video').srcObject = app.localStream;
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('end-call-btn').addEventListener('click', () => app.endCall());
    document.getElementById('mute-btn').addEventListener('click', () => app.toggleMute());
    document.getElementById('switch-camera-btn').addEventListener('click', () => app.switchCamera());
});