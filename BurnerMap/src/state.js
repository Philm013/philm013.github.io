
// Defines the initial state of the application
const app = {
    peer: null, conn: null, connections: [], myId: null, hostId: null,
    username: 'Ghost', isHost: false, map: null, markers: {}, rallyMarker: null,
    battery: 100, isLight: true, layerMode: 'light', layers: {},
    myLocation: null, centered: false, privateChat: null,
    waypoints: [], waypointAddMode: false,
    users: {},
    chatHistory: {},
    wakeLock: null,
    isWakeLockActive: false,
    poiPanelOpen: false,
    localStream: null,
    remoteStream: null,
    currentCall: null,
    inCall: false,
    groupChats: {},
    chatListOpen: false,
    boards: {},
    currentBoard: null
};
