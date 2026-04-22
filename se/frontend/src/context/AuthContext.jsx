import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(() => { try { return JSON.parse(localStorage.getItem('erp_user')); } catch { return null; } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      api.get('/auth/me')
        .then(r => { setUser(r.data.user); localStorage.setItem('erp_user', JSON.stringify(r.data.user)); })
        .catch(() => { localStorage.removeItem('erp_token'); localStorage.removeItem('erp_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (identifier, password, portal) => {
    const r = await api.post('/auth/login', { identifier, password, portal });
    localStorage.setItem('erp_token', r.data.token);
    localStorage.setItem('erp_user',  JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setUser(null);
  }, []);

  const isAdmin      = ['super_admin','admin','principal'].includes(user?.role);
  const isTeacher    = ['teacher','class_teacher'].includes(user?.role);
  const isStaff      = !['student','parent'].includes(user?.role) && !!user;
  const isParent     = user?.role === 'parent';
  const isStudent    = user?.role === 'student';

  const contextValue = useMemo(() => ({
    user, loading, login, logout, isAdmin, isTeacher, isStaff, isParent, isStudent
  }), [user, loading, login, logout, isAdmin, isTeacher, isStaff, isParent, isStudent]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
