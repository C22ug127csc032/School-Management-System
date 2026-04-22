import { getStoredInstitutionPortalKey, getStoredPlatformRole } from './tenant';

export const LEGACY_SHOP_CANTEEN_ADMIN_ROLE = 'shop_operator_admin';
export const SHOP_CANTEEN_ADMIN_ROLE = 'shop_canteen_operator_admin';
export const SHOP_CANTEEN_ADMIN_ROLES = [SHOP_CANTEEN_ADMIN_ROLE, LEGACY_SHOP_CANTEEN_ADMIN_ROLE];

export const normalizePortalRole = role =>
  role === LEGACY_SHOP_CANTEEN_ADMIN_ROLE ? SHOP_CANTEEN_ADMIN_ROLE : role;

export const isShopCanteenAdminRole = role =>
  SHOP_CANTEEN_ADMIN_ROLES.includes(role);

export const OPERATOR_ROLES = ['shop_operator', 'canteen_operator', ...SHOP_CANTEEN_ADMIN_ROLES];

export const buildScopedLoginPath = (portal, portalKey) => {
  if (!portalKey) {
    if (portal === 'student') return '/login';
    return `/${portal}/login`;
  }

  if (portal === 'student') return `/${portalKey}/student/login`;
  return `/${portalKey}/${portal}/login`;
};

export const buildScopedTenantPath = (path, portalKey = getStoredInstitutionPortalKey()) => {
  const normalizedPortalKey = String(portalKey || '').trim().toLowerCase();
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`;
  return normalizedPortalKey ? `/${normalizedPortalKey}${normalizedPath}` : normalizedPath;
};

export const getPlanPath = (portalKey = getStoredInstitutionPortalKey()) =>
  buildScopedTenantPath('/plan', portalKey);

export const getUpgradePath = (portalKey = getStoredInstitutionPortalKey()) =>
  buildScopedTenantPath('/upgrade', portalKey);

export const getHomePathForRole = (role, institutionPortalKey = getStoredInstitutionPortalKey(), platformRole = getStoredPlatformRole()) => {
  const normalizedRole = normalizePortalRole(role);
  if (platformRole === 'ematix_master_admin' || normalizedRole === 'ematix_master_admin') return '/ematix';
  if (normalizedRole === 'student') return buildScopedTenantPath('/student', institutionPortalKey);
  if (normalizedRole === 'parent') return buildScopedTenantPath('/parent', institutionPortalKey);
  if (normalizedRole === 'shop_operator') return buildScopedTenantPath('/operator/shop', institutionPortalKey);
  if (normalizedRole === 'canteen_operator') return buildScopedTenantPath('/operator/canteen', institutionPortalKey);
  if (normalizedRole === SHOP_CANTEEN_ADMIN_ROLE) return buildScopedTenantPath('/operator/dashboard', institutionPortalKey);
  if (normalizedRole === 'librarian') return buildScopedTenantPath('/admin/library/dashboard', institutionPortalKey);
  if (normalizedRole === 'accountant') return buildScopedTenantPath('/admin', institutionPortalKey);
  if (normalizedRole === 'admission_staff') return buildScopedTenantPath('/admin', institutionPortalKey);
  return buildScopedTenantPath('/admin', institutionPortalKey);
};

export const getLoginPathForRole = (role, institutionPortalKey = getStoredInstitutionPortalKey(), platformRole = getStoredPlatformRole()) => {
  const normalizedRole = normalizePortalRole(role);

  if (platformRole === 'ematix_master_admin' || normalizedRole === 'ematix_master_admin') {
    return '/ematix/login';
  }

  if (!normalizedRole) return '/login';
  if (normalizedRole === 'student') return buildScopedLoginPath('student', institutionPortalKey);
  if (normalizedRole === 'parent') return buildScopedLoginPath('parent', institutionPortalKey);
  if (OPERATOR_ROLES.includes(normalizedRole)) return buildScopedLoginPath('operator', institutionPortalKey);
  return buildScopedLoginPath('admin', institutionPortalKey);
};
