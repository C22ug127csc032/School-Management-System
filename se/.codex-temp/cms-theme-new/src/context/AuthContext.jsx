import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  clearStoredTenantSession,
  getStoredSessionStartedAt,
  setStoredInstitutionPortalKey,
  setStoredPlatformRole,
  setStoredSessionStartedAt,
  setStoredUserRole,
} from '../utils/tenant';

const AuthContext = createContext(null);

const hydrateUser = (nextUser, institution) => ({
  ...nextUser,
  institutionSlug: institution?.slug || nextUser?.institutionSlug || null,
  institutionPortalKey: institution?.portalKey || nextUser?.institutionPortalKey || institution?.slug || nextUser?.institutionSlug || null,
  institutionName: institution?.name || nextUser?.institutionName || null,
  platformRole: nextUser?.platformRole || null,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(response => {
        const nextUser = hydrateUser(response.data.user, response.data.institution);
        setUser(nextUser);
        setStoredUserRole(nextUser.role || '');
        setStoredInstitutionPortalKey(nextUser.institutionPortalKey || nextUser.institutionSlug || '');
        setStoredPlatformRole(nextUser.platformRole || '');
        if (!getStoredSessionStartedAt()) {
          setStoredSessionStartedAt(new Date().toISOString());
        }
      })
      .catch(() => {
        clearStoredTenantSession();
      })
      .finally(() => setLoading(false));
  }, []);

  const completeLogin = data => {
    const nextUser = hydrateUser(data.user, data.institution);
    setStoredUserRole(nextUser.role || '');
    setStoredInstitutionPortalKey(nextUser.institutionPortalKey || nextUser.institutionSlug || '');
    setStoredPlatformRole(nextUser.platformRole || '');
    setStoredSessionStartedAt(new Date().toISOString());
    setUser(nextUser);
    return nextUser;
  };

  const login = async (identifier, password, options = {}) => {
    const { slug = '', portalKey = '', platform = false } = options;
    const endpoint = platform ? '/auth/platform/login' : '/auth/login';
    const response = await api.post(endpoint, {
      identifier,
      password,
      slug,
      portalKey,
      role: platform ? 'ematix_master_admin' : undefined,
    });
    return response.data;
  };

  const setFirstPassword = async (newPassword, confirmPassword) => {
    const response = await api.put('/auth/set-password', {
      newPassword,
      confirmPassword,
    });
    setUser(previous => ({ ...previous, isFirstLogin: false }));
    return response.data;
  };

  const changePassword = async (oldPassword, newPassword) => {
    const response = await api.put('/auth/change-password', {
      oldPassword,
      newPassword,
    });
    setUser(previous => ({ ...previous, isFirstLogin: false }));
    return response.data;
  };

  const logout = async ({ preserveTenantSession = false } = {}) => {
    const sessionStartedAt = getStoredSessionStartedAt();

    try {
      await api.post('/auth/logout', {
        sessionStartedAt,
        sessionEndedAt: new Date().toISOString(),
      });
    } catch {
      // Logout must continue even when audit logging fails.
    }

    setStoredUserRole('');
    setStoredSessionStartedAt('');
    if (preserveTenantSession) {
      setStoredPlatformRole('');
    } else {
      clearStoredTenantSession();
    }
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
    }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
