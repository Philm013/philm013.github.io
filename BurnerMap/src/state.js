
// Defines the initial state of the application
const app = {
    peer: null, conn: null, connections: [], myId: null, hostId: null,
    username: 'Ghost', isHost: false, map: null, markers: {}, rallyMarker: null,
    battery: 100, isLight: false, layerMode: 'dark', layers: {},
    myLocation: null, centered: false
};
