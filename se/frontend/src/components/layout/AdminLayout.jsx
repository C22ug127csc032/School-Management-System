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
      return { title: entry.label, subtitle: 'Overview and operational insights', section: 'Workspace' };
    }
    if (entry.type === 'group') {
      const child = entry.children?.find(item => canAccess(role, item) && matchPath(pathname, item.to));
      if (child) {
        return {
          title: child.label,
          subtitle: `Manage ${child.label.toLowerCase()} for your school operations`,
          section: entry.label,
        };
      }
    }
  }

  return { title: 'Administration', subtitle: 'Run every part of the school from one place', section: 'Workspace' };
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const academicYear = useAcademicYear();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);

  useEffect(() => {
    for (const entry of NAV) {
      if (entry.type !== 'group') continue;
      const hasActiveChild = entry.children?.some(child => matchPath(location.pathname, child.to));
      if (hasActiveChild) {
        setOpenGroup(entry.key);
        return;
      }
    }
  }, [location.pathname]);

  const pageMeta = useMemo(() => derivePageMeta(location.pathname, user?.role), [location.pathname, user?.role]);
  const isDashboardPage = location.pathname === '/admin';

  const navGroups = useMemo(() => {
    return NAV.map(entry => {
      if (!canAccess(user?.role, entry)) return null;
      if (entry.type === 'group') {
        const visibleChildren = entry.children.filter(child => canAccess(user?.role, child));
        if (!visibleChildren.length) return null;
        return { ...entry, children: visibleChildren };
      }
      return entry;
    }).filter(Boolean);
  }, [user?.role]);

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
      <item.icon className="shrink-0 text-lg" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );

  const renderSidebar = () => (
    <div className="portal-sidebar">
      <div className="portal-sidebar-brand">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-lg text-white shadow-lg">
            <FiLayers />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-tight text-white">School ERP</p>
            <p className="portal-sidebar-copy">Staff Command Center</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-1.5">
          {navGroups.map(entry => {
            if (entry.type === 'link') return renderLink(entry);

            const isOpen = openGroup === entry.key;
            const isActive = entry.children.some(child => matchPath(location.pathname, child.to));

            return (
              <div key={entry.key}>
                <button
                  type="button"
                  onClick={() => setOpenGroup(current => current === entry.key ? null : entry.key)}
                  className={`portal-nav-group-btn ${isOpen || isActive ? 'bg-white/10' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <entry.icon className="text-lg" />
                    <span>{entry.label}</span>
                  </div>
                  <FiChevronRight className={`text-base text-white/60 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-1">
                    {entry.children.map(child => renderLink(child, true))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-4">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || 'S'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-[11px] uppercase tracking-[0.14em] text-white/55">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
            {academicYear}
          </span>
        </div>
        <button type="button" onClick={handleLogout} className="portal-logout-btn">
          <FiLogOut />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <aside className="hidden h-screen w-80 shrink-0 lg:block">
        {renderSidebar()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="portal-topbar lg:px-8">
          <button type="button" onClick={() => setMobileOpen(true)} className="btn-icon lg:hidden">
            <FiMenu />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{pageMeta.section}</p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{pageMeta.title}</h1>
              <p className="pb-0.5 text-sm font-medium text-slate-500">{pageMeta.subtitle}</p>
            </div>
          </div>

          {isDashboardPage && (
            <div className="hidden items-center gap-3 lg:flex">
              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Academic Year</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{academicYear}</p>
              </div>
              <div className="portal-user-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
            </div>
          )}
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="relative h-full max-w-xs">
              <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-4 top-4 z-10 btn-icon">
                <FiX />
              </button>
              {renderSidebar()}
            </div>
          </div>
        )}

        <main className="portal-main">
          <div className="portal-main-inner">
            <div className="float-in">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
