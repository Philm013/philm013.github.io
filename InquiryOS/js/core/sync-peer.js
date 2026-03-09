/**
 * @file sync-peer.js
 * @description P2P synchronization layer using PeerJS for real-time collaboration.
 */

/* global Peer */

import { App } from './state.js';
import { toast } from '../ui/utils.js';
import { dbPut, STORE_SESSIONS } from './storage.js';

export class P2PManager {
    constructor() {
        this.peer = null;
        this.connections = new Map(); // visitorId -> connection
        this.isHost = App.mode === 'teacher';
        this.prefix = 'IOS-'; // InquiryOS prefix
    }

    /**
     * Initializes the PeerJS instance and sets up event listeners.
     */
    init() {
        if (!App.classCode) return;

        // Re-sync isHost in case App.mode changed after constructor
        this.isHost = App.mode === 'teacher';

        const myId = this.prefix + App.classCode + '-' + App.user.visitorId;
        console.log('P2P: Initializing with ID', myId);

        try {
            this.peer = new Peer(myId, {
                debug: 1
            });

            this.peer.on('open', (id) => {
                console.log('P2P: Connected to broker with ID', id);
                this.discoverPeers();
            });

            this.peer.on('connection', (conn) => {
                // Prevent duplicate connections from same peer
                const remoteVisitorId = conn.peer.split('-').pop();
                if (this.connections.has(remoteVisitorId)) {
                    console.log('P2P: Closing duplicate incoming connection from', remoteVisitorId);
                    conn.close();
                    return;
                }
                this.setupConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('P2P Error:', err);
                if (err.type === 'unavailable-id') {
                    // This might happen if two tabs open with same visitorId
                    console.warn('P2P: ID already taken.');
                }
            });

        } catch (e) {
            console.error('P2P: Failed to init PeerJS', e);
        }
    }

    /**
     * Set up a new data connection.
     */
    setupConnection(conn) {
        const remoteVisitorId = conn.peer.split('-').pop();
        
        conn.on('open', () => {
            console.log('P2P: Connected to', remoteVisitorId);
            this.connections.set(remoteVisitorId, conn);
            
            // If I am host, send current state to the new connection
            if (this.isHost) {
                this.sendStateTo(remoteVisitorId);
            }
        });

        conn.on('data', (data) => {
            this.handleData(data, remoteVisitorId);
        });

        conn.on('close', () => {
            console.log('P2P: Connection closed with', remoteVisitorId);
            this.connections.delete(remoteVisitorId);
        });
    }

    /**
     * Discovers other peers in the same class.
     * Prioritizes connecting to the Teacher (Host).
     */
    async discoverPeers() {
        if (!this.peer || !this.peer.open) return;

        // 1. Always try to connect to the Teacher if I am a student
        if (!this.isHost) {
            const teacherVisitorId = 'teacher_' + App.classCode;
            const teacherPeerId = this.prefix + App.classCode + '-' + teacherVisitorId;
            
            if (teacherPeerId !== this.peer.id && !this.connections.has(teacherVisitorId)) {
                console.log('P2P: Attempting to connect to teacher host...');
                const conn = this.peer.connect(teacherPeerId, { reliable: true });
                this.setupConnection(conn);
            }
        }

        // 2. Discover other known peers from the local registry
        const { dbGetByIndex, STORE_USERS } = await import('./storage.js');
        const allUsers = await dbGetByIndex(STORE_USERS, 'classCode', App.classCode);
        
        allUsers.forEach(u => {
            if (u.visitorId !== App.user.visitorId) {
                const peerId = this.prefix + App.classCode + '-' + u.visitorId;
                if (!this.connections.has(u.visitorId)) {
                    const conn = this.peer.connect(peerId, { reliable: true });
                    this.setupConnection(conn);
                }
            }
        });
    }

    /**
     * Handles incoming data from a peer.
     */
    async handleData(data, fromId) {
        if (!data || !data.type) return;

        console.log(`P2P: Received ${data.type} from ${fromId}`);

        switch (data.type) {
            case 'SYNC_STATE':
                // Received full state update (usually from teacher)
                if (data.teacherSettings) {
                    App.teacherSettings = { ...App.teacherSettings, ...data.teacherSettings };
                }
                if (data.sharedData) {
                    App.sharedData = { ...App.sharedData, ...data.sharedData };
                }
                // Update UI
                window.updateModeUI();
                break;

            case 'WORK_UPDATE':
                // Received work update from a student
                if (data.work && fromId) {
                    // Save to local storage so teacher can see it
                    await dbPut(STORE_SESSIONS, {
                        code: App.classCode + ':work:' + fromId,
                        work: data.work,
                        timestamp: Date.now()
                    });
                    
                    // If teacher is viewing this student, update current work
                    if (App.viewingStudentId === fromId) {
                        App.work = data.work;
                        window.renderTeacherContent();
                    }
                }
                break;
            
            case 'BROADCAST':
                // Received a generic broadcast (e.g. new post)
                if (data.path && data.value !== undefined) {
                    const { setNestedValue } = await import('./sync.js');
                    if (data.path === 'debatePosts') {
                        App.sharedData.debatePosts = data.value;
                    } else if (data.path.startsWith('teacherSettings')) {
                        setNestedValue(App, data.path, data.value);
                    } else {
                        setNestedValue(App.work, data.path, data.value);
                    }
                    window.updateModeUI();
                }
                break;
        }
    }

    /**
     * Broadcasts data to all connected peers.
     */
    broadcast(data) {
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }

    /**
     * Sends current relevant state to a specific peer.
     */
    sendStateTo(visitorId) {
        const conn = this.connections.get(visitorId);
        if (conn && conn.open) {
            conn.send({
                type: 'SYNC_STATE',
                teacherSettings: App.teacherSettings,
                sharedData: App.sharedData
            });
        }
    }

    /**
     * Sends student's own work to others (primarily for teacher to see).
     */
    sendWorkUpdate() {
        if (App.mode === 'student') {
            this.broadcast({
                type: 'WORK_UPDATE',
                work: App.work
            });
        }
    }

    /**
     * Broadcasts a specific change.
     */
    sendBroadcast(path, value) {
        this.broadcast({
            type: 'BROADCAST',
            path,
            value
        });
    }
}

export const p2p = new P2PManager();
