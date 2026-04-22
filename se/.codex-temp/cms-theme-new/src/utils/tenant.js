export const INSTITUTION_SLUG_STORAGE_KEY = 'institutionSlug';
export const INSTITUTION_PORTAL_KEY_STORAGE_KEY = 'institutionPortalKey';
export const PLATFORM_ROLE_STORAGE_KEY = 'platformRole';
export const SESSION_STARTED_AT_STORAGE_KEY = 'sessionStartedAt';
export const USER_ROLE_STORAGE_KEY = 'userRole';

const readValue = key =>
  window.sessionStorage.getItem(key)
  || '';

const writeValue = (key, value) => {
  if (!value) {
    window.sessionStorage.removeItem(key);
    return;
  }

  window.sessionStorage.setItem(key, value);
};

export const getStoredInstitutionPortalKey = () =>
  readValue(INSTITUTION_PORTAL_KEY_STORAGE_KEY)
  || readValue(INSTITUTION_SLUG_STORAGE_KEY)
  || '';

export const setStoredInstitutionPortalKey = portalKey => {
  if (!portalKey) {
    writeValue(INSTITUTION_PORTAL_KEY_STORAGE_KEY, '');
    writeValue(INSTITUTION_SLUG_STORAGE_KEY, '');
    return;
  }

  writeValue(INSTITUTION_PORTAL_KEY_STORAGE_KEY, portalKey);
  writeValue(INSTITUTION_SLUG_STORAGE_KEY, portalKey);
};

export const getStoredInstitutionSlug = () =>
  getStoredInstitutionPortalKey();

export const setStoredInstitutionSlug = slug => {
  setStoredInstitutionPortalKey(slug);
};

export const getStoredPlatformRole = () =>
  readValue(PLATFORM_ROLE_STORAGE_KEY) || '';

export const setStoredPlatformRole = role => {
  writeValue(PLATFORM_ROLE_STORAGE_KEY, role);
};

export const getStoredUserRole = () =>
  readValue(USER_ROLE_STORAGE_KEY) || '';

export const setStoredUserRole = role => {
  writeValue(USER_ROLE_STORAGE_KEY, role);
};

export const clearStoredTenantSession = () => {
  writeValue(INSTITUTION_PORTAL_KEY_STORAGE_KEY, '');
  writeValue(INSTITUTION_SLUG_STORAGE_KEY, '');
  writeValue(PLATFORM_ROLE_STORAGE_KEY, '');
  writeValue(SESSION_STARTED_AT_STORAGE_KEY, '');
  writeValue(USER_ROLE_STORAGE_KEY, '');
};

export const getStoredSessionStartedAt = () =>
  readValue(SESSION_STARTED_AT_STORAGE_KEY) || '';

export const setStoredSessionStartedAt = value => {
  writeValue(SESSION_STARTED_AT_STORAGE_KEY, value);
};

export default {
  clearStoredTenantSession,
  getStoredInstitutionPortalKey,
  getStoredInstitutionSlug,
  getStoredPlatformRole,
  getStoredSessionStartedAt,
  getStoredUserRole,
  setStoredInstitutionPortalKey,
  setStoredInstitutionSlug,
  setStoredPlatformRole,
  setStoredSessionStartedAt,
  setStoredUserRole,
};
