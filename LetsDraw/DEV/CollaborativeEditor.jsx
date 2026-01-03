// CollaborativeEditor.jsx (CORRECTED)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils } from 'tldraw';
import { Peer } from 'peerjs';
import { useUser } from './UserProvider.jsx';
import { useUI } from './UIProvider.jsx'; // We still need the hook to show toasts/modals
import { DB } from './db.js';
import { throttle } from './utils.js';

const uiOverrides = {
    actions(editor, actions) {
        actions['toggle-fullscreen'] = { id: 'toggle-fullscreen', label: 'Toggle Fullscreen', readonlyOk: true, onSelect: () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); } else if (document.exitFullscreen) { document.exitFullscreen(); } } };
        return actions;
    },
    menu(editor, menu, { actions }) {
        const fileMenu = menu.find(item => item.id === 'menu' && item.type === 'group');
        if (fileMenu) {
            fileMenu.children.unshift({ id: 'toggle-fullscreen-item', type: 'item', action: actions['toggle-fullscreen'], icon: 'maximize-2' }, { id: 'custom-separator', type: 'separator' });
        }
        return menu;
    },
};

export function CollaborativeEditor({ boardId, isHost, initialSnapshot, onClose }) {
    const [store] = useState(() => {
        const s = createTLStore({ shapeUtils: defaultShapeUtils });
        if (initialSnapshot) s.loadSnapshot(initialSnapshot);
        return s;
    });

    const [connections, setConnections] = useState(new Map());
    const [status, setStatus] = useState('connecting');
    const { user } = useUser();
    const { showToast, modal, setModal } = useUI();
    const connectionsRef = useRef(connections);
    
    useEffect(() => { connectionsRef.current = connections; }, [connections]);

    useEffect(() => {
        // Using a non-null assertion for PeerJS because it's loaded from a global script tag
        const peer = new Peer(isHost ? boardId : undefined, { debug: 2 });
        peer.on('open', () => { setStatus('connected'); if (!isHost) setupConnection(peer.connect(boardId)); });
        peer.on('connection', conn => setupConnection(conn));
        peer.on('error', err => { setStatus('error'); showToast(err.type, 'error'); });
        return () => peer.destroy();
    }, [boardId, isHost, showToast]);

    const setupConnection = (conn) => {
        conn.on('open', () => { setConnections(prev => new Map(prev).set(conn.peer, conn)); if (isHost) conn.send(JSON.stringify({ type: 'init', snapshot: store.getSnapshot() })); });
        conn.on('data', raw => handleRemoteData(JSON.parse(raw)));
        conn.on('close', () => setConnections(prev => { const n = new Map(prev); n.delete(conn.peer); return n; }));
    };

    const handleRemoteData = (msg) => {
        if (msg.type === 'init') store.loadSnapshot(msg.snapshot);
        else if (msg.type === 'changes') {
            store.mergeRemoteChanges(() => {
                const { added, updated, removed } = msg.changes;
                if (added) Object.values(added).forEach(r => store.put([r]));
                if (updated) Object.values(updated).forEach(([, after]) => store.put([after]));
                if (removed) Object.values(removed).forEach(r => store.remove([r.id]));
            });
        }
    };

    useEffect(() => {
        const SYNCED_TYPES = new Set(['shape', 'asset', 'page', 'instance_presence']);
        const filter = (changes) => {
            const f = { added: {}, updated: {}, removed: {} };
            for (const id in changes.added) if (SYNCED_TYPES.has(changes.added[id].typeName)) f.added[id] = changes.added[id];
            for (const id in changes.updated) {
                const [, after] = changes.updated[id];
                if (SYNCED_TYPES.has(after.typeName)) {
                    if (after.typeName === 'instance_presence') {
                        after.userName = user.name;
                        after.color = user.color;
                    }
                    f.updated[id] = changes.updated[id];
                }
            }
            for (const id in changes.removed) if (SYNCED_TYPES.has(changes.removed[id].typeName)) f.removed[id] = changes.removed[id];
            return f;
        };
        const broadcast = (changes) => {
            const filtered = filter(changes);
            if (!Object.values(filtered).some(c => Object.keys(c).length)) return;
            const payload = JSON.stringify({ type: 'changes', changes: filtered });
            connectionsRef.current.forEach(c => c.open && c.send(payload));
        };
        return store.listen(throttle(update => {
            if (update.source !== 'user') return;
            broadcast(update.changes);
            if (isHost) DB.save(boardId, store.getSnapshot());
        }, 32));
    }, [store, isHost, boardId, user.name, user.color]);

    const handleAssetUpload = useCallback(file => new Promise(res => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result);
        reader.readAsDataURL(file);
    }), []);

    const SharePanel = () => <div className="custom-share-panel"><div className={`status-dot ${status === 'connected' ? 'connected' : ''}`} title={`Status: ${status}`} />{isHost && <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', width: 'auto' }} onClick={() => setModal('share')}>Invite</button>}<button className="btn-secondary" style={{ padding: '8px', width: 'auto' }} onClick={onClose} title="Home">🏠</button></div>;

    const ShareModal = () => {
        const url = `${window.location.origin}${window.location.pathname}?join=${boardId}`;
        const handleCopy = () => { navigator.clipboard.writeText(url); showToast('Link Copied!', 'success'); };
        useEffect(() => {
            // Using a non-null assertion because QRCode is a global script
            const canvas = document.getElementById('qr-canvas-share');
            if (canvas) QRCode.toCanvas(canvas, url, { width: 200, margin: 1 });
        }, [url]);
        return <div className="modal-backdrop"><div className="modal-content"><h3>Invite Collaborators</h3><canvas id="qr-canvas-share" style={{ display: 'block', margin: '0 auto 15px', borderRadius: 8 }}></canvas><input type="text" value={url} readOnly onClick={e => e.target.select()} /><button className="btn-primary" onClick={handleCopy}>Copy Link</button><button className="btn-secondary" onClick={() => setModal(null)} style={{ marginTop: 10 }}>Close</button></div></div>;
    };

    return (
        <>
            <Tldraw store={store} overrides={uiOverrides} components={{ SharePanel }} onMount={editor => { editor.user.updateUserPreferences({ name: user.name, color: user.color }); if (window.innerWidth < 600) editor.updateInstanceState({ isGridMode: false }); }} onAssetUpload={handleAssetUpload} />
            {modal === 'share' && <ShareModal />}
        </>
    );
}