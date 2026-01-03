import React, { useState, useEffect, useRef } from 'react';
import { useUser } from './UserProvider.jsx';
import { useUI } from './UIProvider.jsx';
import { uniqueId } from 'tldraw';
import { DB } from './db.js';

export function Dashboard({ onStartBoard }) {
    const { user, updateUser, USER_COLORS } = useUser();
    const { showToast, modal, setModal } = useUI();
    const [recents, setRecents] = useState([]);
    const [joinId, setJoinId] = useState('');
    const scannerRef = useRef(null);

    useEffect(() => {
        DB.getAll().then(setRecents);
    }, []);

    const handleThemeToggle = () => {
        const newTheme = document.body.dataset.theme === 'light' ? 'dark' : 'light';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
    };

    const handleStartScan = () => {
        setModal('scan');
        // Delay scanner start to allow modal to render
        setTimeout(() => {
            scannerRef.current = new Html5Qrcode("qr-reader");
            scannerRef.current.start(
                { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    try {
                        const url = new URL(decodedText);
                        const joinParam = url.searchParams.get('join');
                        if (joinParam) {
                            handleStopScan();
                            onStartBoard({ id: joinParam, isHost: false });
                        }
                    } catch (e) { /* ignore */ }
                }, () => {}
            ).catch(() => showToast('Camera error or permission denied.', 'error'));
        }, 100);
    };

    const handleStopScan = () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
        }
        setModal(null);
    };

    return (
        <>
            <div id="dashboard" className="layer">
                <div className="dash-container">
                    <div className="header-row"><h1>PeerDraw Pro</h1><button className="btn-icon" onClick={handleThemeToggle}>🌓</button></div>
                    <div className="card">
                        <h3>👤 Who are you?</h3>
                        <input type="text" placeholder="Enter your name" maxLength="15" value={user.name} onChange={(e) => updateUser({ name: e.target.value })} />
                        <div className="color-picker">
                            {USER_COLORS.map(color => <div key={color} className={`color-opt ${user.color === color ? 'selected' : ''}`} style={{ backgroundColor: color }} onClick={() => updateUser({ color })} />)}
                        </div>
                    </div>
                    <div className="btn-grid">
                        <button className="btn-primary" onClick={() => onStartBoard({ id: uniqueId(), isHost: true })}>➕ New Board</button>
                        <button className="btn-secondary" onClick={handleStartScan}>📷 Scan to Join</button>
                    </div>
                    <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                        <input type="text" placeholder="Paste Board ID here..." value={joinId} onChange={e => setJoinId(e.target.value)} style={{ marginBottom: 0 }} />
                        <button className="btn-secondary" style={{ width: 'auto' }} onClick={() => joinId && onStartBoard({ id: joinId, isHost: false })}>Join</button>
                    </div>
                    <h3 style={{ marginTop: 30, opacity: 0.6, textTransform: 'uppercase', fontSize: '0.8rem' }}>Recent Boards</h3>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {recents.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'gray' }}>No recent boards</div> : recents.map(b => (
                            <div key={b.id} className="board-item" onClick={() => onStartBoard({ id: b.id, isHost: true, snapshot: b.snapshot })}>
                                <span>📅 {new Date(b.updatedAt).toLocaleDateString()} ({b.id.slice(0, 5)})</span> <span>➡️</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {modal === 'scan' && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>Scan QR Code</h3>
                        <div id="qr-reader" style={{ width: '100%' }}></div>
                        <button className="btn-secondary" onClick={handleStopScan} style={{ marginTop: 15 }}>Close</button>
                    </div>
                </div>
            )}
        </>
    );
}