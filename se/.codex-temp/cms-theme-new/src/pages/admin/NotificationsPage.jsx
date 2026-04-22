import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { ExportActions, PageHeader, EmptyState, PageSpinner } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
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

const typeColor = {
  fee_due:         'bg-red-50 border-red-200',
  payment_confirm: 'bg-green-50 border-green-200',
  leave_status:    'bg-blue-50 border-blue-200',
  outpass_status:  'bg-purple-50 border-purple-200',
  checkin:         'bg-yellow-50 border-yellow-200',
  circular:        'bg-indigo-50 border-indigo-200',
  general:         'bg-gray-50 border-gray-200',
};

const ROLE_FILTERS = {
  hostel_warden: ['all', 'unread', 'leave_status', 'outpass_status', 'checkin', 'circular', 'general'],
  librarian: ['all', 'unread', 'circular', 'general'],
  class_teacher: ['all', 'unread', 'leave_status', 'outpass_status', 'checkin', 'circular', 'general'],
  accountant: ['all', 'unread', 'fee_due', 'payment_confirm', 'general'],
  admission_staff: ['all', 'unread', 'circular', 'general'],
  admin: ['all', 'unread', 'fee_due', 'payment_confirm', 'leave_status', 'outpass_status', 'checkin', 'circular', 'general'],
  institution_owner: ['all', 'unread', 'fee_due', 'payment_confirm', 'leave_status', 'outpass_status', 'checkin', 'circular', 'general'],
  super_admin: ['all', 'unread', 'fee_due', 'payment_confirm', 'leave_status', 'outpass_status', 'checkin', 'circular', 'general'],
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]               = useState(0);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');

  const allowedFilters = ROLE_FILTERS[user?.role] || ['all', 'unread', 'general'];
  const visibleNotifications = notifications.filter(notification =>
    allowedFilters.includes(notification.type) || notification.type === 'general'
  );

  const fetchNotifications = async () => {
    const r = await api.get('/notifications');
    setNotifications(r.data.notifications || []);
    setUnread(r.data.unreadCount);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    setUnread(0);
    toast.success('All marked as read');
  };

  const markRead = async id => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(n => n.map(x => x._id === id ? { ...x, isRead: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  useEffect(() => {
    if (!allowedFilters.includes(filter)) {
      setFilter('all');
    }
  }, [allowedFilters, filter]);

  const filtered = filter === 'unread'
    ? visibleNotifications.filter(n => !n.isRead)
    : filter === 'all'
      ? visibleNotifications
      : visibleNotifications.filter(n => n.type === filter);

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportActions
              getExportConfig={() => ({
                fileName: 'notifications',
                title: 'Notifications Export',
                subtitle: 'Notifications visible in the current user notification center.',
                summary: [
                  { label: 'Visible Notifications', value: filtered.length },
                  { label: 'Unread Count', value: unread },
                  { label: 'Active Filter', value: filter.replace('_', ' ') },
                ],
                sections: [
                  {
                    title: 'Notifications',
                    columns: [
                      { header: 'Title', value: notification => notification.title || '-' },
                      { header: 'Type', value: notification => notification.type?.replace('_', ' ') || '-' },
                      { header: 'Status', value: notification => notification.isRead ? 'Read' : 'Unread' },
                      { header: 'Message', value: notification => notification.message || '-' },
                      { header: 'Sent At', value: notification => new Date(notification.sentAt).toLocaleString('en-IN') },
                    ],
                    rows: filtered,
                  },
                ],
              })}
              disabled={loading || filtered.length === 0}
            />
            {unread > 0 && (
              <button onClick={markAllRead} className="btn-secondary text-sm">
                Mark all read
              </button>
            )}
          </div>
        }
      />

      <div className="card">

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap mb-4 pb-4 border-b border-gray-100">
          {allowedFilters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                ${filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? <PageSpinner /> : (
          <div className="space-y-2">
            {filtered.map(n => (
              (() => {
                const Icon = typeIcon[n.type] || FiBell;
                return (
                  <div
                    key={n._id}
                    onClick={() => !n.isRead && markRead(n._id)}
                    className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer
                      ${typeColor[n.type] || 'bg-gray-50 border-gray-200'}
                      ${!n.isRead ? 'shadow-sm' : 'opacity-70'}`}
                  >
                    <Icon className="text-xl shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-sm ${!n.isRead
                          ? 'font-semibold text-gray-900'
                          : 'text-gray-700'}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.sentAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                );
              })()
            ))}
            {filtered.length === 0 && (
              <EmptyState message="No notifications" icon={<FiBell />} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
