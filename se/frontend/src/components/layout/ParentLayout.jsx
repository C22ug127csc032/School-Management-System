import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { FiBookOpen, FiCalendar, FiClock, FiCreditCard, FiFileText, FiGrid, FiHome, FiLayers, FiLogOut, FiMenu, FiUser, FiX } from 'react-icons/fi';

const NAV = [
  { to: '/parent', label: 'Dashboard', icon: FiHome, exact: true },
  { to: '/parent/student', label: 'My Child', icon: FiUser },
  { to: '/parent/fees', label: 'Fees', icon: FiCreditCard },
  { to: '/parent/attendance', label: 'Attendance', icon: FiCalendar },
  { to: '/parent/timetable', label: 'Timetable', icon: FiClock },
  { to: '/parent/marks', label: 'Marks', icon: FiGrid },
  { to: '/parent/homework', label: 'Homework', icon: FiBookOpen },
  { to: '/parent/updates', label: 'Circulars', icon: FiFileText },
  { to: '/parent/library', label: 'Library', icon: FiLayers },
  { to: '/parent/leave', label: 'Leave', icon: FiCalendar },
];

export default function ParentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login/parent');
  };

  const renderSidebar = () => (
    <div className="portal-sidebar portal-sidebar-parent">
      <div className="portal-sidebar-brand">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-xl font-black text-white">
            P
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-tight text-white">Parent Portal</p>
            <p className="portal-sidebar-copy">Student Monitoring</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/60">Parent Account</p>
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
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Parent Portal</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">Stay connected to your child&apos;s school journey</p>
          </div>
          <div className="portal-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'P'}</div>
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
