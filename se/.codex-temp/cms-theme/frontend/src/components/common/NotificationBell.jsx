import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  FiArrowRight,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiLogOut,
} from './icons';

const typeIcon = {
  fee_due: FiDollarSign,
  payment_confirm: FiCheckCircle,
  leave_status: FiCalendar,
  outpass_status: FiLogOut,
  checkin: FiClock,
  circular: FiFileText,
  general: FiBell,
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]               = useState(0);
  const [open, setOpen]                   = useState(false);
  const ref                               = useRef(null);
  const navigate                          = useNavigate();

  const fetchNotifications = async () => {
    try {
      const r = await api.get('/notifications');
      setNotifications(r.data.notifications?.slice(0, 8) || []);
      setUnread(r.data.unreadCount || 0);
    } catch {
      // silent fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async id => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(n => n.map(x => x._id === id ? { ...x, isRead: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center border border-border bg-white text-text-secondary transition-colors hover:border-primary-700 hover:text-primary-700"
      >
        <FiBell className="text-xl" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center bg-red-700 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[20rem] overflow-hidden border border-border bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-border bg-slate-50 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-primary">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-700 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="py-8 text-center text-text-secondary">
                <div className="flex justify-center mb-2">
                  <FiBell className="text-2xl" />
                </div>
                <p className="text-sm font-medium">No notifications</p>
              </div>
            )}
            {notifications.map(n => (
              (() => {
                const Icon = typeIcon[n.type] || FiBell;
                return (
                  <div
                    key={n._id}
                    onClick={() => { if (!n.isRead) markRead(n._id); }}
                    className={`flex cursor-pointer gap-3 border-b border-slate-100 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50 ${
                      !n.isRead ? 'bg-primary-50/60' : ''
                    }`}
                  >
                    <Icon className="text-base shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-tight ${!n.isRead ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-tight text-text-secondary">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(n.sentAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary-700 shrink-0" />
                    )}
                  </div>
                );
              })()
            ))}
          </div>

          <div className="border-t border-border bg-slate-50 px-4 py-2">
            <button
              onClick={() => { navigate('/admin/notifications'); setOpen(false); }}
              className="w-full text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-700 hover:underline"
            >
              <span className="inline-flex items-center gap-1">
                View all notifications <FiArrowRight />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
