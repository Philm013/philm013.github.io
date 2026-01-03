# Getting Started with PeerJS for WebRTC Communication

This guide provides a comprehensive overview of using PeerJS to establish peer-to-peer data connections. It covers official API configurations, robust connection handling, and state synchronization strategies.

## 1. Setup

Include the PeerJS library in your HTML.

```html
<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
```

## 2. The Peer Object & Configuration

The `Peer` object is your connection to the PeerServer (the signaling server). While PeerJS provides a free cloud server, you can pass an `options` object to configure STUN/TURN servers (crucial for getting through firewalls) or debugging levels.

```javascript
const peer = new Peer('my-unique-id', {
    // 0: None, 1: Errors, 2: Warnings, 3: All logs
    debug: 2, 
    
    // Configuration for the ICE Agent (STUN/TURN servers)
    config: {
        'iceServers': [
            { url: 'stun:stun1.l.google.com:19302' },
            { url: 'stun:stun2.l.google.com:19302' },
            // For strict networks (schools/offices), you often need a TURN server here.
        ]
    }
});
```

## 3. The Data Connection API

When you call `peer.connect(id)`, you are creating a `DataConnection`. You can configure how data is sent using the `options` parameter.

```javascript
const conn = peer.connect('destination-peer-id', {
    // 'reliable': true (default) ensures delivery but might be slightly slower.
    reliable: true,
    
    // 'serialization': 'binary' (default), 'json', or 'none'.
    // 'binary' (BinaryPack) allows sending Blobs, ArrayBuffers, and Files.
    // 'json' is slightly faster if you are ONLY sending text/JSON objects.
    serialization: 'json'
});
```

## 4. Implementation Guide: Host & Client Pattern

### The Host (Teacher/Server)
The host initializes a peer with a known ID and acts as the "Source of Truth" for the application state.

```javascript
const State = { items: [], ink: [] }; // The app's current state
const peer = new Peer('room-host-id', { debug: 2 });
let connections = {};

peer.on('open', (id) => {
    console.log('Host ready:', id);
    startHeartbeat(); // Start the heartbeat loop (see Section 5)
});

peer.on('connection', (conn) => {
    console.log('Client connected:', conn.peer);
    connections[conn.peer] = conn;

    // CRITICAL: Immediate State Synchronization
    // Whether this is a new user or a user reconnecting after a drop,
    // we ALWAYS send the full state immediately upon connection.
    conn.on('open', () => {
        conn.send({
            type: 'FULL_SYNC',
            items: State.items,
            ink: State.ink
        });
    });

    conn.on('data', (data) => {
        // Handle client updates (e.g., student answers)
        handleClientData(data);
    });

    conn.on('close', () => {
        console.log('Client disconnected:', conn.peer);
        delete connections[conn.peer];
    });
});
```

### The Client (Student)
The client connects to the host. Crucially, it must handle receiving the full state from the host to ensure it is in sync.

```javascript
const peer = new Peer(); // Auto-assigned ID
let hostConnection = null;

peer.on('open', (id) => {
    console.log('Client ready:', id);
    connectToHost('room-host-id');
});

function connectToHost(hostId) {
    hostConnection = peer.connect(hostId, { serialization: 'json' });

    hostConnection.on('open', () => {
        console.log('Connected to host');
        // Reset heartbeat tracking on new connection
        lastHeartbeat = Date.now(); 
    });

    hostConnection.on('data', (data) => {
        lastHeartbeat = Date.now(); // Record activity (see Section 5)

        // Handle State Synchronization
        if (data.type === 'FULL_SYNC') {
            console.log('Applying full state sync...');
            State.items = data.items;
            State.ink = data.ink;
            renderApp(); // Update UI
        }
        // Handle Heartbeats
        else if (data.type === 'HEARTBEAT') {
            return; // Connection is alive
        }
        // Handle other updates
        else {
            handleUpdate(data);
        }
    });

    hostConnection.on('close', () => {
        console.log('Connection lost');
        hostConnection = null;
    });
}
```

## 5. Resilience: Heartbeats & Auto-Reconnection

WebRTC connections can close silently (e.g., laptop lid closes, wifi drops) without firing events immediately. A heartbeat mechanism ensures the client knows when to force a reconnection.

**On the Host:**
Send a ping to all clients periodically.

```javascript
function startHeartbeat() {
    setInterval(() => {
        // Broadcast to all active connections
        for (let peerId in connections) {
            const conn = connections[peerId];
            if (conn && conn.open) {
                conn.send({ type: 'HEARTBEAT' });
            }
        }
    }, 3000); // Every 3 seconds
}
```

**On the Client:**
Check if the heartbeat has stopped. If so, destroy the connection and reconnect.

```javascript
let lastHeartbeat = Date.now();
const TIMEOUT_MS = 8000; // 8 seconds tolerance

setInterval(() => {
    const timeSinceLast = Date.now() - lastHeartbeat;

    // Logic: If connected but no heartbeat, OR if connection var is null
    if ((hostConnection && timeSinceLast > TIMEOUT_MS) || !hostConnection) {
        console.warn('Connection dead or timed out. Reconnecting...');
        
        if (hostConnection) {
            hostConnection.close(); // Clean up old object
        }
        
        // Re-run the connection logic
        // Because the Host sends 'FULL_SYNC' on 'open', 
        // the state will automatically fix itself upon reconnecting.
        connectToHost('room-host-id');
    }
}, 2000);
```

## 6. Official Lifecycle Events & Error Handling

Understanding PeerJS events is critical for debugging.

### Peer Events
*   `open`: Emitted when the connection to the PeerServer is established and the ID is available.
*   `connection`: Emitted when a remote peer attempts to connect to you.
*   `disconnected`: Emitted when the peer disconnects from the *signaling server*, but P2P connections *might* still be active. You can often call `peer.reconnect()` here.
*   `close`: Emitted when the peer is destroyed and can no longer accept connections.
*   `error`: Critical for handling failures.

### Common Error Types
You should implement a global error listener:

```javascript
peer.on('error', (err) => {
    console.error(err.type, err);

    switch (err.type) {
        case 'peer-unavailable':
            // The ID you are trying to connect to does not exist.
            alert('Host ID not found.');
            break;
            
        case 'unavailable-id':
            // The ID you tried to use for yourself is taken.
            alert('This ID is already in use.');
            break;

        case 'network':
            // Lost connection to the PeerServer/Signaling server.
            // P2P connections might still work, but new ones cannot be made.
            break;

        case 'browser-incompatible':
            // The browser doesn't support WebRTC.
            alert('Your browser does not support WebRTC.');
            break;
    }
});
```

### DataConnection Events
*   `open`: The connection is ready to send/receive data.
*   `data`: Data has been received.
*   `close`: The connection has been closed by either side.
*   `error`: A connection-specific error occurred.