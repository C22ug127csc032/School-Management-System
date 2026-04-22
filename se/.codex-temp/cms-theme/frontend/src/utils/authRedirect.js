export const LEGACY_SHOP_CANTEEN_ADMIN_ROLE = 'shop_operator_admin';
export const SHOP_CANTEEN_ADMIN_ROLE = 'shop_canteen_operator_admin';
export const SHOP_CANTEEN_ADMIN_ROLES = [SHOP_CANTEEN_ADMIN_ROLE, LEGACY_SHOP_CANTEEN_ADMIN_ROLE];

export const normalizePortalRole = role =>
  role === LEGACY_SHOP_CANTEEN_ADMIN_ROLE ? SHOP_CANTEEN_ADMIN_ROLE : role;

export const isShopCanteenAdminRole = role =>
  SHOP_CANTEEN_ADMIN_ROLES.includes(role);

export const OPERATOR_ROLES = ['shop_operator', 'canteen_operator', ...SHOP_CANTEEN_ADMIN_ROLES];

export const getHomePathForRole = role => {
  const normalizedRole = normalizePortalRole(role);
  if (role === 'student') return '/student';
  if (role === 'parent') return '/parent';
  if (normalizedRole === 'shop_operator') return '/operator/shop';
  if (normalizedRole === 'canteen_operator') return '/operator/canteen';
  if (normalizedRole === SHOP_CANTEEN_ADMIN_ROLE) return '/operator/dashboard';
  if (normalizedRole === 'librarian') return '/admin/library/dashboard';
  if (normalizedRole === 'accountant') return '/admin';
  if (normalizedRole === 'admission_staff') return '/admin';
  return '/admin';
};

export const getLoginPathForRole = role => {
  const normalizedRole = normalizePortalRole(role);
  if (!normalizedRole) return '/login';
  if (normalizedRole === 'student') return '/login';
  if (normalizedRole === 'parent') return '/parent/login';
  if (OPERATOR_ROLES.includes(normalizedRole)) return '/operator/login';
  return '/admin/login';
};
