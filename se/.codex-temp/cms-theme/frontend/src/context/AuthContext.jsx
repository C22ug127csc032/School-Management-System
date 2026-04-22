import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session on page refresh ──────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me')
        .then(r => {
          setUser(r.data.user);
          localStorage.setItem('userRole', r.data.user.role);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          delete api.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ── Complete login — store token and set user ─────────────────────────────
  const completeLogin = ({ token, user: nextUser }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', nextUser.role);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(nextUser);
    return nextUser;
  };

  // ── Password login ────────────────────────────────────────────────────────
  const login = async (identifier, password) => {
    const r = await api.post('/auth/login', { identifier, password });
    return r.data;
  };

  // ── Set first password — student sets password on first login ─────────────
  const setFirstPassword = async (newPassword, confirmPassword) => {
    const r = await api.put('/auth/set-password', {
      newPassword,
      confirmPassword,
    });
    // Update user in state — isFirstLogin is now false
    setUser(prev => ({ ...prev, isFirstLogin: false }));
    return r.data;
  };

  // ── Change password — for logged in users ─────────────────────────────────
  const changePassword = async (oldPassword, newPassword) => {
    const r = await api.put('/auth/change-password', {
      oldPassword,
      newPassword,
    });
    // Update isFirstLogin in state if it was true
    setUser(prev => ({ ...prev, isFirstLogin: false }));
    return r.data;
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      completeLogin,
      setFirstPassword,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
