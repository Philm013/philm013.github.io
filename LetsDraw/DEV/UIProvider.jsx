// UIProvider.jsx (CORRECTED)
import React, { createContext, useContext, useState, useCallback } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
    const [modal, setModal] = useState(null); // 'scan', 'share', or null
    
    // The showToast function is now memoized for performance.
    const showToast = useCallback((message, type = 'info') => {
        setToast({ visible: true, message, type });
        // Use a functional update to prevent stale state issues in timeout.
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    }, []);

    const value = { toast, showToast, modal, setModal };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);