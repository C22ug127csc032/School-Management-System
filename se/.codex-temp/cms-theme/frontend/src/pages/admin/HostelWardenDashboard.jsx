import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import {
  EmptyState,
  PageHeader,
  PageSpinner,
  StatCard,
  StatusBadge,
} from '../../components/common';
import {
  FiBell,
  FiCheckCircle,
  FiClock,
  FiHome,
  FiLogOut,
  FiShield,
} from '../../components/common/icons';

const HOSTEL_NOTIFICATION_TYPES = new Set(['leave_status', 'outpass_status', 'checkin', 'circular', 'general']);

export default function HostelWardenDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [studentStats, setStudentStats] = useState(null);
  const [outpasses, setOutpasses] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, outpassRes, checkinRes, notificationRes] = await Promise.all([
        api.get('/students/stats/summary'),
        api.get('/outpass', { params: { status: 'pending', limit: 20 } }),
        api.get('/checkin', { params: { limit: 120 } }),
        api.get('/notifications'),
      ]);
      setStudentStats(statsRes.data.stats || null);
      setOutpasses(outpassRes.data.outpasses || []);
      setCheckins(checkinRes.data.records || []);
      const visibleNotifications = (notificationRes.data.notifications || [])
        .filter(notification => HOSTEL_NOTIFICATION_TYPES.has(notification.type))
        .slice(0, 6);
      setNotifications(visibleNotifications);
      setUnreadCount(notificationRes.data.unreadCount || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load hostel dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleOutpassAction = async (id, status) => {
    setActionId(id);
    try {
      await api.put(`/outpass/${id}/status`, { status });
      toast.success(`Outpass ${status}`);
      await loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update outpass');
    } finally {
      setActionId('');
    }
  };

  const today = new Date().toDateString();
  const todayMovements = useMemo(
    () => checkins.filter(record => new Date(record.timestamp).toDateString() === today),
    [checkins, today]
  );
  const todayCheckIns = todayMovements.filter(record => record.type === 'check_in').length;
  const todayCheckOuts = todayMovements.filter(record => record.type === 'check_out').length;

  const latestMovementByStudent = useMemo(() => {
    const seen = new Map();
    for (const record of checkins) {
      const studentId = record.student?._id;
      if (studentId && !seen.has(studentId)) {
        seen.set(studentId, record);
      }
    }
    return Array.from(seen.values());
  }, [checkins]);

  const currentlyInside = latestMovementByStudent.filter(record => record.type === 'check_in').length;
  const currentlyOutside = latestMovementByStudent.filter(record => record.type === 'check_out').length;

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel Dashboard"
        subtitle="Outpass approvals, hostel movement, and notifications"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<FiHome />}
          label="Hostel Students"
          value={studentStats?.hostel || 0}
          color="purple"
        />
        <StatCard
          icon={<FiLogOut />}
          label="Pending Outpass"
          value={outpasses.length}
          color="yellow"
        />
        <StatCard
          icon={<FiCheckCircle />}
          label="Today's Movements"
          value={todayMovements.length}
          color="green"
          sub={`${todayCheckIns} in / ${todayCheckOuts} out`}
        />
        <StatCard
          icon={<FiBell />}
          label="Unread Alerts"
          value={unreadCount}
          color="blue"
          sub={`${currentlyInside} inside / ${currentlyOutside} outside`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="section-title">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/admin/leave')}
              className="w-full text-left px-3 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-colors"
            >
              Review Hostel Leave Requests
            </button>
            <button
              onClick={() => navigate('/admin/outpass')}
              className="w-full text-left px-3 py-2.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-sm font-medium transition-colors"
            >
              Review Outpass Requests
            </button>
            <button
              onClick={() => navigate('/admin/checkin')}
              className="w-full text-left px-3 py-2.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium transition-colors"
            >
              Record Hostel Check In / Out
            </button>
            <button
              onClick={() => navigate('/admin/notifications')}
              className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors"
            >
              Open Notifications
            </button>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="section-title mb-0">Pending Outpass Requests</h3>
            <button
              type="button"
              onClick={() => navigate('/admin/outpass')}
              className="text-sm text-primary-600 hover:underline"
            >
              View all
            </button>
          </div>
          {outpasses.length === 0 ? (
            <EmptyState message="No pending outpass requests" icon={<FiShield />} />
          ) : (
            <div className="space-y-3">
              {outpasses.slice(0, 6).map(request => (
                <div
                  key={request._id}
                  className="rounded-xl border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm text-gray-800">
                        {request.student?.firstName} {request.student?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Exit: {request.exitDate ? new Date(request.exitDate).toLocaleDateString('en-IN') : 'NA'}
                        {' - '}
                        Return: {request.expectedReturn ? new Date(request.expectedReturn).toLocaleDateString('en-IN') : 'NA'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.destination || 'Destination not set'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.reason || 'No reason provided'}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      disabled={actionId === request._id}
                      onClick={() => handleOutpassAction(request._id, 'approved')}
                      className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={actionId === request._id}
                      onClick={() => handleOutpassAction(request._id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="section-title mb-0">Recent Notifications</h3>
            <button
              type="button"
              onClick={() => navigate('/admin/notifications')}
              className="text-sm text-primary-600 hover:underline"
            >
              View all
            </button>
          </div>
          {notifications.length === 0 ? (
            <EmptyState message="No notifications" icon={<FiBell />} />
          ) : (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div key={notification._id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{notification.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.sentAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                    {!notification.isRead && <span className="w-2.5 h-2.5 rounded-full bg-primary-600 mt-1 shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="section-title mb-0">Recent Movements</h3>
            <button
              type="button"
              onClick={() => navigate('/admin/checkin')}
              className="text-sm text-primary-600 hover:underline"
            >
              Open movement log
            </button>
          </div>
          {todayMovements.length === 0 ? (
            <EmptyState message="No movement records for today" icon={<FiClock />} />
          ) : (
            <div className="space-y-3">
              {todayMovements.slice(0, 6).map(record => (
                <div key={record._id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm text-gray-800">
                        {record.student?.firstName} {record.student?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(record.location || '').replace('gate', 'hostel gate')}
                        {' - '}
                        {new Date(record.timestamp).toLocaleTimeString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Room: {record.student?.hostelRoom || 'NA'}
                      </p>
                    </div>
                    <StatusBadge status={record.type} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
