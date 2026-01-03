import React, { createContext, useContext, useState, useEffect } from 'react';

export const USER_COLORS = ['#FF6347', '#4682B4', '#32CD32', '#FFD700', '#DA70D6', '#1E90FF'];

const getInitialUser = () => {
    try {
        const stored = localStorage.getItem('peerdraw-user');
        return stored ? JSON.parse(stored) : { name: 'Guest', color: USER_COLORS[0] };
    } catch (e) {
        return { name: 'Guest', color: USER_COLORS[0] };
    }
};

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(getInitialUser);

    useEffect(() => {
        try {
            localStorage.setItem('peerdraw-user', JSON.stringify(user));
        } catch (e) {
            console.error("Failed to save user preferences:", e);
        }
    }, [user]);

    const updateUser = (newUser) => {
        setUser(prevUser => ({ ...prevUser, ...newUser }));
    };

    return (
        <UserContext.Provider value={{ user, updateUser, USER_COLORS }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);