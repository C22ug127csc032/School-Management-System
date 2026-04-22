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
} from '../../components/common/icons';

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

      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
      >
        <FiBell className="text-xl" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white
            text-xs font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl
          border border-gray-200 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <div className="flex justify-center mb-2">
                  <FiBell className="text-2xl" />
                </div>
                <p className="text-sm">No notifications</p>
              </div>
            )}
            {notifications.map(n => (
              (() => {
                const Icon = typeIcon[n.type] || FiBell;
                return (
                  <div
                    key={n._id}
                    onClick={() => { if (!n.isRead) markRead(n._id); }}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0
                      cursor-pointer hover:bg-gray-50 transition-colors
                      ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                  >
                    <Icon className="text-base shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-tight
                        ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-tight">
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.sentAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1" />
                    )}
                  </div>
                );
              })()
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100">
            <button
              onClick={() => { navigate('/admin/notifications'); setOpen(false); }}
              className="text-xs text-primary-600 hover:underline w-full text-center"
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
