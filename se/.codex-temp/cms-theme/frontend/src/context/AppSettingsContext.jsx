import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const AppSettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  masters: {},
  capabilities: {},
  roles: [],
};

const normalizeRoleValue = value => String(value || '').trim().toLowerCase();
const APP_SETTINGS_SYNC_KEY = 'appSettingsSyncVersion';

export const AppSettingsProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async ({ silent = false } = {}) => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return DEFAULT_SETTINGS;
    }

    if (!silent) {
      setLoading(true);
    }
    try {
      const response = await api.get('/settings', {
        params: { _ts: Date.now() },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      const nextSettings = response.data?.settings || DEFAULT_SETTINGS;
      setSettings(nextSettings);
      return nextSettings;
    } catch {
      if (!silent) {
        setSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
      return settings;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [settings, user]);

  useEffect(() => {
    if (authLoading) return;
    refreshSettings();
  }, [authLoading, user?._id, user?.role]);

  useEffect(() => {
    if (authLoading || !user) return undefined;

    const syncSettings = () => {
      refreshSettings({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncSettings();
      }
    };

    const handleStorage = event => {
      if (event.key === APP_SETTINGS_SYNC_KEY) {
        syncSettings();
      }
    };

    window.addEventListener('focus', syncSettings);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('app-settings-updated', syncSettings);

    const intervalId = window.setInterval(syncSettings, 30000);

    return () => {
      window.removeEventListener('focus', syncSettings);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-settings-updated', syncSettings);
      window.clearInterval(intervalId);
    };
  }, [authLoading, refreshSettings, user]);

  const value = useMemo(() => ({
    settings,
    loading,
    refreshSettings,
    roleDefinitions: settings.roles || [],
    getMasterOptions: (groupKey, fallbackOptions = []) => {
      const options = settings.masters?.[groupKey];
      return Array.isArray(options) && options.length ? options : fallbackOptions;
    },
    can: (capabilityKey, fallbackRoles = []) => {
      if (!user) return false;
      const capabilityMap = settings.capabilities || {};
      const hasSavedCapability = Object.prototype.hasOwnProperty.call(capabilityMap, capabilityKey);
      const roleList = hasSavedCapability
        ? (Array.isArray(capabilityMap[capabilityKey]) ? capabilityMap[capabilityKey] : [])
        : fallbackRoles;

      return roleList
        .map(normalizeRoleValue)
        .includes(normalizeRoleValue(user.role));
    },
    isSettingsManager: user
      ? (
          Object.prototype.hasOwnProperty.call(settings.capabilities || {}, 'admin_settings_manage')
            ? (Array.isArray(settings.capabilities?.admin_settings_manage)
                ? settings.capabilities.admin_settings_manage
                : [])
            : ['super_admin', 'admin']
        )
          .map(normalizeRoleValue)
          .includes(normalizeRoleValue(user.role))
      : false,
  }), [settings, loading, user]);

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => useContext(AppSettingsContext);
