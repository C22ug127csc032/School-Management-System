import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import BrandAvatar from '../common/BrandAvatar';
import { buildScopedTenantPath, getHomePathForRole, getLoginPathForRole } from '../../utils/authRedirect';
import { getPortalBranding } from '../../utils/branding';
import SubscriptionBanner from '../common/SubscriptionBanner';
import {
  FiBook,
  FiCalendar,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiLogOut,
  FiMenu,
  FiUser,
  FiX,
} from '../common/icons';

const NAV = [
  { to: '/parent', label: 'Dashboard', icon: FiHome, exact: true, featureKey: 'parent_portal' },
  { to: '/parent/student', label: 'My Child', icon: FiUser, featureKey: 'parent_portal' },
  { to: '/parent/fees', label: 'Fees', icon: FiCreditCard, featureKey: 'finance' },
  { to: '/parent/payments', label: 'Payments', icon: FiCreditCard, featureKey: 'finance' },
  { to: '/parent/ledger', label: 'Ledger', icon: FiBook, featureKey: 'ledger' },
  { to: '/parent/wallet', label: 'Wallet', icon: FiDollarSign, featureKey: 'wallet' },
  { to: '/parent/leave', label: 'Leave', icon: FiCalendar, featureKey: 'hostel_leave' },
  { to: '/parent/outpass', label: 'Outpass', icon: FiLogOut, featureKey: 'hostel_leave' },
  { to: '/parent/checkin', label: 'Check-In History', icon: FiClock, featureKey: 'hostel_checkin' },
  { to: '/parent/circulars', label: 'Circulars', icon: FiFileText, featureKey: 'circulars_notifications' },
];

const matchesPath = (pathname, item) => {
  if (item.exact) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
};

export default function ParentLayout() {
  const { user, logout } = useAuth();
  const { hasFeature, institution, subscription } = useAppSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scopedPortalKey = user?.institutionPortalKey || user?.institutionSlug || institution?.portalKey || institution?.slug || '';
  const visibleNav = NAV
    .filter(item => !item.featureKey || hasFeature(item.featureKey))
    .map(item => ({
      ...item,
      to: buildScopedTenantPath(item.to, scopedPortalKey),
    }));

  const activeItem = useMemo(
    () => visibleNav.find(item => matchesPath(location.pathname, item)) || visibleNav[0],
    [location.pathname, visibleNav]
  );
  const brandTitle = institution?.branding?.portalTitle || institution?.branding?.institutionName || institution?.name || 'Parent Portal';
  const brandIdentity = getPortalBranding({ institution, subscription });

  const handleLogout = async () => {
    const loginPath = getLoginPathForRole(
      user?.role,
      user?.institutionPortalKey || user?.institutionSlug || institution?.portalKey || institution?.slug || ''
    );
    await logout({ preserveTenantSession: true });
    navigate(loginPath);
  };

  const sidebar = (
    <div className="portal-sidebar">
      <div className="portal-sidebar-brand">
        <button type="button" onClick={() => navigate(getHomePathForRole(user?.role, user?.institutionPortalKey || user?.institutionSlug || institution?.portalKey || institution?.slug || ''))} className="portal-collapse-row select-none text-left">
          <BrandAvatar
            src={brandIdentity.iconSrc}
            alt={brandTitle}
            fallback={brandIdentity.initial}
            circularImage={Boolean(brandIdentity.usesEmatixBrand)}
            className="flex h-11 w-11 items-center justify-center overflow-hidden border border-white/10 bg-white/10 text-lg font-bold text-white"
            imageClassName="h-full w-full object-contain p-1.5"
          />
          <div className="portal-expand-copy min-w-0">
            <p className="truncate text-sm font-semibold text-white">{brandTitle}</p>
            <p className="portal-sidebar-copy">Family Access Desk</p>
          </div>
        </button>
      </div>

      <div className="portal-nav-section-label portal-expand-copy">Menu</div>
      <nav className="portal-sidebar-scroll flex-1 overflow-y-auto py-3">
        <div className="space-y-1">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => ['portal-nav-link', isActive ? 'portal-nav-link-active' : ''].join(' ')}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="shrink-0 text-base" />
              <span className="portal-expand-label truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="portal-logout-button w-full"
          title="Logout"
        >
          <FiLogOut className="shrink-0 text-base" />
          <span className="portal-expand-label text-sm font-semibold">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {mobileOpen ? (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/55 xl:hidden"
          aria-label="Close menu"
        />
      ) : null}

      <aside className="portal-desktop-sidebar group/sidebar hidden h-screen shrink-0 xl:block">
        {sidebar}
      </aside>

      <aside className={`fixed inset-y-0 left-0 z-40 h-screen w-72 bg-sidebar transition-transform duration-200 xl:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center border border-white/10 bg-white/10 text-white"
          aria-label="Close menu"
        >
          <FiX />
        </button>
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="portal-topbar mx-3 mt-3 flex items-center gap-3 px-4 py-3 sm:mx-4 md:mx-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center border border-border bg-white text-text-secondary transition-colors hover:border-primary-700 hover:text-primary-700 xl:hidden"
          >
            <FiMenu />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700">Parent Portal</p>
            <h1 className="truncate text-base font-semibold text-text-primary">{activeItem.label}</h1>
            <p className="hidden text-xs text-text-secondary sm:block">Family dashboard and student service access</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="portal-role-chip hidden sm:inline-flex">Parent</span>
            <div className="hidden text-right lg:block">
              <p className="text-sm font-semibold text-text-primary">{user?.name}</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Family Access</p>
            </div>
          </div>
        </header>

        <SubscriptionBanner />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
