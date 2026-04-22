import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import BrandAvatar from '../common/BrandAvatar';
import { buildScopedTenantPath, getLoginPathForRole } from '../../utils/authRedirect';
import { getPortalBranding } from '../../utils/branding';
import NotificationBell from '../common/NotificationBell';
import SubscriptionBanner from '../common/SubscriptionBanner';
import {
  FiBarChart2,
  FiBell,
  FiBook,
  FiCalendar,
  FiChevronRight,
  FiClipboard,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiEdit3,
  FiFileText,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiTarget,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiX,
} from '../common/icons';

const NAV_ENTRIES = [
  {
    type: 'link',
    key: 'dashboard',
    label: 'Dashboard',
    icon: FiBarChart2,
    capability: 'admin_dashboard',
    featureKey: 'student_management',
    exact: true,
  },
  {
    type: 'group',
    key: 'students',
    label: 'Students',
    icon: FiUsers,
    capabilities: ['admin_students_view', 'admin_courses_manage'],
    featureKey: 'student_management',
    children: [
      {
        to: '/admin/students',
        label: 'Students',
        icon: FiUser,
        capability: 'admin_students_view',
        featureKey: 'student_management',
      },
      {
        to: '/admin/courses',
        label: 'Courses',
        icon: FiTarget,
        capability: 'admin_courses_manage',
        featureKey: 'academic',
      },
    ],
  },
  {
    type: 'group',
    key: 'fees',
    label: 'Fees & Payments',
    icon: FiCreditCard,
    capabilities: ['admin_fee_structure_manage', 'admin_fee_assign', 'admin_fees_list_view', 'admin_payments_view'],
    featureKey: 'finance',
    children: [
      {
        to: '/admin/fees/structure',
        label: 'Fee Structure',
        icon: FiClipboard,
        capability: 'admin_fee_structure_manage',
        featureKey: 'finance',
      },
      {
        to: '/admin/fees/assign',
        label: 'Assign Fees',
        icon: FiEdit3,
        capability: 'admin_fee_assign',
        featureKey: 'finance',
      },
      {
        to: '/admin/fees/list',
        label: 'Fees List',
        icon: FiDollarSign,
        capability: 'admin_fees_list_view',
        featureKey: 'finance',
      },
      {
        to: '/admin/payments',
        label: 'Payments',
        icon: FiCreditCard,
        capability: 'admin_payments_view',
        featureKey: 'finance',
      },
    ],
  },
  {
    type: 'group',
    key: 'hostel',
    label: 'Hostel & Attendance',
    icon: FiCalendar,
    capabilities: ['admin_leave_manage', 'admin_outpass_manage', 'admin_checkin_manage'],
    featureKey: 'hostel_leave',
    children: [
      {
        to: '/admin/leave',
        label: 'Leave',
        icon: FiCalendar,
        capability: 'admin_leave_manage',
        featureKey: 'hostel_leave',
      },
      {
        to: '/admin/outpass',
        label: 'Outpass',
        icon: FiLogOut,
        capability: 'admin_outpass_manage',
        featureKey: 'hostel_leave',
      },
      {
        to: '/admin/checkin',
        label: 'Check In/Out',
        icon: FiClock,
        capability: 'admin_checkin_manage',
        featureKey: 'hostel_checkin',
      },
    ],
  },
  {
    type: 'link',
    key: 'library',
    to: '/admin/library',
    label: 'Library',
    icon: FiBook,
    capability: 'admin_library_manage',
    featureKey: 'library',
    exact: true,
  },
  {
    type: 'group',
    key: 'administration',
    label: 'Administration',
    icon: FiPackage,
    capabilities: ['admin_inventory_manage', 'admin_expense_manage'],
    featureKey: 'inventory',
    children: [
      {
        to: '/admin/inventory',
        label: 'Inventory',
        icon: FiPackage,
        capability: 'admin_inventory_manage',
        featureKey: 'inventory',
      },
      {
        to: '/admin/expense',
        label: 'Expenses',
        icon: FiTrendingDown,
        capability: 'admin_expense_manage',
        featureKey: 'expense',
      },
    ],
  },
  {
    type: 'link',
    key: 'circulars',
    to: '/admin/circulars',
    label: 'Circulars',
    icon: FiFileText,
    capability: 'admin_circular_manage',
    featureKey: 'circulars_notifications',
  },
  {
    type: 'group',
    key: 'settings',
    label: 'Settings & Reports',
    icon: FiTrendingUp,
    capabilities: ['admin_staff_manage', 'admin_reports_view', 'admin_settings_manage'],
    featureKey: 'settings',
    children: [
      {
        to: '/admin/staff',
        label: 'Staff',
        icon: FiUsers,
        capability: 'admin_staff_manage',
        featureKey: 'staff_roles',
      },
      {
        to: '/admin/settings',
        label: 'Settings',
        icon: FiTarget,
        capability: 'admin_settings_manage',
        featureKey: 'settings',
      },
      {
        to: '/admin/reports',
        label: 'Reports',
        icon: FiTrendingUp,
        capability: 'admin_reports_view',
        featureKey: 'reports',
      },
    ],
  },
  {
    type: 'link',
    key: 'notifications',
    to: '/admin/notifications',
    label: 'Notifications',
    icon: FiBell,
    capability: 'admin_notifications_view',
    featureKey: 'circulars_notifications',
  },
];

const roleConfig = {
  institution_owner: { label: 'Institution Owner' },
  super_admin: { label: 'Super Admin' },
  admin: { label: 'Admin' },
  class_teacher: { label: 'Class Advisor' },
  hostel_warden: { label: 'Hostel Warden' },
  librarian: { label: 'Librarian' },
  accountant: { label: 'Accountant' },
  admission_staff: { label: 'Admission Staff' },
};

const getDashboardTarget = (role, portalKey = '') => {
  if (role === 'librarian') return buildScopedTenantPath('/admin/library/dashboard', portalKey);
  if (role === 'hostel_warden') return buildScopedTenantPath('/admin/hostel/dashboard', portalKey);
  if (role === 'class_teacher') return buildScopedTenantPath('/admin/students', portalKey);
  return buildScopedTenantPath('/admin', portalKey);
};

const matchesPath = (pathname, item) => {
  if (!item?.to) return false;
  if (item.exact) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
};

const getActiveNavMeta = (nav, pathname) => {
  for (const entry of nav) {
    if (entry.type === 'group') {
      const child = entry.children.find(option => matchesPath(pathname, option));
      if (child) {
        return {
          title: child.label,
          subtitle: entry.label,
        };
      }
      continue;
    }

    if (matchesPath(pathname, entry)) {
      return {
        title: entry.label,
        subtitle: 'Administration workspace',
      };
    }
  }

  return {
    title: 'Administration',
    subtitle: 'Academic operations workspace',
  };
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { can, hasFeature, institution, subscription } = useAppSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const scopedPortalKey = user?.institutionPortalKey || user?.institutionSlug || institution?.portalKey || institution?.slug || '';

  const filteredNav = useMemo(() => {
    return NAV_ENTRIES.reduce((items, entry) => {
      if (entry.type === 'link') {
        if (entry.featureKey && !hasFeature(entry.featureKey)) return items;
        if (entry.capability && !can(entry.capability, [])) return items;
        items.push(
          entry.key === 'dashboard'
            ? { ...entry, to: getDashboardTarget(user?.role, scopedPortalKey), exact: true }
            : { ...entry, to: buildScopedTenantPath(entry.to, scopedPortalKey) }
        );
        return items;
      }

      const children = (entry.children || []).filter(child => {
        if (child.featureKey && !hasFeature(child.featureKey)) return false;
        return !child.capability || can(child.capability, []);
      }).map(child => ({
        ...child,
        to: buildScopedTenantPath(child.to, scopedPortalKey),
      }));
      if (!children.length) return items;
      items.push({ ...entry, children });
      return items;
    }, []);
  }, [can, hasFeature, scopedPortalKey, user?.role]);

  useEffect(() => {
    setOpenGroups(current => {
      const next = { ...current };
      filteredNav.forEach(entry => {
        if (entry.type !== 'group') return;
        const hasActiveChild = entry.children.some(child => matchesPath(location.pathname, child));
        if (!(entry.key in next) || hasActiveChild) {
          next[entry.key] = hasActiveChild || Boolean(next[entry.key]);
        }
      });
      return next;
    });
  }, [filteredNav, location.pathname]);

  const currentRole = roleConfig[user?.role] || { label: user?.role || 'Staff' };
  const activeMeta = useMemo(() => getActiveNavMeta(filteredNav, location.pathname), [filteredNav, location.pathname]);
  const dashboardTarget = getDashboardTarget(user?.role, scopedPortalKey);
  const brandTitle = institution?.branding?.portalTitle || institution?.branding?.institutionName || institution?.name || 'College CMS';
  const brandIdentity = getPortalBranding({ institution, subscription });

  const handleLogout = async () => {
    const loginPath = getLoginPathForRole(
      user?.role,
      user?.institutionPortalKey || user?.institutionSlug || institution?.portalKey || institution?.slug || ''
    );
    await logout({ preserveTenantSession: true });
    navigate(loginPath);
  };

  const renderNavLink = (item, nested = false) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.exact}
      className={({ isActive }) => [
        nested ? 'portal-nav-sublink' : 'portal-nav-link',
        isActive ? (nested ? 'portal-nav-sublink-active' : 'portal-nav-link-active') : '',
      ].join(' ')}
      onClick={() => setMobileOpen(false)}
    >
      <item.icon className="shrink-0 text-base" />
      <span className="portal-expand-label truncate">{item.label}</span>
    </NavLink>
  );

  const renderSidebar = () => (
    <div className="portal-sidebar">
      <div className="portal-sidebar-brand">
        <button type="button" onClick={() => navigate(dashboardTarget)} className="portal-collapse-row select-none text-left">
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
            <p className="portal-sidebar-copy">Administration Panel</p>
          </div>
        </button>
      </div>

      <div className="portal-nav-section-label portal-expand-copy">Navigation</div>
      <nav className="portal-sidebar-scroll flex-1 overflow-y-auto px-0 py-3">
        <div className="space-y-1">
          {filteredNav.map(entry => {
            if (entry.type === 'link') {
              return renderNavLink(entry);
            }

            const isOpen = Boolean(openGroups[entry.key]);
            const isActive = entry.children.some(child => matchesPath(location.pathname, child));

            return (
              <div key={entry.key}>
                <button
                  type="button"
                  onClick={() => setOpenGroups(current => ({ ...current, [entry.key]: !current[entry.key] }))}
                  className={[
                    'portal-nav-link w-full justify-between',
                    isActive ? 'portal-nav-link-active' : '',
                  ].join(' ')}
                >
                  <span className="flex min-w-0 items-center gap-0 xl:group-hover/sidebar:gap-3">
                    <entry.icon className="shrink-0 text-base" />
                    <span className="portal-expand-label truncate">{entry.label}</span>
                  </span>
                  <FiChevronRight className={`portal-expand-chevron shrink-0 text-sm transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen ? (
                  <div className="portal-nav-group-children space-y-1 py-1">
                    {entry.children.map(child => renderNavLink(child, true))}
                  </div>
                ) : null}
              </div>
            );
          })}
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
        {renderSidebar()}
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
        {renderSidebar()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="portal-topbar mx-3 mt-3 flex flex-wrap items-center gap-3 px-4 py-3 sm:mx-4 md:mx-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center border border-border bg-white text-text-secondary transition-colors hover:border-primary-700 hover:text-primary-700 xl:hidden"
          >
            <FiMenu />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700">Administration Portal</p>
            <h1 className="truncate text-base font-semibold text-text-primary">{activeMeta.title}</h1>
            <p className="hidden text-xs text-text-secondary sm:block">{activeMeta.subtitle}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <span className="portal-role-chip hidden sm:inline-flex">{currentRole.label}</span>
            <div className="hidden text-right lg:block">
              <p className="text-sm font-semibold text-text-primary">{user?.name}</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Campus Administration</p>
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
