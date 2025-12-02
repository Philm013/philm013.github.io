# Getting Started with PeerJS for WebRTC Communication

This guide provides a practical overview of how to use PeerJS to establish peer-to-peer data connections in a web application. We will cover setting up a "host" peer that listens for connections and "client" peers that connect to the host, enabling real-time, bi-directional communication.

## Core Concepts

*   **Peer ID:** A unique identifier for each user (or "peer") on the network. A peer can either generate a random ID or be assigned a specific, predictable one.
*   **PeerServer:** A brokering server that manages peer IDs and introduces peers to each other. PeerJS provides a cloud-hosted PeerServer for easy development, or you can host your own. The server does not handle the actual data transfer between connected peers.
*   **DataConnection:** An object that represents the connection between two peers. You use this object to send and receive data.

## Implementation Guide

### Step 1: Include the PeerJS Library

First, add the PeerJS script to your HTML file.

```html
<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
```

### Step 2: Creating a "Host" Peer

The host acts like a central point that other peers can connect to. It creates a Peer object with a specific ID and waits for incoming connections.

1.  **Initialize the Peer Object:** Create a new `Peer` instance. If you provide a unique string as the first argument, that will be the peer's ID. If you leave it blank, the PeerServer will assign a random one. For a host, a predictable ID is essential.

    ```javascript
    // Initialize the host peer with a specific, unique ID.
    const peer = new Peer('my-unique-host-id');
    let connections = {}; // Object to store all active connections

    peer.on('open', function(id) {
        console.log('Host peer is ready. My ID is:', id);
    });
    ```

2.  **Listen for Incoming Connections:** Use the `peer.on('connection', ...)` event listener. This event fires whenever a client peer successfully connects to this host.

    ```javascript
    peer.on('connection', function(conn) {
        console.log('A client has connected:', conn.peer);
        connections[conn.peer] = conn;

        // Set up event listeners for the new connection
        setupConnectionListeners(conn);
    });
    ```

3.  **Handle Data and Events for Each Connection:** Create a function to manage events for each individual connection, such as receiving data or handling disconnections.

    ```javascript
    function setupConnectionListeners(conn) {
        // Handle incoming data
        conn.on('data', function(data) {
            console.log(`Received data from ${conn.peer}:`, data);
            // Example: Echo the message back to the sender
            conn.send({ message: `Host received your message: "${data.message}"` });
        });

        // Handle connection closing
        conn.on('close', function() {
            console.log(`Connection with ${conn.peer} has been closed.`);
            delete connections[conn.peer];
        });
    }
    ```

### Step 3: Creating a "Client" Peer

The client peer initiates the connection to the host using the host's known ID.

1.  **Initialize the Peer Object:** Create a client `Peer` instance, typically without an ID so the PeerServer can assign one automatically.

    ```javascript
    // Initialize a client peer. The server will assign a random ID.
    const peer = new Peer();
    let hostConnection;

    peer.on('open', function(id) {
        console.log('Client peer is ready. My ID is:', id);
    });
    ```

2.  **Connect to the Host:** Use the `peer.connect()` method with the host's unique ID. This returns a `DataConnection` object.

    ```javascript
    function connectToHost(hostId) {
        console.log(`Attempting to connect to host: ${hostId}`);
        hostConnection = peer.connect(hostId);

        // Set up event listeners for the connection
        setupConnectionListeners(hostConnection);
    }
    ```

3.  **Handle Connection Events:** After calling `peer.connect()`, set up listeners on the `DataConnection` object to handle the `open`, `data`, and `close` events.

    ```javascript
    function setupConnectionListeners(conn) {
        // Fires when the connection is established and ready
        conn.on('open', function() {
            console.log('Connection to host established!');
            // Send a welcome message
            conn.send({ message: 'Hello from the client!' });
        });

        // Handle incoming data from the host
        conn.on('data', function(data) {
            console.log('Received data from host:', data);
        });

        // Handle connection closing
        conn.on('close', function() {
            console.log('Connection to host has been closed.');
            hostConnection = null;
        });
    }

    // Example of how to start the connection
    // connectToHost('my-unique-host-id');
    ```

### Step 4: Error Handling

It's crucial to listen for errors on the main `Peer` object. This can alert you to issues like an invalid host ID or network problems.

```javascript
peer.on('error', function(err) {
    console.error('An error occurred with PeerJS:', err);
    // A common error is 'peer-unavailable' when the host ID doesn't exist.
    if (err.type === 'peer-unavailable') {
        alert('The host ID you are trying to connect to does not exist.');
    }
});
```

## Advanced Usage

### Broadcasting Messages from Host

To send a message to all connected clients, the host can iterate through its collection of active connections.

```javascript
// Function for the HOST peer
function broadcast(data) {
    console.log('Broadcasting data to all clients:', data);
    for (const peerId in connections) {
        const conn = connections[peerId];
        if (conn && conn.open) {
            conn.send(data);
        }
    }
}

// Example usage:
// broadcast({ announcement: 'The session will end in 5 minutes.' });
```

### Heartbeat/Connection Check

WebRTC connections can sometimes drop without immediately firing a `close` event. A "heartbeat" is a simple way to ensure a connection is still active. The client or host periodically sends a small message; if a response isn't received after a certain time, you can assume the connection is lost.

```javascript
// On the CLIENT side
setInterval(() => {
    if (hostConnection && hostConnection.open) {
        hostConnection.send({ type: 'HEARTBEAT' });
    }
}, 5000); // Send a heartbeat every 5 seconds

// On the HOST side, when handling data
conn.on('data', function(data) {
    if (data.type === 'HEARTBEAT') {
        // The connection is alive. You could update a `lastHeartbeat` timestamp here.
        return;
    }
    // Handle other data...
});
```