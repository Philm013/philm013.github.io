# PeerJS Documentation
[PeerJS](https://peerjs.com/) docs
----------------

  
PeerJS simplifies peer-to-peer data, video, and audio calls.

This guide will show you the basic concepts of the PeerJS API.

Setup
-----

### 1\. Include the Javascript client

Add the PeerJS client library to your webpage.

```
<script src="https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js"></script>
```


If you prefer, you can host it yourself: [peerjs.min.js](https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js), or [fork us on Github](https://github.com/peers/peerjs).

### 2\. Create the Peer object

The Peer object is where we create and receive connections.

```
var peer = new Peer();
```


PeerJS uses PeerServer for session metadata and candidate signaling. You can also [run your own PeerServer](https://github.com/peers/peerjs-server) if you don't like the cloud.

We're now ready to start making connections!

Usage
-----

Every Peer object is assigned a random, unique ID when it's created.

```
peer.on('open', function(id) {
	console.log('My peer ID is: ' + id);
  });
```


When we want to connect to another peer, we'll need to know their peer id. You're in charge of communicating the peer IDs between users of your site. Optionally, you can pass in your own IDs to the [`Peer` constructor](#peer) .

Read the [Peer API reference](#peer) for complete information on its [options](#peer-options), methods, [events](#peeron), and [error handling](#peeron-error).

### Data connections

Start a data connection by calling `peer.connect` with the peer ID of the destination peer. Anytime another peer attempts to connect to your peer ID, you'll receive a `connection` event.

```
var conn = peer.connect('dest-peer-id');
```


```
peer.on('connection', function(conn) { ... });
```


`peer.connect` and the callback of the `connection` event will both provide a `DataConnection` object. This object will allow you to send and receive data:

```
conn.on('open', function() {
	// Receive messages
	conn.on('data', function(data) {
	  console.log('Received', data);
	});

	// Send messages
	conn.send('Hello!');
  });
```


Read the [DataConnection API reference](#dataconnection) for complete details on its methods and events.

### Video/audio calls

Call another peer by calling `peer.call` with the peer ID of the destination peer. When a peer calls you, the `call` event is emitted.

Unlike data connections, when receiving a `call` event, the call must be answered or no connection is established.

```
// Call a peer, providing our mediaStream
  var call = peer.call('dest-peer-id',
	mediaStream);

  
```


```
peer.on('call', function(call) {
	// Answer the call, providing our mediaStream
	call.answer(mediaStream);
  });
```


When calling or answering a call, a MediaStream should be provided. The MediaStream represents the local video (webcam) or audio stream and can be obtained with some (browser-specific) version of [`navigator.getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator.getUserMedia) . When answering a call, the MediaStream is optional and if none is provided then a one-way call is established. Once the call is established, its `open` property is set to true.

`peer.call` and the callback of the `call` event provide a MediaConnection object. The MediaConnection object itself emits a `stream` event whose callback includes the video/audio stream of the other peer.

```
call.on('stream', function(stream) {
	// `stream` is the MediaStream of the remote peer.
	// Here you'd add it to an HTML video/canvas element.
  });
```


Read the [MediaConnection API reference](#mediaconnection) for complete details on its methods and events.

Common questions
----------------

### What kind of data can I send?

PeerJS has the [BinaryPack](https://github.com/binaryjs/js-binarypack) serialization format built-in. This means you can send any JSON type as well as binary Blobs and ArrayBuffers. Simply send arbitrary data and you'll get it out the other side:

```
  conn.send({
	strings: 'hi!',
	numbers: 150,
	arrays: [1,2,3],
	evenBinary: new Blob([1,2,3]),
	andMore: {bool: true}
  });
```


### Are there any caveats?

A small percentage of users are behind symmetric NATs. When two symmetric NAT users try to connect to each other, NAT traversal is impossible and no connection can be made. A workaround is to proxy through the connection through a TURN server. The PeerServer cloud service provides a free TURN server. This will allow your PeerJS app to work seamlessly for this situation

### How do I use a TURN server?

When creating your Peer object, pass in the ICE servers as the config key of the options hash.

```
  var peer = new Peer({
	config: {'iceServers': [
	  { url: 'stun:stun.l.google.com:19302' },
	  { url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' }
	]} /* Sample servers, please use appropriate ones */
  });
  
```


### What if my peer has not yet connected to the server when I attempt to connect to it?

When you try to connect to a peer, PeerServer will hold a connection offer for up to 5 seconds before rejecting it. This is useful if you want to reconnect to a peer as it disconnects and reconnects rapidly between web pages.

### Why am I unable to connect?

You could be behind a symmetric NAT, in which case you'll need to set up a TURN server.

Another possible issue is your network blocking port 443, which the PeerServer cloud runs on. In this you must use your own PeerServer running on an appropriate port instead of the cloud service.

### What about latency/bandwidth?

Data sent between the two peers do not touch any other servers, so the connection speed is limited only by the upload and download rates of the two peers. This also means you don't have the additional latency of an intermediary server.

The latency to establish a connection can be split into two components: the brokering of data and the identification of clients. PeerJS has been designed to minimize the time you spend in these two areas. For brokering, data is sent through an XHR streaming request before a WebSocket connection is established, then through WebSockets. For client identification, we provide you the ability to pass in your own peer IDs, thus eliminating the RTT for retrieving an ID from the server.

### More questions?

PeerJS API Reference « »
-----------------

Getting Started
---------------

[Peer](#peer)constructorconst peer = new Peer(\[id\], \[options\]);

A peer can connect to other peers and listen for connections.

[\[id\]](#peer-id)string

Other peers can connect to this peer using the provided ID. If no ID is given, one will be generated by the brokering server. The ID must start and end with an alphanumeric character (lower or upper case character or a digit). In the middle of the ID spaces, dashes (-) and underscores (\_) are allowed.It's not recommended that you use this ID to identify peers, as it's meant to be used for brokering connections only. You're recommended to set the [`metadata`](#peerconnect-options) option to send other identifying information.

[\[options\]](#peer-options)object

[key](#peer-options-key)string

API key for the cloud PeerServer. This is not used for servers other than `0.peerjs.com`.PeerServer cloud runs on port 443. Please ensure it is not blocked or consider running your own PeerServer instead.

[host](#peer-options-host)string

Server host. Defaults to `0.peerjs.com`. Also accepts `'/'` to signify relative hostname.

[port](#peer-options-port)number

Server port. Defaults to `443`.

[pingInterval](#peer-options-pinginterval)number

Ping interval in ms. Defaults to `5000`.

[path](#peer-options-path)string

The path where your self-hosted PeerServer is running. Defaults to `'/'`.

[secure](#peer-options-secure)boolean

`true` if you're using SSL.Note that our cloud-hosted server and assets may not support SSL.

[config](#peer-options-config)object

Configuration hash passed to RTCPeerConnection. This hash contains any custom ICE/TURN server configuration. Defaults to `{ 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }], 'sdpSemantics': 'unified-plan' }`

[debug](#peer-options-debug)number

Prints log messages depending on the debug level passed in. Defaults to `0`.

[2](#peer-options-debug-2)

Prints errors and warnings.

[peer.connect](#peerconnect)methodconst [dataConnection](#dataconnection) = peer.connect(id, \[options\]);

Connects to the remote peer specified by `id` and returns a data connection. Be sure to listen on the [`error`](#peeron-error) event in case the connection fails.

[id](#peerconnect-id)string

The brokering ID of the remote peer (their [`peer.id`](#peerid)).

[\[options\]](#peerconnect-options)object

[label](#peerconnect-options-label)string

A unique label by which you want to identify this data connection. If left unspecified, a label will be generated at random. Can be accessed with [`dataConnection.label`](#dataconnection-label).

[serialization](#peerconnect-options-serialization)string

Can be `binary` (default), `binary-utf8`, `json`, or `none`. Can be accessed with [`dataConnection.serialization`](#dataconnection-serialization).`binary-utf8` will take a performance hit because of the way UTF8 strings are packed into binary format.

[reliable](#peerconnect-options-reliable)boolean

Whether the underlying data channels should be reliable (e.g. for large file transfers) or not (e.g. for gaming or streaming). Defaults to `false`.Setting reliable to true will use a shim for incompatible browsers (Chrome 30 and below only) and thus may not offer full performance.

[peer.call](#peercall)methodconst [mediaConnection](#mediaconnection) = peer.call(id, stream, \[options\]);

Calls the remote peer specified by `id` and returns a media connection. Be sure to listen on the [`error`](#peeron-error) event in case the connection fails.

[id](#peercall-id)string

The brokering ID of the remote peer (their [`peer.id`](#peerid)).

[stream](#peercall-stream)MediaStream

The caller's media stream

[\[options\]](#peercall-options)object

[sdpTransform](#peercall-options-sdptransform)method

Function which runs before create offer to modify sdp offer message.

[peer.on](#peeron)methodpeer.on(event, callback);

Set listeners for peer events.

['open'](#peeron-open)eventpeer.on('open', function(id) { ... });

Emitted when a connection to the PeerServer is established. You may use the peer before this is emitted, but messages to the server will be queued. `id` is the brokering ID of the peer (which was either provided in the constructor or assigned by the server).You should not wait for this event before connecting to other peers if connection speed is important.

['connection'](#peeron-connection)eventpeer.on('connection', function([dataConnection](#dataconnection)) { ... });

Emitted when a new data connection is established from a remote peer.

['call'](#peeron-call)eventpeer.on('call', function([mediaConnection](#mediaconnection)) { ... });

Emitted when a remote peer attempts to call you. The emitted `mediaConnection` is not yet active; you must first answer the call ([`mediaConnection.answer([stream]);`](#mediaconnection-answer)). Then, you can listen for the [`stream`](#mediaconnection-on) event.

['close'](#peeron-close)eventpeer.on('close', function() { ... });

Emitted when the peer is [destroyed](#peerdestroy) and can no longer accept or create any new connections. At this time, the peer's connections will all be closed. To be extra certain that peers clean up correctly, we recommend calling `peer.destroy()` on a peer when it is no longer needed.

['disconnected'](#peeron-disconnected)eventpeer.on('disconnected', function() { ... });

Emitted when the peer is disconnected from the signalling server, either [manually](#peerdisconnect) or because the connection to the signalling server was lost. When a peer is disconnected, its existing connections will stay alive, but the peer cannot accept or create any new connections. You can reconnect to the server by calling [`peer.reconnect()`](#peerreconnect).

['error'](#peeron-error)eventpeer.on('error', function(err) { ... });

Errors on the peer are **almost always fatal** and will destroy the peer. Errors from the underlying socket and PeerConnections are forwarded here.

These come in the following `err.type` flavors:

['browser-incompatible'](#peeron-error-browser-incompatible)Errorfatal

The client's browser does not support some or all WebRTC features that you are trying to use.

['disconnected'](#peeron-error-disconnected)Error

You've already disconnected this peer from the server and can no longer make any new connections on it.

['invalid-id'](#peeron-error-invalid-id)Errorfatal

The ID passed into the Peer constructor contains illegal characters.

['invalid-key'](#peeron-error-invalid-key)Errorfatal

The API key passed into the Peer constructor contains illegal characters or is not in the system (cloud server only).

['network'](#peeron-error-network)Error

Lost or cannot establish a connection to the signalling server.

['peer-unavailable'](#peeron-error-peer-unavailable)Error

The peer you're trying to connect to does not exist.

['ssl-unavailable'](#peeron-error-ssl-unavailable)Errorfatal

PeerJS is being used securely, but the cloud server does not support SSL. Use a custom PeerServer.

['server-error'](#peeron-error-server-error)Errorfatal

Unable to reach the server.

['socket-error'](#peeron-error-socket-error)Errorfatal

An error from the underlying socket.

['socket-closed'](#peeron-error-socket-closed)Errorfatal

The underlying socket closed unexpectedly.

['unavailable-id'](#peeron-error-unavailable-id)Errorsometimes fatal

The ID passed into the Peer constructor is already taken.This error is not fatal if your peer has open peer-to-peer connections. This can happen if you attempt to [reconnect](#peerreconnect) a peer that has been [disconnected from the server](#peerdisconnect), but its old ID has now been taken.

['webrtc'](#peeron-error-webrtc)Error

Native WebRTC errors.

[peer.disconnect](#peerdisconnect)methodpeer.disconnect();

Close the connection to the server, leaving all existing data and media connections intact. [`peer.disconnected`](#peerdisconnected) will be set to `true` and the [`disconnected`](#peeron-disconnected) event will fire.This cannot be undone; the respective peer object will no longer be able to create or receive any connections and its ID will be forfeited on the (cloud) server.

[peer.reconnect](#peerreconnect)methodpeer.reconnect();

Attempt to reconnect to the server with the peer's old ID. Only [disconnected peers](#peerdisconnect) can be reconnected. Destroyed peers cannot be reconnected. If the connection fails (as an example, if the peer's old ID is now taken), the peer's existing connections will not close, but any associated errors events will fire.

[peer.destroy](#peerdestroy)methodpeer.destroy();

Close the connection to the server and terminate all existing connections. [`peer.destroyed`](#peerdestroyed) will be set to `true`.This cannot be undone; the respective peer object will no longer be able to create or receive any connections, its ID will be forfeited on the (cloud) server, and all of its data and media connections will be closed.

[peer.id](#peerid)string

The brokering ID of this peer. If no ID was specified in [the constructor](#peer), this will be `undefined` until the [`open`](#peeron-open) event is emitted.

[peer.connections](#peerconnections)object

A hash of all connections associated with this peer, keyed by the remote peer's ID.We recommend keeping track of connections yourself rather than relying on this hash.

[peer.disconnected](#peerdisconnected)boolean

`false` if there is an active connection to the PeerServer.

[peer.destroyed](#peerdestroyed)boolean

`true` if this peer and all of its connections can no longer be used.

[DataConnection](#dataconnection)class

Wraps WebRTC's DataChannel. To get one, use [`peer.connect`](#peerconnect) or listen for the [`connect`](#peeron-connect) event.

[.send](#dataconnection-send)methoddataConnection.send(data);

`data` is serialized by BinaryPack by default and sent to the remote peer.

[data](#dataconnection-send-data)

You can send any type of data, including objects, strings, and blobs.

[.close](#dataconnection-close)methoddataConnection.close();

Closes the data connection gracefully, cleaning up underlying DataChannels and PeerConnections.

[.on](#dataconnection-on)methoddataConnection.on(event, callback);

Set listeners for data connection events.

['data'](#dataconnection-on-data)eventdataConnection.on('data', function(data) { ... });

Emitted when data is received from the remote peer.

['open'](#dataconnection-on-open)eventdataConnection.on('open', function() { ... });

Emitted when the connection is established and ready-to-use.

['close'](#dataconnection-on-close)eventdataConnection.on('close', function() { ... });

Emitted when either you or the remote peer closes the data connection.

['error'](#dataconnection-on-error)eventdataConnection.on('error', function(err) { ... });

[.dataChannel](#dataconnection-datachannel)object

A reference to the RTCDataChannel object associated with the connection.

[.label](#dataconnection-label)string

The optional label passed in or assigned by PeerJS when the connection was initiated.

[.open](#dataconnection-open)boolean

This is true if the connection is open and ready for read/write.

[.peerConnection](#dataconnection-peerconnection)object

A reference to the RTCPeerConnection object associated with the connection.

[.peer](#dataconnection-peer)string

The ID of the peer on the other end of this connection.

[.reliable](#dataconnection-reliable)boolean

Whether the underlying data channels are reliable; defined when the connection was initiated.

[.serialization](#dataconnection-serialization)string

The serialization format of the data sent over the connection. Can be `binary` (default), `binary-utf8`, `json`, or `none`.

[.type](#dataconnection-type)string

For data connections, this is always `'data'`.

[.bufferSize](#dataconnection-buffersize)number

The number of messages queued to be sent once the browser buffer is no longer full.

[util](#util)objectutility

Provides a variety of helpful utilities.Only the utilities documented here are guaranteed to be present on `util`. Undocumented utilities can be removed without warning. We don't consider these to be 'breaking changes.'

[.browser](#util-browser)stringif (util.browser === 'Firefox') { /\* OK to peer with Firefox peers. \*/ }

The current browser. `util.browser` can currently have the values 'firefox', 'chrome', 'safari', 'edge', 'Not a supported browser.', 'Not a browser.' (unknown WebRTC-compatible agent).

[.supports](#util-supports)objectif (util.supports.data) { /\* OK to start a data connection. \*/ }

A hash of WebRTC features mapped to booleans that correspond to whether the feature is supported by the current browser.Only the properties documented here are guaranteed to be present on `util.supports`.

[.audioVideo](#util-supports-audiovideo)boolean

True if the current browser supports media streams and PeerConnection.

[.data](#util-supports-data)boolean

True if the current browser supports DataChannel and PeerConnection.

[.binary](#util-supports-binary)boolean

True if the current browser supports binary DataChannels.

[.reliable](#util-supports-reliable)boolean

True if the current browser supports reliable DataChannels.
