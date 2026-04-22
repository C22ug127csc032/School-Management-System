import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { FiBookOpen, FiCalendar, FiClock, FiCreditCard, FiFileText, FiGrid, FiHome, FiLayers, FiLogOut, FiMenu, FiUser, FiX } from 'react-icons/fi';

const NAV = [
  { to: '/student', label: 'Dashboard', icon: FiHome, exact: true },
  { to: '/student/profile', label: 'My Profile', icon: FiUser },
  { to: '/student/fees', label: 'Fees', icon: FiCreditCard },
  { to: '/student/attendance', label: 'Attendance', icon: FiCalendar },
  { to: '/student/timetable', label: 'Timetable', icon: FiClock },
  { to: '/student/exams', label: 'Exams', icon: FiGrid },
  { to: '/student/homework', label: 'Homework', icon: FiBookOpen },
  { to: '/student/circulars', label: 'Circulars', icon: FiFileText },
  { to: '/student/library', label: 'Library', icon: FiLayers },
  { to: '/student/leave', label: 'Leave', icon: FiCalendar },
];

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login/student');
  };

  const renderSidebar = () => (
    <div className="portal-sidebar portal-sidebar-student">
      <div className="portal-sidebar-brand">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-xl font-black text-white">
            S
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-tight text-white">Student Portal</p>
            <p className="portal-sidebar-copy">Learning Workspace</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/60">Student Account</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `portal-nav-link ${isActive ? 'portal-nav-link-active' : ''}`}
          >
            <item.icon className="text-lg" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-4">
        <button type="button" onClick={handleLogout} className="portal-logout-btn">
          <FiLogOut />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="portal-shell">
      <aside className="hidden h-screen w-72 shrink-0 lg:block">
        {renderSidebar()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="portal-topbar">
          <button type="button" onClick={() => setMobileOpen(true)} className="btn-icon lg:hidden">
            <FiMenu />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Student Portal</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">Your classes, work, and progress in one place</p>
          </div>
          <div className="portal-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'S'}</div>
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
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
