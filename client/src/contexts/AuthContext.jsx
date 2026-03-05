import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);
export { AuthContext };

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Al montar el app, intentamos recuperar el usuario del localStorage
        const storedUser = localStorage.getItem('siapoas_user');

        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        const storedPerms = localStorage.getItem('siapoas_permisos');
        if (storedPerms) {
            setPermissions(JSON.parse(storedPerms));
        }
        setLoading(false);
    }, []);

    const login = async (userData, msToken) => {
        setUser(userData);
        localStorage.setItem('siapoas_user', JSON.stringify(userData));
        if (msToken) {
            localStorage.setItem('siapoas_ms_token', msToken);
        }
        // Cargar permisos del usuario desde el backend
        try {
            const resp = await fetch('/api/permisos/me', {
                headers: { 'x-user-id': userData.id }
            });
            if (resp.ok) {
                const perms = await resp.json();
                setPermissions(perms);
                localStorage.setItem('siapoas_permisos', JSON.stringify(perms));
            }
        } catch (e) {
            console.warn('No se pudieron cargar los permisos:', e);
        }
    };

    const logout = () => {
        setUser(null);
        setPermissions({});
        localStorage.removeItem('siapoas_user');
        localStorage.removeItem('siapoas_ms_token');
        localStorage.removeItem('siapoas_permisos');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, permissions, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
