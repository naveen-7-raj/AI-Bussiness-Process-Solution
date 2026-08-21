import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

const parseJwtUser = (token) => {
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const email = payload.email || payload.sub || localStorage.getItem('userEmail') || 'user@nexora.ai';
        const rawName = payload.name || email.split('@')[0];
        const name = rawName.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const companyId = payload.company_id || 1;
        const role = payload.role || localStorage.getItem('userRole') || 'user';
        return { email, name, companyId, role };
    } catch {
        const email = localStorage.getItem('userEmail') || 'user@nexora.ai';
        const role = localStorage.getItem('userRole') || 'user';
        return { email, name: 'Operations Lead', companyId: 1, role };
    }
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [isAuthenticated, setIsAuthenticated] = useState(!!token);
    const [user, setUser] = useState(() => parseJwtUser(token));

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    const fetchMe = useCallback(async (authToken) => {
        if (!authToken) return;
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.role) {
                    localStorage.setItem('userRole', data.role);
                }
                if (data.email) {
                    localStorage.setItem('userEmail', data.email);
                }
                setUser(prev => ({
                    ...prev,
                    email: data.email || prev?.email,
                    name: data.name || prev?.name,
                    role: data.role || prev?.role || 'user',
                    companyId: data.company_id || prev?.companyId,
                }));
            } else if (res.status === 401 || res.status === 403) {
                logout();
            }
        } catch {
            // Keep parsed JWT fallback
        }
    }, [logout]);

    useEffect(() => {
        if (token) {
            fetchMe(token);
        }
    }, [token, fetchMe]);

    const login = (newToken, email, userData) => {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');

        if (newToken) {
            localStorage.setItem('token', newToken);
        }
        const effectiveEmail = email || userData?.email;
        if (effectiveEmail) {
            localStorage.setItem('userEmail', effectiveEmail);
        }
        if (userData?.role) {
            localStorage.setItem('userRole', userData.role);
        }
        setToken(newToken);
        const parsed = parseJwtUser(newToken);
        const finalUser = userData ? { ...parsed, ...userData, email: effectiveEmail || parsed?.email, role: userData.role || parsed?.role } : parsed;
        setUser(finalUser);
        setIsAuthenticated(true);
        if (!userData) {
            fetchMe(newToken);
        }
    };

    return (
        <AuthContext.Provider value={{ token, isAuthenticated, user, login, logout, fetchMe }}>
            {children}
        </AuthContext.Provider>
    );
};
