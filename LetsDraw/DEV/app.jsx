// App.jsx (CORRECTED)
import React, { useState, useEffect } from 'react';
import { Dashboard } from './Dashboard.jsx';
import { Workspace } from './Workspace.jsx';
import { UserProvider } from './UserProvider.jsx';
import { UIProvider, useUI } from './UIProvider.jsx'; // Import useUI hook

function GlobalUI() {
    const { toast, modal, setModal } = useUI();

    // This component will render the global UI elements.
    // It's separate so it can access the useUI context.
    return (
        <>
            <div 
                id="toast" 
                className={`toast ${toast.visible ? 'visible' : ''}`} 
                style={{ backgroundColor: toast.type === 'error' ? 'var(--error)' : '#333' }}
            >
                {toast.message}
            </div>
            {/* You could also add the ScanModal and ShareModal here if you wanted to control them globally */}
        </>
    );
}


export default function App() {
    const [currentBoard, setCurrentBoard] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get('join');
        if (joinId) {
            setCurrentBoard({ id: joinId, isHost: false });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);
    
    useEffect(() => {
        const theme = localStorage.getItem('theme') || 'light';
        document.body.dataset.theme = theme;
    }, []);

    const handleStartBoard = (boardInfo) => setCurrentBoard(boardInfo);
    const handleCloseBoard = () => setCurrentBoard(null);

    return (
        <UserProvider>
            <UIProvider>
                {currentBoard ? (
                    <Workspace boardInfo={currentBoard} onClose={handleCloseBoard} />
                ) : (
                    <Dashboard onStartBoard={handleStartBoard} />
                )}
                {/* GlobalUI is rendered here, within the context providers but at the top level */}
                <GlobalUI />
            </UIProvider>
        </UserProvider>
    );
}