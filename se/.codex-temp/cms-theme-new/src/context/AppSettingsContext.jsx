import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { applyDocumentBranding, getPortalBranding } from '../utils/branding';

const AppSettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  masters: {},
  capabilities: {},
  preferences: {},
  roles: [],
  subscription: null,
  institution: null,
};

const normalizeRoleValue = value => String(value || '').trim().toLowerCase();
const APP_SETTINGS_SYNC_KEY = 'appSettingsSyncVersion';
const LEGACY_BRANDING_THEME = {
  primary: '#122539',
  secondary: '#1A3550',
  tertiary: '#D91F26',
};
const DEFAULT_BRANDING_THEME = {
  primary: '#2D56C5',
  secondary: '#233C78',
  tertiary: '#7B96F9',
};

const clampColorChannel = value => Math.max(0, Math.min(255, Math.round(value)));

const normalizeHexColor = (value, fallback) => {
  const text = String(value || '').trim();
  const normalized = /^#([0-9a-f]{6})$/i.test(text) ? text.toUpperCase() : fallback;
  return normalized;
};

const resolveThemeColor = (value, legacyDefault, nextDefault) => {
  const normalizedValue = normalizeHexColor(value, nextDefault);
  return normalizedValue === legacyDefault ? nextDefault : normalizedValue;
};

const hexToRgb = hex => {
  const normalized = normalizeHexColor(hex, DEFAULT_BRANDING_THEME.primary).replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b].map(channel => clampColorChannel(channel).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

const mixHexColors = (baseHex, mixHex, weight = 0.5) => {
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHex);
  return rgbToHex({
    r: base.r + ((mix.r - base.r) * weight),
    g: base.g + ((mix.g - base.g) * weight),
    b: base.b + ((mix.b - base.b) * weight),
  });
};

const darkenHex = (hex, amount = 0.18) => {
  const rgb = hexToRgb(hex);
  return rgbToHex({
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount),
  });
};

export const AppSettingsProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const settingsRef = useRef(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    const branding = settings?.institution?.branding || settings?.subscription?.institution?.branding || {};
    const primary = resolveThemeColor(branding.primaryColor, LEGACY_BRANDING_THEME.primary, DEFAULT_BRANDING_THEME.primary);
    const secondary = resolveThemeColor(branding.secondaryColor, LEGACY_BRANDING_THEME.secondary, DEFAULT_BRANDING_THEME.secondary);
    const tertiary = resolveThemeColor(branding.tertiaryColor, LEGACY_BRANDING_THEME.tertiary, DEFAULT_BRANDING_THEME.tertiary);

    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-primary-dark', darkenHex(primary, 0.16));
    root.style.setProperty('--brand-primary-soft', mixHexColors(primary, '#FFFFFF', 0.88));
    root.style.setProperty('--brand-primary-soft-border', mixHexColors(primary, '#FFFFFF', 0.72));
    root.style.setProperty('--brand-secondary', secondary);
    root.style.setProperty('--brand-tertiary', tertiary);
    root.style.setProperty('--brand-tertiary-dark', darkenHex(tertiary, 0.14));
    root.style.setProperty('--brand-tertiary-soft', mixHexColors(tertiary, '#FFFFFF', 0.9));
    root.style.setProperty('--brand-tertiary-soft-border', mixHexColors(tertiary, '#FFFFFF', 0.76));
    root.style.setProperty('--brand-sidebar-start', mixHexColors(primary, secondary, 0.18));
    root.style.setProperty('--brand-sidebar-end', secondary);
    root.style.setProperty('--brand-sidebar-active', mixHexColors(tertiary, '#FFFFFF', 0.7));

    return () => {
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-primary-dark');
      root.style.removeProperty('--brand-primary-soft');
      root.style.removeProperty('--brand-primary-soft-border');
      root.style.removeProperty('--brand-secondary');
      root.style.removeProperty('--brand-tertiary');
      root.style.removeProperty('--brand-tertiary-dark');
      root.style.removeProperty('--brand-tertiary-soft');
      root.style.removeProperty('--brand-tertiary-soft-border');
      root.style.removeProperty('--brand-sidebar-start');
      root.style.removeProperty('--brand-sidebar-end');
      root.style.removeProperty('--brand-sidebar-active');
    };
  }, [settings?.institution, settings?.subscription]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const branding = getPortalBranding({
      institution: settings?.institution || settings?.subscription?.institution || null,
      subscription: settings?.subscription || null,
      platform: user?.platformRole === 'ematix_master_admin',
    });

    applyDocumentBranding({
      title: branding?.usesEmatixBrand
        ? 'Ematix'
        : (branding?.title || 'Institution Portal'),
      iconSrc: branding?.iconSrc || '',
      initial: branding?.initial || 'C',
      primaryColor: resolveThemeColor(
        settings?.institution?.branding?.primaryColor || settings?.subscription?.institution?.branding?.primaryColor,
        LEGACY_BRANDING_THEME.primary,
        DEFAULT_BRANDING_THEME.primary
      ),
    });
  }, [settings?.institution, settings?.subscription, user]);

  const refreshSettings = useCallback(async ({ silent = false } = {}) => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return DEFAULT_SETTINGS;
    }

    if (user.platformRole === 'ematix_master_admin') {
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
      return settingsRef.current;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refreshSettings();
  }, [authLoading, refreshSettings, user?._id, user?.role]);

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

    const intervalId = window.setInterval(syncSettings, 10000);

    return () => {
      window.removeEventListener('focus', syncSettings);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('app-settings-updated', syncSettings);
      window.clearInterval(intervalId);
    };
  }, [authLoading, refreshSettings, user]);

  const value = useMemo(() => {
    const subscription = settings.subscription || null;
    const enabledModules = subscription?.enabledModules || [];
    const featureFlags = subscription?.featureFlags || {};
    const roleDefinitions = settings.roles || [];

    const can = (capabilityKey, fallbackRoles = []) => {
      if (!user) return false;
      if (user.platformRole === 'ematix_master_admin') return true;

      const capabilityMap = settings.capabilities || {};
      const hasSavedCapability = Object.prototype.hasOwnProperty.call(capabilityMap, capabilityKey);
      const roleList = hasSavedCapability
        ? (Array.isArray(capabilityMap[capabilityKey]) ? capabilityMap[capabilityKey] : [])
        : fallbackRoles;

      return roleList
        .map(normalizeRoleValue)
        .includes(normalizeRoleValue(user.role));
    };

    return {
      settings,
      loading,
      refreshSettings,
      roleDefinitions,
      subscription,
      institution: settings.institution || subscription?.institution || null,
      isReadOnly: Boolean(subscription?.readOnly),
      getMasterOptions: (groupKey, fallbackOptions = []) => {
        const options = settings.masters?.[groupKey];
        return Array.isArray(options) && options.length ? options : fallbackOptions;
      },
      getPreference: (preferenceKey, fallbackValue = null) => {
        if (Object.prototype.hasOwnProperty.call(settings.preferences || {}, preferenceKey)) {
          return settings.preferences[preferenceKey];
        }
        return fallbackValue;
      },
      can,
      hasFeature: featureKey => {
        if (!featureKey) return true;
        if (user?.platformRole === 'ematix_master_admin') return true;
        if (Object.prototype.hasOwnProperty.call(featureFlags, featureKey)) {
          return Boolean(featureFlags[featureKey]);
        }
        return enabledModules.includes(featureKey);
      },
      usageFor: key => subscription?.usage?.[key] ?? 0,
      limitFor: key => subscription?.limits?.[key] ?? null,
      isSettingsManager: user
        ? (
            Object.prototype.hasOwnProperty.call(settings.capabilities || {}, 'admin_settings_manage')
              ? (Array.isArray(settings.capabilities?.admin_settings_manage)
                  ? settings.capabilities.admin_settings_manage
                  : [])
              : ['institution_owner', 'super_admin', 'admin']
          )
            .map(normalizeRoleValue)
            .includes(normalizeRoleValue(user.role))
        : false,
    };
  }, [loading, settings, user]);

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => useContext(AppSettingsContext);
