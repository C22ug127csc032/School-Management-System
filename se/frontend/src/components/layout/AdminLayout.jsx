import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  FiBarChart2, FiUsers, FiUser, FiBook, FiCalendar, FiClock, FiGrid,
  FiFileText, FiDollarSign, FiTrendingDown, FiBell,
  FiLogOut, FiMenu, FiX, FiChevronRight, FiShield, FiEdit3,
  FiTarget, FiClipboard, FiSettings, FiLayout, FiLayers,
} from 'react-icons/fi';
import { ACCESS, ROLES } from '../../utils/roleAccess.js';
import useAcademicYear from '../../hooks/useAcademicYear.js';

const NAV = [
  { type: 'link', key: 'dash', label: 'Dashboard', icon: FiLayout, to: '/admin', accessKey: 'dashboard' },
  {
    type: 'group', key: 'students', label: 'Students', icon: FiUser,
    children: [
      { to: '/admin/students', label: 'Student Directory', icon: FiUsers, accessKey: 'students_view' },
      { to: '/admin/students/new', label: 'New Admission', icon: FiEdit3, accessKey: 'students_manage' },
      { to: '/admin/attendance', label: 'Attendance', icon: FiClock, accessKey: 'attendance' },
    ],
  },
  {
    type: 'group', key: 'academic', label: 'Academic', icon: FiGrid,
    children: [
      { to: '/admin/classes', label: 'Classes', icon: FiGrid, accessKey: 'classes' },
      { to: '/admin/subjects', label: 'Subjects', icon: FiBook, accessKey: 'subjects' },
      { to: '/admin/teachers', label: 'Teachers', icon: FiUsers, accessKey: 'teachers' },
      { to: '/admin/class-subjects', label: 'Allocated Subjects', icon: FiTarget, accessKey: 'subject_allocation', allowedRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PRINCIPAL] },
    ],
  },
  {
    type: 'group', key: 'timetable', label: 'Timetable', icon: FiClock,
    children: [
      { to: '/admin/timetable', label: 'Master View', icon: FiCalendar, accessKey: 'timetable_manage' },
      { to: '/admin/timetable/teacher', label: 'My Schedule', icon: FiClock, accessKey: 'timetable_view', allowedRoles: [ROLES.TEACHER, ROLES.CLASS_TEACHER] },
      { to: '/admin/timetable/periods', label: 'Periods', icon: FiGrid, accessKey: 'timetable_manage' },
      { to: '/admin/timetable/workload', label: 'My Workload', icon: FiBarChart2, accessKey: 'timetable_view', allowedRoles: [ROLES.TEACHER, ROLES.CLASS_TEACHER] },
      { to: '/admin/substitutions', label: 'Substitutions', icon: FiTrendingDown, accessKey: 'substitutions' },
    ],
  },
  {
    type: 'group', key: 'exams', label: 'Assessments', icon: FiClipboard,
    children: [
      { to: '/admin/exam-schedule', label: 'Exam Schedule', icon: FiCalendar, accessKey: 'exams' },
      { to: '/admin/exams', label: 'Exam Marks', icon: FiClipboard, accessKey: 'exams' },
      { to: '/admin/report-cards', label: 'Report Cards', icon: FiFileText, accessKey: 'report_cards' },
      { to: '/admin/homework', label: 'Homework', icon: FiBook, accessKey: 'homework' },
    ],
  },
  {
    type: 'group', key: 'accounts', label: 'Finance', icon: FiDollarSign,
    children: [
      { to: '/admin/fees/structures', label: 'Fee Structures', icon: FiGrid, accessKey: 'fees_structure' },
      { to: '/admin/fees/assign', label: 'Assign Fees', icon: FiEdit3, accessKey: 'fees_assign' },
      { to: '/admin/fees/list', label: 'Fees Collection', icon: FiDollarSign, accessKey: 'fees_list' },
      { to: '/admin/expenses', label: 'Expenses', icon: FiTrendingDown, accessKey: 'expenses' },
    ],
  },
  {
    type: 'group', key: 'ops', label: 'Operations', icon: FiSettings,
    children: [
      { to: '/admin/library', label: 'Library', icon: FiBook, accessKey: 'library' },
      { to: '/admin/circulars', label: 'Circulars', icon: FiBell, accessKey: 'circulars' },
      { to: '/admin/leave', label: 'Leave Requests', icon: FiCalendar, accessKey: 'leave' },
    ],
  },
  {
    type: 'group', key: 'admin', label: 'Administration', icon: FiShield,
    children: [
      { to: '/admin/staff', label: 'Staff Management', icon: FiShield, accessKey: 'staff' },
      { to: '/admin/settings', label: 'Settings', icon: FiSettings, accessKey: 'settings' },
      { to: '/admin/reports', label: 'Reports', icon: FiBarChart2, accessKey: 'reports' },
    ],
  },
];

function canAccess(userRole, item) {
  if (item.accessKey) return (ACCESS[item.accessKey] || []).includes(userRole);
  return !item.allowedRoles || item.allowedRoles.includes(userRole);
}

function matchPath(pathname, to) {
  if (to === '/admin') return pathname === '/admin';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function derivePageMeta(pathname, role) {
  for (const entry of NAV) {
    if (!canAccess(role, entry)) continue;
    if (entry.type === 'link' && matchPath(pathname, entry.to)) {
      return {
        title: role === ROLES.SUPER_ADMIN && entry.to === '/admin' ? 'Control Center' : entry.label,
        subtitle: role === ROLES.SUPER_ADMIN ? 'Platform oversight, access governance, and school operations' : 'Overview and operational insights',
        section: 'Workspace',
      };
    }
    if (entry.type === 'group') {
      const child = entry.children?.find(item => canAccess(role, item) && matchPath(pathname, item.to));
      if (child) {
        return {
          title: child.label,
          subtitle: role === ROLES.SUPER_ADMIN
            ? `Control ${child.label.toLowerCase()} across the platform and school workspace`
            : `Manage ${child.label.toLowerCase()} for your school operations`,
          section: entry.label,
        };
      }
    }
  }

  return {
    title: role === ROLES.SUPER_ADMIN ? 'Platform Control' : 'Administration',
    subtitle: role === ROLES.SUPER_ADMIN
      ? 'Govern platform access, school setup, and operational health from one place'
      : 'Run every part of the school from one place',
    section: 'Workspace',
  };
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const academicYear = useAcademicYear();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    setOpenGroups(current => {
      const next = { ...current };
      NAV.forEach(entry => {
        if (entry.type !== 'group') return;
        const hasActiveChild = entry.children?.some(child => matchPath(location.pathname, child.to));
        if (!(entry.key in next) || hasActiveChild) {
          next[entry.key] = hasActiveChild || Boolean(next[entry.key]);
        }
      });
      return next;
    });
  }, [location.pathname]);

  const pageMeta = useMemo(() => derivePageMeta(location.pathname, user?.role), [location.pathname, user?.role]);
  const isDashboardPage = location.pathname === '/admin';
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const portalLabel = isSuperAdmin ? 'Super Admin Portal' : 'Administration Portal';
  const sidebarCopy = isSuperAdmin ? 'Platform Control Center' : 'Administration Panel';

  const navGroups = useMemo(() => {
    return NAV.map(entry => {
      if (!canAccess(user?.role, entry)) return null;
      const label = (() => {
        if (!isSuperAdmin) return entry.label;
        if (entry.key === 'dash') return 'Control Center';
        if (entry.key === 'admin') return 'Platform';
        return entry.label;
      })();
      if (entry.type === 'group') {
        const visibleChildren = entry.children.filter(child => canAccess(user?.role, child));
        if (!visibleChildren.length) return null;
        return {
          ...entry,
          label,
          children: visibleChildren.map(child => {
            if (!isSuperAdmin) return child;
            if (child.to === '/admin/staff') return { ...child, label: 'Access & Staff' };
            if (child.to === '/admin/settings') return { ...child, label: 'School Setup' };
            if (child.to === '/admin/reports') return { ...child, label: 'Compliance View' };
            return child;
          }),
        };
      }
      return { ...entry, label };
    }).filter(Boolean);
  }, [isSuperAdmin, user?.role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderLink = (item, nested = false) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/admin'}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) => [
        nested ? 'portal-nav-sublink' : 'portal-nav-link',
        isActive ? (nested ? 'portal-nav-sublink-active' : 'portal-nav-link-active') : '',
      ].join(' ')}
    >
      <item.icon className="shrink-0 text-base" />
      <span className="portal-expand-label truncate">{item.label}</span>
    </NavLink>
  );

  const renderSidebar = () => (
    <div className="portal-sidebar">
      <div className="portal-sidebar-brand">
        <div className="portal-collapse-row">
          <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-white/10 text-lg font-bold text-white">
            <FiLayers />
          </div>
          <div className="portal-expand-copy min-w-0">
            <p className="truncate text-sm font-semibold text-white">School ERP</p>
            <p className="portal-sidebar-copy">{sidebarCopy}</p>
          </div>
        </div>
      </div>

      <div className="portal-nav-section-label portal-expand-copy">Navigation</div>
      <nav className="portal-sidebar-scroll flex-1 overflow-y-auto px-0 py-3">
        <div className="space-y-1">
          {navGroups.map(entry => {
            if (entry.type === 'link') return renderLink(entry);

            const isOpen = Boolean(openGroups[entry.key]);
            const isActive = entry.children.some(child => matchPath(location.pathname, child.to));

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
                  <span className="flex min-w-0 items-center gap-0">
                    <entry.icon className="shrink-0 text-base" />
                    <span className="portal-expand-label truncate">{entry.label}</span>
                  </span>
                  <FiChevronRight className={`portal-expand-chevron shrink-0 text-sm transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen ? (
                  <div className="portal-nav-group-children space-y-1 py-1">
                    {entry.children.map(child => renderLink(child, true))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <button type="button" onClick={handleLogout} className="portal-logout-button w-full" title="Logout">
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700">{portalLabel}</p>
            <h1 className="truncate text-base font-semibold text-text-primary">{pageMeta.title}</h1>
            <p className="hidden text-xs text-text-secondary sm:block">{pageMeta.subtitle}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="portal-role-chip hidden sm:inline-flex">{user?.role?.replace(/_/g, ' ') || 'Staff'}</span>
            <div className="hidden text-right lg:block">
              <p className="text-sm font-semibold text-text-primary">{user?.name}</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">Academic Year {academicYear}</p>
            </div>
            {isDashboardPage ? (
              <div className="portal-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'S'}</div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="float-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
